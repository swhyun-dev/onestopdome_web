// src/routes/stock.ts
import { Router, Request, Response } from "express";
import { pool } from "../db";
import type { RowDataPacket } from "mysql2";

const router = Router();

const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || "https://onestopdome.com";

/**
 * 재고 리스트
 */
router.get("/list", async (req, res) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const pageSize =
      Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 50;
    const offset = (page - 1) * pageSize;

    const periodRaw = req.query.period ? Number(req.query.period) : 7;
    const period =
     periodRaw === 7 || periodRaw === 14 || periodRaw === 30 ? periodRaw : 7;

    const providerSeq = req.query.provider_seq
      ? Number(req.query.provider_seq)
      : null;
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const goodsSeq = req.query.goods_seq ? Number(req.query.goods_seq) : null;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (providerSeq) {
      where += " AND g.provider_seq = ?";
      params.push(providerSeq);
    }

    if (keyword) {
      where += " AND (g.goods_name LIKE ? OR g.goods_code LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (goodsSeq) {
      where += " AND g.goods_seq = ?";
      params.push(goodsSeq);
    }

    const [countRows] = await pool.query<{ total: number }[]>(
      `
      SELECT COUNT(DISTINCT g.goods_seq) AS total
      FROM fm_goods g
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
      ${where}
    `,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const [rows] = await pool.query(
      `
      SELECT
        g.goods_seq,
        g.provider_seq,
        g.goods_code,
        g.goods_name,
        g.goods_status,
        g.goods_view,
    
        IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,
    
        img.thumb_url,  -- ✅ 대표 이미지
    
        IFNULL(SUM(gs.stock), 0)       AS current_stock,
        IFNULL(SUM(gs.safe_stock), 0)  AS safe_stock,
    
        -- ✅ 최근 N일 주문량 (period 기준, 응답 필드명 통일)
        COALESCE(oq.order_qty, 0)       AS order_qty,
    
        g.default_price,
        g.default_consumer_price,
        g.purchase_ea_3mon,
        g.regist_date,
        g.update_date
      FROM fm_goods g
      LEFT JOIN fm_provider p
        ON g.provider_seq = p.provider_seq
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
    
      -- ✅ 최근 N일 주문량 집계 JOIN
      LEFT JOIN (
        SELECT
          oi.goods_seq,
          SUM(oio.ea) AS order_qty
        FROM fm_order_item_option oio
        INNER JOIN fm_order_item oi
          ON oi.item_seq = oio.item_seq
        INNER JOIN fm_order o
          ON o.order_seq = oio.order_seq
        WHERE o.regist_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY oi.goods_seq
      ) oq
        ON oq.goods_seq = g.goods_seq
    
      -- ✅ 대표 이미지 1장 JOIN
      LEFT JOIN (
        SELECT
          gi.goods_seq,
          CONCAT(?, gi.image) AS thumb_url
        FROM fm_goods_image gi
        JOIN (
          SELECT
            goods_seq,
            MIN(
              CASE image_type
                WHEN 'thumbView'   THEN 1
                WHEN 'list1'       THEN 2
                WHEN 'thumbScroll' THEN 3
                WHEN 'large'       THEN 9
                ELSE 99
              END
            ) AS best_rank
          FROM fm_goods_image
          WHERE cut_number = 1
          GROUP BY goods_seq
        ) pick
          ON pick.goods_seq = gi.goods_seq
         AND (
           CASE gi.image_type
             WHEN 'thumbView'   THEN 1
             WHEN 'list1'       THEN 2
             WHEN 'thumbScroll' THEN 3
             WHEN 'large'       THEN 9
             ELSE 99
           END
         ) = pick.best_rank
        WHERE gi.cut_number = 1
      ) img
        ON img.goods_seq = g.goods_seq
    
      ${where}
      GROUP BY g.goods_seq
      ORDER BY g.goods_seq DESC
      LIMIT ? OFFSET ?
      `,
      // ✅ 파라미터 순서 중요: period → IMAGE_BASE_URL → where params → limit/offset
      [period, IMAGE_BASE_URL, ...params, pageSize, offset]
    );

    return res.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: rows,
    });
  } catch (err) {
    console.error("GET /api/stock/list error:", err);
    res.status(500).json({ message: "재고 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 저재고 리스트
 */
router.get("/low", async (req, res) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const pageSize =
      Number(req.query.pageSize) > 0 ? Number(req.query.pageSize) : 50;
    const offset = (page - 1) * pageSize;

    const providerSeq = req.query.provider_seq
      ? Number(req.query.provider_seq)
      : null;
    const threshold =
      typeof req.query.threshold === "string" &&
      req.query.threshold.trim() !== ""
        ? Number(req.query.threshold)
        : null;

    const goodsSeq = req.query.goods_seq ? Number(req.query.goods_seq) : null;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (providerSeq) {
      where += " AND g.provider_seq = ?";
      params.push(providerSeq);
    }

    if (goodsSeq) {
      where += " AND g.goods_seq = ?";
      params.push(goodsSeq);
    }

    const baseSelect = `
      SELECT
        g.goods_seq,
        g.provider_seq,
        g.goods_code,
        g.goods_name,
        g.goods_status,
        g.goods_view,
        IFNULL(SUM(gs.stock), 0)      AS current_stock,
        IFNULL(SUM(gs.safe_stock), 0) AS safe_stock,
        g.default_price,
        g.default_consumer_price,
        g.purchase_ea_3mon,
        g.regist_date,
        g.update_date
      FROM fm_goods g
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
      ${where}
      GROUP BY g.goods_seq
    `;

    let countSql = `
      SELECT COUNT(*) AS total
      FROM (
        ${baseSelect}
      ) t
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (threshold !== null && !Number.isNaN(threshold)) {
      countSql += " AND t.current_stock <= ?";
      countParams.push(threshold);
    } else {
      countSql +=
        " AND t.safe_stock > 0 AND t.current_stock <= t.safe_stock";
    }

    const [countRows] = await pool.query<{ total: number }[]>(
      countSql,
      [...params, ...countParams]
    );
    const total = countRows[0]?.total ?? 0;

    let listSql = `
      SELECT *
      FROM (
        ${baseSelect}
      ) t
      WHERE 1=1
    `;
    const listParams: any[] = [];

    if (threshold !== null && !Number.isNaN(threshold)) {
      listSql += " AND t.current_stock <= ?";
      listParams.push(threshold);
    } else {
      listSql +=
        " AND t.safe_stock > 0 AND t.current_stock <= t.safe_stock";
    }

    listSql += `
      ORDER BY t.current_stock ASC
      LIMIT ? OFFSET ?
    `;
    listParams.push(pageSize, offset);

    const [rows] = await pool.query<any[]>(listSql, [
      ...params,
      ...listParams,
    ]);

    return res.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: rows,
    });
  } catch (err) {
    console.error("GET /api/stock/low error:", err);
    res.status(500).json({ message: "저재고 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 재고 계산기 - 발주 추천 수량
 */
router.post("/calc-order", async (req, res) => {
  try {
    const { items } = req.body as {
      items: { goods_seq: number; target_stock: number }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "items 배열에 goods_seq, target_stock 를 전달해주세요.",
      });
    }

    const validItems = items.filter(
      (it) =>
        typeof it.goods_seq === "number" &&
        !Number.isNaN(it.goods_seq) &&
        typeof it.target_stock === "number" &&
        it.target_stock >= 0
    );

    if (validItems.length === 0) {
      return res.status(400).json({
        message: "유효한(goods_seq, target_stock>=0) 항목이 없습니다.",
      });
    }

    const goodsSeqList = validItems.map((it) => it.goods_seq);
    const placeholders = goodsSeqList.map(() => "?").join(",");

    const [rows] = await pool.query<
      {
        goods_seq: number;
        goods_code: string | null;
        goods_name: string;
        provider_seq: number | null;
        current_stock: number;
        default_price: number;
      }[]
    >(
      `
      SELECT
        g.goods_seq,
        g.goods_code,
        g.goods_name,
        g.provider_seq,
        IFNULL(SUM(gs.stock), 0) AS current_stock,
        g.default_price
      FROM fm_goods g
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
      WHERE g.goods_seq IN (${placeholders})
      GROUP BY g.goods_seq
    `,
      goodsSeqList
    );

    const targetMap = new Map<number, number>();
    for (const it of validItems) {
      targetMap.set(it.goods_seq, it.target_stock);
    }

    const result = rows.map((row) => {
      const targetStock = targetMap.get(row.goods_seq) ?? 0;
      const currentStock = row.current_stock ?? 0;
      const recommendedQty = Math.max(targetStock - currentStock, 0);

      return {
        goods_seq: row.goods_seq,
        goods_code: row.goods_code,
        goods_name: row.goods_name,
        provider_seq: row.provider_seq,
        current_stock: currentStock,
        target_stock: targetStock,
        recommended_qty: recommendedQty,
        default_price: row.default_price,
        expected_amount: recommendedQty * (row.default_price ?? 0),
      };
    });

    return res.json({ items: result });
  } catch (err) {
    console.error("POST /api/stock/calc-order error:", err);
    res
      .status(500)
      .json({ message: "재고 계산 중 오류가 발생했습니다." });
  }
});

/**
 * 재고 알림 리스트
 */
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const { providerSeq, goodsSeq } = req.query;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (typeof providerSeq === "string" && providerSeq.trim() !== "") {
      if (!/^\d+$/.test(providerSeq.trim())) {
        return res
          .status(400)
          .json({ message: "유효한 providerSeq 를 입력하세요." });
      }
      whereClauses.push("g.provider_seq = ?");
      params.push(parseInt(providerSeq.trim(), 10));
    }

    if (typeof goodsSeq === "string" && goodsSeq.trim() !== "") {
      if (!/^\d+$/.test(goodsSeq.trim())) {
        return res
          .status(400)
          .json({ message: "유효한 goodsSeq 를 입력하세요." });
      }
      whereClauses.push("g.goods_seq = ?");
      params.push(parseInt(goodsSeq.trim(), 10));
    }

    whereClauses.push("s.safe_stock IS NOT NULL");
    whereClauses.push("s.safe_stock > 0");
    whereClauses.push(
      "(s.stock - s.badstock - s.reservation25) <= s.safe_stock"
    );
    whereClauses.push("g.goods_status = 'normal'");
    whereClauses.push("g.goods_view = 'look'");

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          g.goods_seq,
          g.goods_code,
          g.goods_name,
          g.provider_seq,
          IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,

          s.stock,
          s.badstock,
          s.reservation25,
          s.ablestock15,
          s.safe_stock,
          s.supply_price,
          s.supply_price_krw,

          (s.stock - s.badstock - s.reservation25) AS available_stock,
          GREATEST(
            s.safe_stock - (s.stock - s.badstock - s.reservation25),
            0
          ) AS required_qty

        FROM fm_goods_supply s
        JOIN fm_goods g
          ON s.goods_seq = g.goods_seq
        LEFT JOIN fm_provider p
          ON g.provider_seq = p.provider_seq
        ${whereSql}
        ORDER BY g.provider_seq, g.goods_code
      `,
      params
    );

    res.json({
      items: rows.map((r) => ({
        goods_seq: r.goods_seq,
        goods_code: r.goods_code,
        goods_name: r.goods_name,
        provider_seq: r.provider_seq,
        provider_name: r.provider_name,
        stock: r.stock,
        badstock: r.badstock,
        reservation25: r.reservation25,
        ablestock15: r.ablestock15,
        safe_stock: r.safe_stock,
        available_stock: r.available_stock,
        required_qty: r.required_qty,
        supply_price: r.supply_price,
        supply_price_krw: r.supply_price_krw,
      })),
    });
  } catch (err) {
    console.error("GET /api/stock/alerts error:", err);
    res.status(500).json({ message: "Failed to load stock alerts" });
  }
});



