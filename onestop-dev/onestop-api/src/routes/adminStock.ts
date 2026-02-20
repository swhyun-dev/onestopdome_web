// src/routes/adminStock.ts
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2/promise";

const router = Router();

function toDateTimeRange(startDate?: string, endDate?: string) {
  // 기본: 최근 30일
  const today = new Date();
  const end = endDate?.trim()
    ? new Date(`${endDate.trim()}T00:00:00`)
    : new Date(today);
  const start = startDate?.trim()
    ? new Date(`${startDate.trim()}T00:00:00`)
    : new Date(new Date(end).setDate(end.getDate() - 30));

  const s = `${start.toISOString().slice(0, 10)} 00:00:00`;
  const e = `${end.toISOString().slice(0, 10)} 23:59:59`;
  return { startDt: s, endDt: e };
}

router.get("/products", async (req: Request, res: Response) => {
  try {
    const providerSeqRaw = req.query.providerSeq as string | undefined;
    const providerSeq =
      providerSeqRaw && providerSeqRaw.trim() !== "" ? Number(providerSeqRaw) : null;

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const { startDt, endDt } = toDateTimeRange(startDate, endDate);

    const page = Math.max(parseInt((req.query.page as string) || "1", 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) || "50", 10) || 50, 1),
      200
    );
    const offset = (page - 1) * limit;

    const sort = (req.query.sort as string | undefined) || "sales_qty_desc";
    const keyword = typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const minSalesQtyRaw = req.query.minSalesQty as string | undefined;
    const minSalesQty =
      minSalesQtyRaw && minSalesQtyRaw.trim() !== "" ? Number(minSalesQtyRaw) : null;
    const hasLowStockOnly =
      typeof req.query.hasLowStockOnly === "string"
        ? ["1", "true", "y", "yes"].includes(req.query.hasLowStockOnly.toLowerCase())
        : false;

    // --- WHERE (상품 마스터 기반) ---
    const where: string[] = [];
    const params: any[] = [];

    if (providerSeq) {
      where.push("g.provider_seq = ?");
      params.push(providerSeq);
    }
    if (keyword) {
      where.push("(g.goods_name LIKE ? OR g.goods_code LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    // 노출/정상만 (원하면 제거 가능)
    where.push("g.goods_status = 'normal'");
    where.push("g.goods_view = 'look'");

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // --- 정렬 매핑 ---
    let orderBy = "sales_qty DESC";
    if (sort === "sales_qty_asc") orderBy = "sales_qty ASC";
    else if (sort === "reg_date_desc") orderBy = "g.regist_date DESC";
    else if (sort === "reg_date_asc") orderBy = "g.regist_date ASC";
    else if (sort === "last_order_desc") orderBy = "last_order_date DESC";
    else if (sort === "last_order_asc") orderBy = "last_order_date ASC";

    // --- 집계 서브쿼리(재고/판매) ---
    // 재고: lowStock API 기준 그대로 (옵션 합산)
    // 판매: 기간 내 판매수량/매출/마지막주문일 (refund_ea 반영)
    const sql = `
      SELECT
        g.goods_seq,
        g.goods_code,
        g.goods_name,
        g.provider_seq,
        IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,

        IFNULL(s.available_stock, 0) AS available_stock,
        IFNULL(s.safe_stock, 0)      AS safe_stock,
        GREATEST(IFNULL(s.safe_stock, 0) - IFNULL(s.available_stock, 0), 0) AS required_qty,

        IFNULL(m.sales_qty, 0)       AS sales_qty,
        IFNULL(m.sales_amount, 0)    AS sales_amount,
        m.last_order_date            AS last_order_date,

        g.regist_date                AS reg_date

      FROM fm_goods g
      LEFT JOIN fm_provider p
        ON g.provider_seq = p.provider_seq

      LEFT JOIN (
        SELECT
          gs.goods_seq,
          SUM((gs.stock - gs.badstock - gs.reservation25)) AS available_stock,
          SUM(gs.safe_stock) AS safe_stock
        FROM fm_goods_supply gs
        GROUP BY gs.goods_seq
      ) s
        ON g.goods_seq = s.goods_seq

      LEFT JOIN (
        SELECT
          i.goods_seq,
          SUM(GREATEST(oi.ea - oi.refund_ea, 0)) AS sales_qty,
          SUM(oi.price * GREATEST(oi.ea - oi.refund_ea, 0)) AS sales_amount,
          DATE(MAX(o.regist_date)) AS last_order_date
        FROM fm_order o
        JOIN fm_order_item i
          ON o.order_seq = i.order_seq
        JOIN fm_order_item_option oi
          ON i.item_seq = oi.item_seq
        WHERE o.regist_date >= ?
          AND o.regist_date <= ?
          AND o.hidden = 'N'
          -- 필요하면 입금완료만:
          -- AND o.deposit_yn = 'y'
        GROUP BY i.goods_seq
      ) m
        ON g.goods_seq = m.goods_seq

      ${whereSql}
    `;

    // --- 필터(집계 결과 기반) ---
    // whereSql 뒤에 붙이면 안 되고, 바깥 SELECT에서 조건 추가해야 해서 wrapping
    const outerWhere: string[] = [];
    const outerParams: any[] = [];

    if (minSalesQty !== null && !Number.isNaN(minSalesQty)) {
      outerWhere.push("IFNULL(m.sales_qty, 0) >= ?");
      outerParams.push(minSalesQty);
    }
    if (hasLowStockOnly) {
      outerWhere.push("GREATEST(IFNULL(s.safe_stock, 0) - IFNULL(s.available_stock, 0), 0) > 0");
    }

    const outerWhereSql = outerWhere.length ? ` AND ${outerWhere.join(" AND ")}` : "";

    // total count
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        ${sql}
      ) t
      WHERE 1=1
      ${outerWhereSql}
    `;

    const [countRows] = await pool.query<RowDataPacket[]>(
      countSql,
      [startDt, endDt, ...params, ...outerParams]
    );
    const total = (countRows[0]?.total as number) || 0;

    // list
    const listSql = `
      SELECT *
      FROM (
        ${sql}
      ) t
      WHERE 1=1
      ${outerWhereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(
      listSql,
      [startDt, endDt, ...params, ...outerParams, limit, offset]
    );

    res.json({
      page,
      limit,
      total,
      totalPages: total === 0 ? 1 : Math.ceil(total / limit),
      items: rows,
      meta: {
        startDt,
        endDt,
        sort,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/stock/products error:", err);
    res.status(500).json({ message: "재고관리 상품목록 조회 중 오류가 발생했습니다." });
  }
});

export default router;
