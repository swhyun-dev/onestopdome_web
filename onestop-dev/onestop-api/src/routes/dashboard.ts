// src/routes/dashboard.ts
import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * GET /api/dashboard/summary
 *
 * - 전체 상품 수
 * - 전체 회원 수
 * - 전체 주문 수
 * - 오늘 매출
 * - 최근 7일 매출
 * - 최근 30일 매출
 */
router.get("/summary", async (req, res) => {
  try {
    // 1) 전체 카운트들
    const [goodsRows] = await pool.query<[{ total_goods: number }][]>(
      `SELECT COUNT(*) AS total_goods
       FROM fm_goods
       WHERE goods_type = 'goods'`
    );

    const [memberRows] = await pool.query<[{ total_members: number }][]>(
      `SELECT COUNT(*) AS total_members
       FROM fm_member
       WHERE status = 'done'`
    );

    const [orderRows] = await pool.query<[{ total_orders: number }][]>(
      `SELECT COUNT(*) AS total_orders
       FROM fm_order`
    );

    // 2) 매출 요약
    //   - settleprice 기준
    //   - 실제 입금 완료된 건만 보고 싶으면 deposit_yn='y' 조건을 걸어도 됨
    const [salesRows] = await pool.query<
      {
        label: string;
        total_sales: number | null;
        order_count: number;
      }[]
    >(
      `
      SELECT 'today' AS label,
             IFNULL(SUM(settleprice), 0) AS total_sales,
             COUNT(*) AS order_count
      FROM fm_order
      WHERE regist_date >= CURDATE()
        AND regist_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)

      UNION ALL

      SELECT 'last7' AS label,
             IFNULL(SUM(settleprice), 0) AS total_sales,
             COUNT(*) AS order_count
      FROM fm_order
      WHERE regist_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND regist_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)

      UNION ALL

      SELECT 'last30' AS label,
             IFNULL(SUM(settleprice), 0) AS total_sales,
             COUNT(*) AS order_count
      FROM fm_order
      WHERE regist_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND regist_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `
    );

    const today = salesRows.find((r) => r.label === "today");
    const last7 = salesRows.find((r) => r.label === "last7");
    const last30 = salesRows.find((r) => r.label === "last30");

    res.json({
      totals: {
        goods: goodsRows[0]?.total_goods ?? 0,
        members: memberRows[0]?.total_members ?? 0,
        orders: orderRows[0]?.total_orders ?? 0
      },
      sales: {
        today: {
          amount: today?.total_sales ?? 0,
          orders: today?.order_count ?? 0
        },
        last7days: {
          amount: last7?.total_sales ?? 0,
          orders: last7?.order_count ?? 0
        },
        last30days: {
          amount: last30?.total_sales ?? 0,
          orders: last30?.order_count ?? 0
        }
      }
    });
  } catch (err) {
    console.error("GET /api/dashboard/summary error:", err);
    res
      .status(500)
      .json({ message: "대시보드 요약 조회 중 오류가 발생했습니다." });
  }
});

export default router;
