import { Router, Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";

const router = Router();

/**
 * 공급사 목록
 * GET /api/providers?keyword=돌다리
 *
 * response: [{ provider_seq, provider_name }]
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (keyword) {
      where += " AND (provider_name LIKE ? OR provider_seq = ?)";
      params.push(`%${keyword}%`, Number(keyword) || -1);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        provider_seq,
        provider_name
      FROM fm_provider
      ${where}
      ORDER BY provider_name ASC
      `,
      params
    );

    res.json(
      rows.map((r) => ({
        provider_seq: r.provider_seq,
        provider_name: r.provider_name,
      }))
    );
  } catch (err) {
    console.error("GET /api/providers error:", err);
    res.status(500).json({ message: "공급사 목록 조회 중 오류가 발생했습니다." });
  }
});

export default router;
