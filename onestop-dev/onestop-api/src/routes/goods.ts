// src/routes/goods.ts
import { Router } from "express";
import { pool } from "../db";
import { Goods } from "../types";

const router = Router();

/**
 * GET /api/goods
 * 쿼리 파라미터:
 *  - keyword: 상품명 검색
 *  - status: normal/runout/purchasing/unsold
 *  - view: look/notLook
 *  - limit: 최대 개수 (기본 50)
 */
router.get("/", async (req, res) => {
  try {
    const {
      keyword = "",
      status = "",
      view = "",
      limit = "50"
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push("g.goods_name LIKE ?");
      params.push(`%${keyword}%`);
    }
    if (status) {
      conditions.push("g.goods_status = ?");
      params.push(status);
    }
    if (view) {
      conditions.push("g.goods_view = ?");
      params.push(view);
    }

    const where =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const sql = `
      SELECT
        g.goods_seq,
        g.provider_seq,
        g.goods_code,
        g.goods_name,
        g.goods_status,
        g.goods_view,
        g.default_consumer_price,
        g.default_price,
        g.default_discount,
        g.tot_stock,
        g.purchase_ea,
        g.purchase_ea_3mon,
        g.page_view,
        g.review_count,
        g.regist_date,
        g.update_date
      FROM fm_goods AS g
      ${where}
      ORDER BY g.goods_seq DESC
      LIMIT ?
    `;

    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    res.json(rows as Goods[]);
  } catch (err) {
    console.error("GET /api/goods error:", err);
    res.status(500).json({ message: "상품 조회 중 오류가 발생했습니다." });
  }
});

/**
 * GET /api/goods/:id
 * 단일 상품 상세 (핵심 필드만)
 */
