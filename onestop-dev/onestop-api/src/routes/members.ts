// src/routes/members.ts
import { Router } from "express";
import { pool } from "../db";
import { Member } from "../types";

const router = Router();

/**
 * GET /api/members
 * 쿼리:
 *  - keyword: userid / user_name / email LIKE 검색
 *  - status: done/hold/withdrawal/dormancy
 *  - limit: 기본 50
 */
router.get("/", async (req, res) => {
  try {
    const {
      keyword = "",
      status = "",
      limit = "50"
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push(
        "(m.userid LIKE ? OR m.user_name LIKE ? OR m.email LIKE ?)"
      );
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      conditions.push("m.status = ?");
      params.push(status);
    }

    const where =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const sql = `
      SELECT
        m.member_seq,
        m.userid,
        m.user_name,
        m.email,
        m.cellphone,
        m.status,
        m.group_seq,
        m.emoney,
        m.point,
        m.member_order_cnt,
        m.member_order_price,
        m.regist_date,
        m.lastlogin_date
      FROM fm_member AS m
      ${where}
      ORDER BY m.member_seq DESC
      LIMIT ?
    `;

    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    res.json(rows as Member[]);
  } catch (err) {
    console.error("GET /api/members error:", err);
    res.status(500).json({ message: "회원 조회 중 오류가 발생했습니다." });
  }
});

/**
 * GET /api/members/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const memberSeq = Number(req.params.id);
    if (!memberSeq) {
      return res.status(400).json({ message: "유효하지 않은 member_seq" });
    }

    const sql = `
      SELECT *
      FROM fm_member
      WHERE member_seq = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [memberSeq]);
    const member = (rows as any[])[0];

    if (!member) {
      return res.status(404).json({ message: "회원을 찾을 수 없습니다." });
    }

    res.json(member);
  } catch (err) {
    console.error("GET /api/members/:id error:", err);
    res.status(500).json({ message: "회원 상세 조회 중 오류가 발생했습니다." });
  }
});

export default router;
