// src/routes/margin.ts
import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

/**
 * 단일 상품 마진 시뮬레이션
 *
 * GET /api/margin/goods/:goodsSeq
 *
 * query:
 *  - salePrice        : 판매가격 (미입력 시 → fm_goods.default_price 사용)
 *  - supplyPrice      : 공급가(원) (미입력 시 → fm_goods_supply.supply_price_krw 평균값 사용)
 *  - commissionRate   : 마켓 수수료율(%) 예: 13 => 13%  (기본 10)
 *  - paymentFeeRate   : PG/결제 수수료율(%) (기본 3)
 *  - shippingFee      : 1건당 배송비 (기본 0)
 *  - extraCost        : 기타 비용 (포장비, 인건비 등, 기본 0)
 *
 * 계산식:
 *  - commission  = salePrice * commissionRate/100
 *  - paymentFee  = salePrice * paymentFeeRate/100
 *  - profit      = salePrice - commission - paymentFee - shippingFee - extraCost - supplyCost
 *  - marginRate  = profit / salePrice * 100
 */
router.get("/goods/:goodsSeq", async (req: Request, res: Response) => {
  try {
    const goodsSeq = Number(req.params.goodsSeq);
    if (!goodsSeq || Number.isNaN(goodsSeq)) {
      return res.status(400).json({ message: "유효한 goodsSeq 를 입력하세요." });
    }

    // ─────────────────────────────────
    // 1) 쿼리 파라미터 파싱
    // ─────────────────────────────────
    const q = req.query;

    const salePriceInput =
      typeof q.salePrice === "string" && q.salePrice.trim() !== ""
        ? Number(q.salePrice)
        : null;

    const supplyPriceInput =
      typeof q.supplyPrice === "string" && q.supplyPrice.trim() !== ""
        ? Number(q.supplyPrice)
        : null;

    const commissionRate =
      typeof q.commissionRate === "string" && q.commissionRate.trim() !== ""
        ? Number(q.commissionRate)
        : 10; // 기본 10%

    const paymentFeeRate =
      typeof q.paymentFeeRate === "string" && q.paymentFeeRate.trim() !== ""
        ? Number(q.paymentFeeRate)
        : 3; // 기본 3%

    const shippingFee =
      typeof q.shippingFee === "string" && q.shippingFee.trim() !== ""
        ? Number(q.shippingFee)
        : 0;

    const extraCost =
      typeof q.extraCost === "string" && q.extraCost.trim() !== ""
        ? Number(q.extraCost)
        : 0;

    // 숫자 검증 (필수는 아니지만 이상한 값 방지)
    if (
      [salePriceInput, supplyPriceInput, commissionRate, paymentFeeRate, shippingFee, extraCost]
        .some((v) => typeof v === "number" && Number.isNaN(v as number))
    ) {
      return res.status(400).json({
        message: "salePrice, supplyPrice, commissionRate, paymentFeeRate, shippingFee, extraCost 값이 올바른 숫자인지 확인해주세요."
      });
    }

    // ─────────────────────────────────
    // 2) DB에서 상품/공급가 기본 정보 조회
    // ─────────────────────────────────
    const [rows] = await pool.query<
      {
        goods_seq: number;
        goods_code: string | null;
        goods_name: string;
        default_price: number;
        // 옵션들에 있는 공급가(원화 기준)의 평균값(또는 0)
        supply_price_krw: number;
      }[]
    >(
      `
      SELECT
        g.goods_seq,
        g.goods_code,
        g.goods_name,
        g.default_price,
        IFNULL(AVG(gs.supply_price_krw), 0) AS supply_price_krw
      FROM fm_goods g
      LEFT JOIN fm_goods_supply gs
        ON g.goods_seq = gs.goods_seq
      WHERE g.goods_seq = ?
      GROUP BY g.goods_seq, g.goods_code, g.goods_name, g.default_price
    `,
      [goodsSeq]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다." });
    }

    const row = rows[0];

    // ─────────────────────────────────
    // 3) 최종 사용할 판매가/공급가 결정
    // ─────────────────────────────────
    const salePrice =
      typeof salePriceInput === "number" && !Number.isNaN(salePriceInput)
        ? salePriceInput
        : Number(row.default_price ?? 0);

    const supplyCost =
      typeof supplyPriceInput === "number" && !Number.isNaN(supplyPriceInput)
        ? supplyPriceInput
        : Number(row.supply_price_krw ?? 0);

    // 판매가가 0이면 의미가 없으니 방어 로직
    if (!salePrice || salePrice <= 0) {
      return res.status(400).json({
        message: "판매가(salePrice)를 0보다 크게 설정해주세요. (쿼리 또는 상품 기본가)"
      });
    }

    // ─────────────────────────────────
    // 4) 수수료, 마진 계산
    // ─────────────────────────────────
    const commission = salePrice * (commissionRate / 100);
    const paymentFee = salePrice * (paymentFeeRate / 100);

    const profit =
      salePrice -
      commission -
      paymentFee -
      shippingFee -
      extraCost -
      supplyCost;

    const marginRate = (profit / salePrice) * 100;

    return res.json({
      goods_seq: row.goods_seq,
      goods_code: row.goods_code,
      goods_name: row.goods_name,

      // 입력/기본 값들
      sale_price: salePrice,
      supply_cost: supplyCost,
      commission_rate: commissionRate,
      payment_fee_rate: paymentFeeRate,
      shipping_fee: shippingFee,
      extra_cost: extraCost,

      // 계산 결과
      commission: Math.round(commission),
      payment_fee: Math.round(paymentFee),
      profit: Math.round(profit),
      margin_rate: Math.round(marginRate * 100) / 100 // 소수점 둘째 자리
    });
  } catch (err) {
    console.error("GET /api/margin/goods/:goodsSeq error:", err);
    res.status(500).json({ message: "마진 계산 중 오류가 발생했습니다." });
  }
});

export default router;
