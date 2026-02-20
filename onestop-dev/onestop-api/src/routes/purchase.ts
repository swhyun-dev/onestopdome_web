// src/routes/purchase.ts
import { Router } from "express";
import { pool } from "../db";
import {
  createPurchaseOrderExcel,
  PurchaseOrderExcelRow
} from "../utils/excel";

const router = Router();

/**
 * 발주서 엑셀 생성
 * POST /api/purchase/order-excel
 *
 * body:
 * {
 *   "items": [
 *     { "goods_seq": 100, "order_qty": 50 },
 *     { "goods_seq": 1069, "order_qty": 200 }
 *   ]
 * }
 */


router.post("/order-excel", async (req, res) => {
  try {
    const { items } = req.body as {
      items: { goods_seq: number; order_qty: number }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "items 배열에 goods_seq, order_qty 를 전달해주세요." });
    }

    const validItems = items.filter(
      (it) =>
        typeof it.goods_seq === "number" &&
        !Number.isNaN(it.goods_seq) &&
        typeof it.order_qty === "number" &&
        it.order_qty > 0
    );

    if (validItems.length === 0) {
      return res
        .status(400)
        .json({ message: "유효한(goods_seq, order_qty>0) 항목이 없습니다." });
    }

    const goodsSeqList = validItems.map((it) => it.goods_seq);
    const placeholders = goodsSeqList.map(() => "?").join(",");

    // 상품 + 공급사 + 매입가 정보 조회
    // fm_goods_supply 의 필드명은 환경에 따라 supply_price / default_supply_price 등 확인 필요
    const sql = `
        SELECT
            g.goods_seq,
            g.goods_code,
            g.goods_name,
            g.provider_seq,
            IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,

            -- ✅ 매입가: 옵션 전체 평균 공급가 (없으면 default_price 사용)
            COALESCE(AVG(gs.supply_price), g.default_price) AS supply_price,

            -- ✅ 현재 재고: fm_goods_supply.stock 합계
            IFNULL(SUM(gs.stock), 0) AS current_stock

        FROM fm_goods g
        LEFT JOIN fm_provider p
            ON g.provider_seq = p.provider_seq
        LEFT JOIN fm_goods_supply gs
            ON g.goods_seq = gs.goods_seq
        WHERE g.goods_seq IN (${placeholders})
        GROUP BY g.goods_seq
        `;

        const [rows] = await pool.query<
        {
          goods_seq: number;
          goods_code: string | null;
          goods_name: string;
          provider_seq: number;
          provider_name: string;
          supply_price: number;   // 평균 공급가
          current_stock: number;  // 현재 재고
        }[]
      >(sql, goodsSeqList);

    // goods_seq → 주문수량 매핑
    const qtyMap = new Map<number, number>();
    for (const it of validItems) {
      qtyMap.set(it.goods_seq, it.order_qty);
    }

    const excelRows: PurchaseOrderExcelRow[] = [];

    for (const row of rows) {
      const orderQty = qtyMap.get(row.goods_seq) || 0;
      if (orderQty <= 0) continue;

      excelRows.push({
        provider_seq: row.provider_seq,
        provider_name: row.provider_name,
        goods_seq: row.goods_seq,
        goods_code: row.goods_code,
        goods_name: row.goods_name,
        order_qty: orderQty,
        supply_price:
          row.supply_price != null ? Number(row.supply_price) : null
      });
    }

    if (excelRows.length === 0) {
      return res
        .status(400)
        .json({ message: "발주 가능한 상품이 없습니다." });
    }

    const buffer = await createPurchaseOrderExcel(excelRows);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const fileName = `purchase_order_${y}${m}${d}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    res.send(buffer);
  } catch (err) {
    console.error("POST /api/purchase/order-excel error:", err);
    res
      .status(500)
      .json({ message: "발주서 엑셀 생성 중 오류가 발생했습니다." });
  }
});

export default router;