router.get("/:id", async (req, res) => {
  try {
    const goodsSeq = Number(req.params.id);
    if (!goodsSeq) {
      return res.status(400).json({ message: "유효하지 않은 goods_seq" });
    }

    const sql = `
      SELECT
        g.*
      FROM fm_goods AS g
      WHERE g.goods_seq = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [goodsSeq]);
    const goods = (rows as any[])[0];

    if (!goods) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    res.json(goods);
  } catch (err) {
    console.error("GET /api/goods/:id error:", err);
    res.status(500).json({ message: "상품 상세 조회 중 오류가 발생했습니다." });
  }
});

router.get("/admin/products", async (req, res) => {
  try {
    const {
      keyword = "",
      page = "1",
      pageSize = "100",
    } = req.query as Record<string, string>;

    const nPage = Math.max(1, Number(page) || 1);
    const nPageSize = Math.min(1000, Math.max(100, Number(pageSize) || 100));
    const offset = (nPage - 1) * nPageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    /* =======================
       검색 조건
    ======================= */
    if (keyword) {
      conditions.push(`(
        g.goods_name LIKE ?
        OR g.goods_code LIKE ?
        OR go.optioncode1 LIKE ?
        OR opl.item_name LIKE ?
        OR opl.product_code LIKE ?
        OR opl.match_code LIKE ?
      )`);
      params.push(
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    /* =========================================================
       1) 전체 카운트 (🔥 LEFT JOIN으로 변경)
    ========================================================= */
    const countSql = `
    SELECT COUNT(DISTINCT g.goods_seq) AS totalCount
    FROM fm_goods g
    JOIN fm_goods_option go
      ON go.goods_seq = g.goods_seq
     AND go.optioncode1 LIKE 'P%'
    LEFT JOIN os_product_list opl
      ON opl.match_code COLLATE utf8mb4_unicode_ci
       = go.optioncode1 COLLATE utf8mb4_unicode_ci
    ${where}
  `;
    const [countRows] = await pool.query(countSql, params);
    const totalCount = Number((countRows as any[])[0]?.totalCount || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / nPageSize));

    /* =========================================================
       2) 페이지별 goods_seq (🔥 LEFT JOIN 유지)
    ========================================================= */
    const pageGoodsSql = `
    SELECT DISTINCT g.goods_seq
    FROM fm_goods g
    JOIN fm_goods_option go
      ON go.goods_seq = g.goods_seq
     AND go.optioncode1 LIKE 'P%'
    LEFT JOIN os_product_list opl
      ON opl.match_code COLLATE utf8mb4_unicode_ci
       = go.optioncode1 COLLATE utf8mb4_unicode_ci
    ${where}
    ORDER BY g.goods_seq DESC
    LIMIT ? OFFSET ?
  `;
    const pageParams = [...params, nPageSize, offset];
    const [goodsSeqRows] = await pool.query(pageGoodsSql, pageParams);
    const goodsSeqList = (goodsSeqRows as any[]).map(r => r.goods_seq);

    if (goodsSeqList.length === 0) {
      return res.json({
        data: [],
        pagination: { page: nPage, pageSize: nPageSize, totalCount, totalPages },
      });
    }

    const inPlaceholders = goodsSeqList.map(() => "?").join(",");

    /* =========================================================
       3) 대표 옵션 + 매칭 여부 + 이미지
    ========================================================= */
    const headerSql = `
      SELECT
        g.goods_seq,
        g.goods_code,
        g.goods_name,
        g.provider_seq,
        p.provider_name,

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

        rep.option_seq   AS rep_option_seq,
        rep.optioncode1  AS rep_optioncode1,
        rep.option_title AS rep_option_title,
        rep.option1, rep.option2, rep.option3, rep.option4, rep.option5,

        opl.cost_krw     AS rep_cost_krw,
        opl.sale_price  AS rep_sale_price,

        CASE
          WHEN opl.match_code IS NULL THEN 0
          ELSE 1
        END AS is_matched

      FROM fm_goods g
      LEFT JOIN fm_provider p
        ON p.provider_seq = g.provider_seq

      /* 🔥 대표 옵션: 옵션이 없어도 상품은 살아있게 LEFT JOIN */
      LEFT JOIN (
        SELECT go1.*
        FROM fm_goods_option go1
        JOIN (
          SELECT goods_seq, MIN(option_seq) AS min_option_seq
          FROM fm_goods_option
          WHERE goods_seq IN (${inPlaceholders})
          GROUP BY goods_seq
        ) t
          ON t.goods_seq = go1.goods_seq
         AND t.min_option_seq = go1.option_seq
      ) rep ON rep.goods_seq = g.goods_seq

      LEFT JOIN os_product_list opl
        ON opl.match_code COLLATE utf8mb4_unicode_ci
         = rep.optioncode1 COLLATE utf8mb4_unicode_ci

      WHERE g.goods_seq IN (${inPlaceholders})
      ORDER BY g.goods_seq DESC
    `;
    const headerParams = [...goodsSeqList, ...goodsSeqList];
    const [headerRows] = await pool.query(headerSql, headerParams);

    /* =========================================================
       4) 옵션 전체 (매칭 안 돼도 내려줌)
    ========================================================= */
    const optionsSql = `
      SELECT
        go.goods_seq,
        go.option_seq,
        go.optioncode1,
        go.option_title,
        go.option1, go.option2, go.option3, go.option4, go.option5,
        opl.item_name,
        opl.cost_krw,
        opl.sale_price
      FROM fm_goods_option go
      LEFT JOIN os_product_list opl
        ON opl.match_code COLLATE utf8mb4_unicode_ci
         = go.optioncode1 COLLATE utf8mb4_unicode_ci
      WHERE go.goods_seq IN (${inPlaceholders})
      ORDER BY go.goods_seq DESC, go.option_seq ASC
    `;
    const [optionRows] = await pool.query(optionsSql, goodsSeqList);

    /* =========================================================
       5) JS 그룹핑
    ========================================================= */
    const map = new Map<number, any>();

    for (const r of headerRows as any[]) {
      map.set(r.goods_seq, {
        goods_seq: r.goods_seq,
        goods_code: r.goods_code,
        goods_name: r.goods_name,
        provider_seq: r.provider_seq,
        provider_name: r.provider_name,
        image: r.image,
        is_matched: r.is_matched,
        rep_option: {
          option_seq: r.rep_option_seq,
          optioncode1: r.rep_optioncode1,
          option_title: r.rep_option_title,
          option1: r.option1,
          option2: r.option2,
          option3: r.option3,
          option4: r.option4,
          option5: r.option5,
          cost_krw: r.rep_cost_krw,
          sale_price: r.rep_sale_price,
        },
        options: [],
      });
    }

    for (const o of optionRows as any[]) {
      const g = map.get(o.goods_seq);
      if (!g) continue;
      g.options.push({
        option_seq: o.option_seq,
        optioncode1: o.optioncode1,
        option_title: o.option_title,
        option1: o.option1,
        option2: o.option2,
        option3: o.option3,
        option4: o.option4,
        option5: o.option5,
        item_name: o.item_name,
        cost_krw: o.cost_krw,
        sale_price: o.sale_price,
      });
    }

    const data = goodsSeqList.map(seq => map.get(seq)).filter(Boolean);

    res.json({
      data,
      pagination: { page: nPage, pageSize: nPageSize, totalCount, totalPages },
    });
  } catch (err) {
    console.error("GET /api/goods/admin/products error:", err);
    res.status(500).json({ message: "상품관리 조회 중 오류가 발생했습니다." });
  }
});



export default router;