type StockOptionRow = RowDataPacket & {
  option_key: string;
  option_name: string;
  option_code: string | null;
  price: number;
  suggest_qty: number;
  in_qty: number;
  stock_qty: number;
  order_qty: number;
};

router.get("/options", async (req, res, next) => {
  try {
    // goods_seq / goodsSeq 둘 다 허용
    const goodsSeqRaw = (req.query.goods_seq ?? req.query.goodsSeq) as string | undefined;
    const goodsSeq = Number(goodsSeqRaw);

    if (!goodsSeq || Number.isNaN(goodsSeq)) {
      return res.status(400).json({ message: "유효한 goods_seq(goodsSeq) 를 입력하세요." });
    }

    const periodRaw = req.query.period ? Number(req.query.period) : 30;
    const period = periodRaw === 7 || periodRaw === 14 || periodRaw === 30 ? periodRaw : 30;

    const sql = `SELECT
  CAST(go.option_seq AS CHAR) AS option_key,

  CONCAT_WS(' / ',
    NULLIF(go.option1,''),
    NULLIF(go.option2,''),
    NULLIF(go.option3,''),
    NULLIF(go.option4,''),
    NULLIF(go.option5,'')
  ) AS option_name,

  go.full_barcode AS option_code,

  -- price: 공급가(매입가)
  COALESCE(gs.supply_price, 0) AS price,

  -- ✅ 권장입고: CASE로 0 미만 방지 (MariaDB 안전)
  CASE
    WHEN (COALESCE(oq.order_qty, 0) + COALESCE(gs.safe_stock, 0) - COALESCE(gs.stock, 0)) > 0
      THEN (COALESCE(oq.order_qty, 0) + COALESCE(gs.safe_stock, 0) - COALESCE(gs.stock, 0))
    ELSE 0
  END AS suggest_qty,

  0 AS in_qty,

  COALESCE(gs.stock, 0) AS stock_qty,
  COALESCE(oq.order_qty, 0) AS order_qty

FROM fm_goods_option go

LEFT JOIN fm_goods_supply gs
  ON gs.option_seq = go.option_seq

LEFT JOIN (
  SELECT
    oi.goods_seq,
    CONCAT_WS(' / ',
      NULLIF(oio.option1,''),
      NULLIF(oio.option2,''),
      NULLIF(oio.option3,''),
      NULLIF(oio.option4,''),
      NULLIF(oio.option5,'')
    ) AS opt_key,
    SUM(oio.ea) AS order_qty
  FROM fm_order_item_option oio
  INNER JOIN fm_order o
    ON o.order_seq = oio.order_seq
  INNER JOIN fm_order_item oi
    ON oi.item_seq = oio.item_seq
  WHERE o.regist_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
  GROUP BY oi.goods_seq, opt_key
) oq
  ON oq.goods_seq = go.goods_seq
 AND oq.opt_key = CONCAT_WS(' / ',
    NULLIF(go.option1,''),
    NULLIF(go.option2,''),
    NULLIF(go.option3,''),
    NULLIF(go.option4,''),
    NULLIF(go.option5,'')
 )

WHERE go.goods_seq = ?
ORDER BY go.option_seq ASC;
`;
    const [rows] = await pool.query(sql, [period, goodsSeq]);

    res.json({ ok: true, goods_seq: goodsSeq, period, items: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * 단일 상품 재고 상세
 * 👉 이건 맨 마지막 (파라미터 라우트)
 */
router.get("/:goodsSeq", async (req, res) => {
  try {
    const goodsSeq = Number(req.params.goodsSeq);
    if (!goodsSeq || Number.isNaN(goodsSeq)) {
      return res.status(400).json({ message: "유효한 goodsSeq 를 입력하세요." });
    }

    const [goodsRows] = await pool.query<
      {
        goods_seq: number;
        provider_seq: number;
        goods_code: string | null;
        goods_name: string;
        goods_status: string;
        goods_view: string;
        current_stock: number;
        safe_stock: number;
        default_price: number;
        default_consumer_price: number;
        purchase_ea_3mon: number;
        regist_date: Date;
        update_date: Date;
      }[]
    >(
      `
      SELECT
        g.goods_seq,
        g.provider_seq,
        g.goods_code,
        g.goods_name,
        g.goods_status,
        g.goods_view,
        IFNULL(SUM(gs.stock), 0)      AS current_stock,
        IFNULL(SUM(gs.safe_stock), 0) AS safe_stock,
        g.default_price,
        g.default_consumer_price,
        g.purchase_ea_3mon,
        g.regist_date,
        g.update_date
      FROM fm_goods g
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
      WHERE g.goods_seq = ?
      GROUP BY g.goods_seq
    `,
      [goodsSeq]
    );

    if (!goodsRows.length) {
      return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다." });
    }

    const goods = goodsRows[0];

    const [supplyRows] = await pool.query<
      {
        supply_seq: number;
        goods_seq: number;
        option_seq: number | null;
        suboption_seq: number | null;
        supply_price: number;
        supply_price_krw: number;
        exchange_rate: number;
        stock: number;
        badstock: number;
        reservation15: number;
        reservation25: number;
        ablestock15: number;
        safe_stock: number;
        total_supply_price: number;
        total_stock: number;
        total_badstock: number;
      }[]
    >(
      `
      SELECT
        supply_seq,
        goods_seq,
        option_seq,
        suboption_seq,
        supply_price,
        supply_price_krw,
        exchange_rate,
        stock,
        badstock,
        reservation15,
        reservation25,
        ablestock15,
        safe_stock,
        total_supply_price,
        total_stock,
        total_badstock
      FROM fm_goods_supply
      WHERE goods_seq = ?
      ORDER BY option_seq, suboption_seq, supply_seq
    `,
      [goodsSeq]
    );

    return res.json({
      goods,
      supply_rows: supplyRows,
    });
  } catch (err) {
    console.error("GET /api/stock/:goodsSeq error:", err);
    res
      .status(500)
      .json({ message: "재고 상세 조회 중 오류가 발생했습니다." });
  }
});

export default router;
