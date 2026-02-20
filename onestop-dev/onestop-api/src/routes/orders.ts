// src/routes/orders.ts
import { Router } from "express";
import { pool } from "../db";

const router = Router();

const pad = (n: number, len = 4) => String(n).padStart(len, "0");
const ymd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

/**
 * GET /api/orders/products
 * 주문용 상품 리스트 (os_product_list 기반)
 * query:
 *  - keyword
 *  - providerSeq (optional, '' or '0' = 전체, 'null' = 미지정만)
 *  - page, pageSize (default 1 / 200, max 1000)
 */
router.get("/products", async (req, res) => {
  try {
    const {
      keyword = "",
      providerSeq = "",
      page = "1",
      pageSize = "200",
    } = req.query as Record<string, string>;

    const nPage = Math.max(1, Number(page) || 1);
    const nPageSize = Math.min(1000, Math.max(100, Number(pageSize) || 200));
    const offset = (nPage - 1) * nPageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push(`(
        opl.product_code LIKE ?
        OR opl.product_name LIKE ?
        OR opl.item_name LIKE ?
        OR opl.match_code LIKE ?
      )`);
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // provider filter (goods 매칭 우선)
    if (providerSeq === "null") {
      conditions.push(`COALESCE(g.provider_seq, opl.provider_seq) IS NULL`);
    } else if (providerSeq && providerSeq !== "0") {
      conditions.push(`COALESCE(g.provider_seq, opl.provider_seq) = ?`);
      params.push(Number(providerSeq));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // count
    const countSql = `
    SELECT COUNT(*) AS totalCount
    FROM os_product_list opl
    LEFT JOIN fm_goods_option go
      ON go.optioncode1 COLLATE utf8mb4_unicode_ci
       = opl.match_code COLLATE utf8mb4_unicode_ci
    LEFT JOIN fm_goods g
      ON g.goods_seq = go.goods_seq
    ${where}
  `;
    const [countRows] = await pool.query(countSql, params);
    const totalCount = Number((countRows as any[])[0]?.totalCount || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / nPageSize));

    // data
    const sql = `
        SELECT
          -- os_product_list 기본 정보
          opl.id,
          opl.provider_seq AS opl_provider_seq,
          opl.product_code,
          opl.product_name,
          opl.item_name,
          opl.cost_cny,
          opl.match_code,
          opl.cost_krw,
          opl.sale_price,

          -- fm_goods 매칭 결과 (없으면 NULL)
          g.goods_seq,
          g.goods_name,
          g.provider_seq AS goods_provider_seq,
          COALESCE(p.provider_name, '공급사 미지정') AS provider_name,

          -- 대표 이미지(있으면 URL 붙여서)
          (
            SELECT CONCAT('https://www.onestopdome.com/', gi.image)
            FROM fm_goods_image gi
            WHERE gi.goods_seq = g.goods_seq
            ORDER BY
              FIELD(gi.image_type, 'list1','thumbView','thumbScroll','large','view','list2','thumbCart'),
              gi.cut_number ASC,
              gi.image_seq ASC
            LIMIT 1
          ) AS image,

          -- 매칭 여부
          CASE WHEN g.goods_seq IS NULL THEN 0 ELSE 1 END AS is_registered

        FROM os_product_list opl

        -- match_code(우리 가공 코드) = fm_goods_option.optioncode1 (옵션 코드)
        LEFT JOIN fm_goods_option go
          ON go.optioncode1 COLLATE utf8mb4_unicode_ci
          = opl.match_code COLLATE utf8mb4_unicode_ci

        LEFT JOIN fm_goods g
          ON g.goods_seq = go.goods_seq

        -- 공급사: (1) goods에 있으면 그걸 우선 (2) 없으면 opl.provider_seq 사용
        LEFT JOIN fm_provider p
          ON p.provider_seq = COALESCE(g.provider_seq, opl.provider_seq)

        ${where}

        ORDER BY
          (COALESCE(g.provider_seq, opl.provider_seq) IS NULL) ASC,
          COALESCE(g.provider_seq, opl.provider_seq) ASC,
          COALESCE(g.goods_seq, 999999999) ASC,
          opl.product_code ASC,
          opl.id ASC

        LIMIT ? OFFSET ?
      `;
    const [rows] = await pool.query(sql, [...params, nPageSize, offset]);

    res.json({
      data: rows,
      pagination: { page: nPage, pageSize: nPageSize, totalCount, totalPages },
    });
  } catch (err) {
    console.error("GET /api/orders/products error:", err);
    res.status(500).json({ message: "주문용 상품 조회 중 오류가 발생했습니다." });
  }
});

/**
 * POST /api/orders
 * body:
 *  {
 *    memo?: string,
 *    items: Array<{ match_code: string, qty: number }>
 *  }
 */
router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const memo = String(req.body?.memo || "");
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    const clean = items
      .map((it: any) => ({
        match_code: String(it.match_code || "").trim(),
        qty: Math.max(0, Number(it.qty) || 0),
      }))
      .filter((it) => it.match_code && it.qty > 0);

    if (clean.length === 0) {
      return res.status(400).json({ message: "주문 수량이 1개 이상인 항목이 없습니다." });
    }

    await conn.beginTransaction();

    // 주문 아이템 스냅샷 로드
    // (중요) match_code로 os_product_list에서 가격/이름을 가져와서 저장
    const placeholders = clean.map(() => "?").join(",");
    const [rows] = await conn.query(
      `
      SELECT
        opl.provider_seq,
        COALESCE(p.provider_name, '공급사 미지정') AS provider_name,
        opl.product_code,
        opl.product_name,
        opl.item_name,
        opl.match_code,
        opl.cost_krw,
        opl.sale_price
      FROM os_product_list opl
      LEFT JOIN fm_provider p ON p.provider_seq = opl.provider_seq
      WHERE opl.match_code IN (${placeholders})
      `,
      clean.map((x) => x.match_code)
    );

    const map = new Map<string, any>();
    for (const r of rows as any[]) map.set(String(r.match_code), r);

    // 헤더 insert (먼저 id 확보)
    const [ins] = await conn.query(
      `INSERT INTO os_order (status, memo) VALUES ('submitted', ?)`,
      [memo]
    );
    const orderId = Number((ins as any).insertId);
    const orderNo = `OS${ymd()}-${pad(orderId, 4)}`;

    await conn.query(`UPDATE os_order SET order_no = ? WHERE id = ?`, [orderNo, orderId]);

    // item insert + totals 계산
    let totalQty = 0;
    let totalCost = 0;
    let totalSale = 0;

    for (const it of clean) {
      const snap = map.get(it.match_code);
      if (!snap) {
        // os_product_list에도 없는 코드가 들어오면 거절
        await conn.rollback();
        return res.status(400).json({ message: `상품을 찾을 수 없습니다: ${it.match_code}` });
      }

      const qty = it.qty;
      const cost = Number(snap.cost_krw || 0);
      const sale = Number(snap.sale_price || 0);

      const lineCost = cost * qty;
      const lineSale = sale * qty;

      totalQty += qty;
      totalCost += lineCost;
      totalSale += lineSale;

      await conn.query(
        `
        INSERT INTO os_order_item (
          order_id, provider_seq, provider_name,
          product_code, product_name, match_code, item_name,
          cost_krw, sale_price, qty, line_cost_krw, line_sale_krw
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          orderId,
          snap.provider_seq ?? null,
          snap.provider_name ?? "",
          snap.product_code ?? "",
          snap.product_name ?? "",
          snap.match_code ?? "",
          snap.item_name ?? "",
          cost,
          sale,
          qty,
          lineCost,
          lineSale,
        ]
      );
    }

    await conn.query(
      `UPDATE os_order SET total_qty=?, total_cost_krw=?, total_sale_krw=? WHERE id=?`,
      [totalQty, totalCost, totalSale, orderId]
    );

    await conn.commit();

    res.json({ ok: true, orderId, orderNo });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("POST /api/orders error:", err);
    res.status(500).json({ message: "주문 제출 중 오류가 발생했습니다." });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/orders
 * 주문관리 리스트 (간단 버전)
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      pageSize = "50",
      status = "",
      keyword = "",
      from = "",
      to = "",
    } = req.query as Record<string, string>;

    const nPage = Math.max(1, Number(page) || 1);
    const nPageSize = Math.min(200, Math.max(20, Number(pageSize) || 50));
    const offset = (nPage - 1) * nPageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`o.status = ?`);
      params.push(status);
    }
    if (keyword) {
      conditions.push(`(o.order_no LIKE ? OR o.memo LIKE ?)`);
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (from) {
      conditions.push(`o.ordered_at >= ?`);
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      conditions.push(`o.ordered_at <= ?`);
      params.push(`${to} 23:59:59`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS totalCount FROM os_order o ${where}`,
      params
    );
    const totalCount = Number((countRows as any[])[0]?.totalCount || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / nPageSize));

    const [rows] = await pool.query(
      `
      SELECT
        o.id, o.order_no, o.ordered_at, o.status, o.memo,
        o.total_qty, o.total_cost_krw, o.total_sale_krw
      FROM os_order o
      ${where}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, nPageSize, offset]
    );

    res.json({ data: rows, pagination: { page: nPage, pageSize: nPageSize, totalCount, totalPages } });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    res.status(500).json({ message: "주문 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * GET /api/orders/:id
 * 주문 상세
 */
router.get("/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ message: "유효하지 않은 주문 ID" });

    const [oRows] = await pool.query(`SELECT * FROM os_order WHERE id=? LIMIT 1`, [orderId]);
    const order = (oRows as any[])[0];
    if (!order) return res.status(404).json({ message: "주문을 찾을 수 없습니다." });

    const [items] = await pool.query(
      `SELECT * FROM os_order_item WHERE order_id=? ORDER BY provider_seq ASC, id ASC`,
      [orderId]
    );

    res.json({ order, items });
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    res.status(500).json({ message: "주문 상세 조회 중 오류가 발생했습니다." });
  }
});

export default router;
