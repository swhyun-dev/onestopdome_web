// src/routes/report.ts
import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * 공통: 기간 필터 유틸
 */
function buildDateRangeCondition(
  from?: string,
  to?: string
): { where: string; params: any[] } {
  const conds: string[] = [];
  const params: any[] = [];

  if (from) {
    conds.push("o.regist_date >= ?");
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    conds.push("o.regist_date <= ?");
    params.push(`${to} 23:59:59`);
  }

  const where =
    conds.length > 0 ? "AND " + conds.join(" AND ") : "";

  return { where, params };
}

/* ------------------------------------------------------------------ *
 * 1) 입점사별 매출 분석
 * GET /api/report/sales/vendors?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
 * ------------------------------------------------------------------ */
// 입점사별 매출 분석
router.get('/sales/vendors', async (req: Request, res: Response) => {
    try {
      const {
        startDate,
        endDate,
        page = '1',
        pageSize = '50',
      } = req.query;
  
      // 기본 기간: 올해 전체
      const start = (startDate as string) || '2025-01-01 00:00:00';
      const end = (endDate as string) || '2025-12-31 23:59:59';
  
      const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
      const sizeNum = Math.max(parseInt(pageSize as string, 10) || 50, 1);
      const offset = (pageNum - 1) * sizeNum;
  
      // 1) 실제 데이터 조회
      const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
          g.provider_seq,
          IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,
  
          COUNT(DISTINCT o.order_seq)                AS order_count,
          SUM(oi.ea)                                 AS total_ea,
          SUM(oi.price * oi.ea)                      AS gross_sales,
          SUM(oi.supply_price_krw * oi.ea)           AS cost_of_goods,
          SUM(oi.price * oi.ea)
            - SUM(oi.supply_price_krw * oi.ea)       AS gross_profit,
          CASE WHEN SUM(oi.price * oi.ea) = 0 THEN 0
               ELSE ROUND(
                 (SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea))
                 / SUM(oi.price * oi.ea) * 100, 1)
          END                                        AS gross_margin_rate
  
        FROM fm_order o
        JOIN fm_order_item i
          ON o.order_seq = i.order_seq
        JOIN fm_order_item_option oi
          ON i.item_seq = oi.item_seq
        JOIN fm_goods g
          ON i.goods_seq = g.goods_seq
        LEFT JOIN fm_provider p
          ON g.provider_seq = p.provider_seq
  
        WHERE o.deposit_yn = 'y'
          AND o.regist_date >= ?
          AND o.regist_date <= ?
  
        GROUP BY
          g.provider_seq,
          provider_name
  
        ORDER BY gross_sales DESC
        LIMIT ? OFFSET ?
        `,
        [start, end, sizeNum, offset],
      );
  
      // 2) 전체 개수 (페이지네이션용)
      const [countRows] = await pool.query<RowDataPacket[]>(
        `
        SELECT COUNT(*) AS total
        FROM (
          SELECT g.provider_seq
          FROM fm_order o
          JOIN fm_order_item i
            ON o.order_seq = i.order_seq
          JOIN fm_order_item_option oi
            ON i.item_seq = oi.item_seq
          JOIN fm_goods g
            ON i.goods_seq = g.goods_seq
          WHERE o.deposit_yn = 'y'
            AND o.regist_date >= ?
            AND o.regist_date <= ?
          GROUP BY g.provider_seq
        ) t
        `,
        [start, end],
      );
  
      const total = (countRows[0]?.total as number) || 0;
      const totalPages = total === 0 ? 1 : Math.ceil(total / sizeNum);
  
      res.json({
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages,
        items: rows,
      });
    } catch (err) {
      console.error('GET /api/report/sales/vendors error:', err);
      res.status(500).json({ error: 'Failed to get vendor sales report' });
    }
  });

/**
 * 상품별 매출/마진 분석
 * GET /api/report/sales/goods
 *
 * query:
 *  - startDate (YYYY-MM-DD, optional)
 *  - endDate   (YYYY-MM-DD, optional)
 *  - provider_seq (optional, number)
 *  - keyword      (optional, string: goods_name / goods_code LIKE)
 *  - page, pageSize
 *  - orderBy: sales | ea | margin  (default: sales)
 *  - sort: asc | desc              (default: desc)
 */
// 상품별 매출/마진 분석
router.get('/sales/goods', async (req: Request, res: Response) => {
    try {
      const {
        startDate,
        endDate,
        page = '1',
        pageSize = '50',
        providerSeq,
      } = req.query;
  
      const start = (startDate as string) || '2025-01-01 00:00:00';
      const end = (endDate as string) || '2025-12-31 23:59:59';
  
      const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
      const sizeNum = Math.max(parseInt(pageSize as string, 10) || 50, 1);
      const offset = (pageNum - 1) * sizeNum;
  
      // 공급사 필터 여부
      const hasProviderFilter = !!providerSeq;
      const providerWhere = hasProviderFilter ? 'AND g.provider_seq = ?' : '';
      const providerParams = hasProviderFilter ? [providerSeq] : [];
  
      const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
          i.goods_seq,
          g.goods_code,
          g.goods_name,
          g.provider_seq,
          IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS provider_name,
  
          SUM(oi.ea)                                 AS total_ea,
          SUM(oi.price * oi.ea)                      AS gross_sales,
          SUM(oi.supply_price_krw * oi.ea)           AS cost_of_goods,
          SUM(oi.price * oi.ea)
            - SUM(oi.supply_price_krw * oi.ea)       AS gross_profit,
          CASE WHEN SUM(oi.price * oi.ea) = 0 THEN 0
               ELSE ROUND(
                 (SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea))
                 / SUM(oi.price * oi.ea) * 100, 1)
          END                                        AS gross_margin_rate
  
        FROM fm_order o
        JOIN fm_order_item i
          ON o.order_seq = i.order_seq
        JOIN fm_order_item_option oi
          ON i.item_seq = oi.item_seq
        JOIN fm_goods g
          ON i.goods_seq = g.goods_seq
        LEFT JOIN fm_provider p
          ON g.provider_seq = p.provider_seq
  
        WHERE o.deposit_yn = 'y'
          AND o.regist_date >= ?
          AND o.regist_date <= ?
          ${providerWhere}
  
        GROUP BY
          i.goods_seq,
          g.goods_code,
          g.goods_name,
          g.provider_seq,
          provider_name
  
        ORDER BY gross_sales DESC
        LIMIT ? OFFSET ?
        `,
        [start, end, ...providerParams, sizeNum, offset],
      );
  
      const [countRows] = await pool.query<RowDataPacket[]>(
        `
        SELECT COUNT(*) AS total
        FROM (
          SELECT i.goods_seq
          FROM fm_order o
          JOIN fm_order_item i
            ON o.order_seq = i.order_seq
          JOIN fm_order_item_option oi
            ON i.item_seq = oi.item_seq
          JOIN fm_goods g
            ON i.goods_seq = g.goods_seq
          WHERE o.deposit_yn = 'y'
            AND o.regist_date >= ?
            AND o.regist_date <= ?
            ${providerWhere}
          GROUP BY i.goods_seq
        ) t
        `,
        [start, end, ...providerParams],
      );
  
      const total = (countRows[0]?.total as number) || 0;
      const totalPages = total === 0 ? 1 : Math.ceil(total / sizeNum);
  
      res.json({
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages,
        items: rows,
      });
    } catch (err) {
      console.error('GET /api/report/sales/goods error:', err);
      res.status(500).json({ error: 'Failed to get goods sales report' });
    }
  });
  

/* ------------------------------------------------------------------ *
 * 3) 일자별 매출 그래프용 데이터
 * GET /api/report/sales/daily?days=30
 *
 * - 최근 N일 기본 (또는 from/to로 직접 지정 가능)
 * ------------------------------------------------------------------ */
router.get('/sales/daily', async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      providerSeq,
      goodsSeq,
      page,
      pageSize,
    } = req.query as Record<string, string | undefined>;

    // ✅ 기간 기본값 (원하면 여기만 바꾸면 됨)
    const start = startDate || '2025-01-01';
    const end = endDate || '2025-12-31';

    const startDt = `${start} 00:00:00`;
    const endDt = `${end} 23:59:59`;

    const whereClauses: string[] = [
      `o.deposit_yn = 'y'`,
      `o.regist_date >= ?`,
      `o.regist_date <= ?`,
    ];
    const params: any[] = [startDt, endDt];

    if (providerSeq) {
      whereClauses.push('g.provider_seq = ?');
      params.push(Number(providerSeq));
    }
    if (goodsSeq) {
      whereClauses.push('i.goods_seq = ?');
      params.push(Number(goodsSeq));
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // ✅ 페이징 사용 여부: page/pageSize 둘 중 하나라도 오면 페이징 모드
    const usePaging = page !== undefined || pageSize !== undefined;

    let limitSql = '';
    let limitParams: any[] = [];

    if (usePaging) {
      const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
      const sizeNum = Math.max(parseInt(pageSize || '50', 10) || 50, 1);
      const offset = (pageNum - 1) * sizeNum;

      limitSql = `LIMIT ? OFFSET ?`;
      limitParams = [sizeNum, offset];

      // 1) 데이터
      const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
          DATE(o.regist_date)                         AS sale_date,
          COUNT(DISTINCT o.order_seq)                 AS order_count,
          SUM(oi.ea)                                  AS total_ea,
          SUM(oi.price * oi.ea)                       AS gross_sales,
          SUM(oi.supply_price_krw * oi.ea)            AS cost_of_goods,
          SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea) AS gross_profit,
          CASE WHEN SUM(oi.price * oi.ea) = 0 THEN 0
               ELSE ROUND(
                 (SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea))
                 / SUM(oi.price * oi.ea) * 100, 1)
          END                                         AS gross_margin_rate
        FROM fm_order o
        JOIN fm_order_item i ON o.order_seq = i.order_seq
        JOIN fm_order_item_option oi ON i.item_seq = oi.item_seq
        JOIN fm_goods g ON i.goods_seq = g.goods_seq
        ${whereSql}
        GROUP BY DATE(o.regist_date)
        ORDER BY sale_date
        ${limitSql}
        `,
        [...params, ...limitParams],
      );

      // 2) total (일자 수)
      const [countRows] = await pool.query<RowDataPacket[]>(
        `
        SELECT COUNT(*) AS total
        FROM (
          SELECT DATE(o.regist_date) AS sale_date
          FROM fm_order o
          JOIN fm_order_item i ON o.order_seq = i.order_seq
          JOIN fm_order_item_option oi ON i.item_seq = oi.item_seq
          JOIN fm_goods g ON i.goods_seq = g.goods_seq
          ${whereSql}
          GROUP BY DATE(o.regist_date)
        ) t
        `,
        params,
      );

      const total = (countRows[0]?.total as number) || 0;
      const totalPages = total === 0 ? 1 : Math.ceil(total / sizeNum);

      return res.json({
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages,
        items: rows,
      });
    }

    // ✅ 페이징 없으면 기간 내 전체 반환
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        DATE(o.regist_date)                         AS sale_date,
        COUNT(DISTINCT o.order_seq)                 AS order_count,
        SUM(oi.ea)                                  AS total_ea,
        SUM(oi.price * oi.ea)                       AS gross_sales,
        SUM(oi.supply_price_krw * oi.ea)            AS cost_of_goods,
        SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea) AS gross_profit,
        CASE WHEN SUM(oi.price * oi.ea) = 0 THEN 0
             ELSE ROUND(
               (SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea))
               / SUM(oi.price * oi.ea) * 100, 1)
        END                                         AS gross_margin_rate
      FROM fm_order o
      JOIN fm_order_item i ON o.order_seq = i.order_seq
      JOIN fm_order_item_option oi ON i.item_seq = oi.item_seq
      JOIN fm_goods g ON i.goods_seq = g.goods_seq
      ${whereSql}
      GROUP BY DATE(o.regist_date)
      ORDER BY sale_date
      `,
      params,
    );

    // 그래프용은 totalPages 같은 거 굳이 없어도 되지만, 프론트 호환 위해 유지
    return res.json({
      page: 1,
      pageSize: rows.length,
      total: rows.length,
      totalPages: 1,
      items: rows,
    });
  } catch (err) {
    console.error('GET /api/report/sales/daily error:', err);
    res.status(500).json({ error: 'Failed to get daily sales report' });
  }
});
  
router.get('/sales/month', async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      providerSeq,
      goodsSeq,
    } = req.query as Record<string, string | undefined>;

    const start = startDate || '2025-01-01';
    const end = endDate || '2025-12-31';

    const startDt = `${start} 00:00:00`;
    const endDt = `${end} 23:59:59`;

    const whereClauses: string[] = [
      `o.deposit_yn = 'y'`,
      `o.regist_date >= ?`,
      `o.regist_date <= ?`,
    ];
    const params: any[] = [startDt, endDt];

    if (providerSeq) {
      whereClauses.push('g.provider_seq = ?');
      params.push(Number(providerSeq));
    }
    if (goodsSeq) {
      whereClauses.push('i.goods_seq = ?');
      params.push(Number(goodsSeq));
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        DATE_FORMAT(o.regist_date, '%Y-%m-01')        AS sale_month,
        COUNT(DISTINCT o.order_seq)                   AS order_count,
        SUM(oi.ea)                                    AS total_ea,
        SUM(oi.price * oi.ea)                         AS gross_sales,
        SUM(oi.supply_price_krw * oi.ea)              AS cost_of_goods,
        SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea) AS gross_profit,
        CASE WHEN SUM(oi.price * oi.ea) = 0 THEN 0
             ELSE ROUND(
               (SUM(oi.price * oi.ea) - SUM(oi.supply_price_krw * oi.ea))
               / SUM(oi.price * oi.ea) * 100, 1)
        END                                           AS gross_margin_rate
      FROM fm_order o
      JOIN fm_order_item i ON o.order_seq = i.order_seq
      JOIN fm_order_item_option oi ON i.item_seq = oi.item_seq
      JOIN fm_goods g ON i.goods_seq = g.goods_seq
      ${whereSql}
      GROUP BY DATE_FORMAT(o.regist_date, '%Y-%m')
      ORDER BY sale_month
      `,
      params,
    );

    return res.json({ items: rows });
  } catch (err) {
    console.error('GET /api/report/sales/month error:', err);
    res.status(500).json({ error: 'Failed to get month sales report' });
  }
});

/* ------------------------------------------------------------------ *
 * 4) 키워드 분석
 * GET /api/report/keywords/top?limit=50
 *
 * - fm_goods.goods_name / keyword / openmarket_keyword 를 긁어서
 *   공백/기본 구분자로 split → Node에서 단어 빈도 계산
 * - 아주 단순 버전 (한글 형태소분석 X)
 * ------------------------------------------------------------------ */
router.get("/keywords/top", async (req, res) => {
  try {
    const { limit = "50" } = req.query as Record<string, string>;

    // 상품명/키워드 모두 긁어오기 (필요하면 WHERE 조건 추가)
    const sql = `
      SELECT
        goods_name,
        keyword,
        openmarket_keyword
      FROM fm_goods
      WHERE goods_type = 'goods'
        AND goods_status = 'normal'
        AND goods_view = 'look'
    `;

    const [rows] = await pool.query<{
      goods_name: string | null;
      keyword: string | null;
      openmarket_keyword: string | null;
    }[]>(sql);

    const freq = new Map<string, number>();

    // 간단한 토큰화 함수
    const tokenize = (text: string) => {
      // 공백 + 특수문자 기준으로 split
      return text
        .replace(/[\[\]\(\)\{\},\.!?/\\\-\+_~"'`|:;]+/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 1); // 한 글자짜리는 일단 제외
    };

    // 불용어(빼고 싶은 단어들) — 필요시 추가
    const stopwords = new Set<string>([
      "무료배송",
      "세트",
      "묶음",
      "증정",
      "사은품",
      "정품",
      "국내배송",
      "배송",
      "당일",
      "원스톱도매"
    ]);

    for (const row of rows) {
      const texts = [
        row.goods_name || "",
        row.keyword || "",
        row.openmarket_keyword || ""
      ];

      for (const t of texts) {
        const tokens = tokenize(t);
        for (const token of tokens) {
          const key = token.toLowerCase(); // 대소문자 통일
          if (stopwords.has(key)) continue;
          freq.set(key, (freq.get(key) || 0) + 1);
        }
      }
    }

    // Map → 배열로 변환 후 정렬
    const sorted = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(limit))
      .map(([word, count]) => ({ word, count }));

    res.json({
      totalDistinctWords: freq.size,
      top: sorted
    });
  } catch (err) {
    console.error("GET /api/report/keywords/top error:", err);
    res
      .status(500)
      .json({ message: "키워드 분석 중 오류가 발생했습니다." });
  }
});

/**
 * 🔥 최근 30일 판매 상위 상품 TOP N
 * GET /api/report/sales/top-products?limit=10
 */
router.get("/sales/top-products", async (req: Request, res: Response) => {
  try {
    const limitRaw = (req.query.limit as string) || "10";
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 100);

    const providerSeqRaw = (req.query.providerSeq ?? req.query.provider_seq) as
      | string
      | undefined;
    const providerSeq =
      providerSeqRaw && providerSeqRaw.trim() !== ""
        ? Number(providerSeqRaw)
        : null;

    // ✅ 기간: startDate/endDate 우선, 없으면 최근 30일
    const startQ = typeof req.query.startDate === "string" ? req.query.startDate.trim() : "";
    const endQ = typeof req.query.endDate === "string" ? req.query.endDate.trim() : "";

    let start: string;
    let end: string;

    if (startQ && endQ) {
      start = `${startQ} 00:00:00`;
      end = `${endQ} 23:59:59`;
    } else {
      const endDt = new Date();
      const startDt = new Date();
      startDt.setDate(endDt.getDate() - 30);

      start = `${startDt.toISOString().slice(0, 10)} 00:00:00`;
      end = `${endDt.toISOString().slice(0, 10)} 23:59:59`;
    }

    const whereClauses: string[] = [
      "o.regist_date >= ?",
      "o.regist_date <= ?",
      // 필요하면 입금완료만:
      // "o.deposit_yn='y'",
    ];
    const params: any[] = [start, end];

    // ✅ providerSeq 필터: '주문옵션 입점사' 기준으로 거는 게 보통 정확함
    // (고도몰 구조상 주문 데이터에서 입점사/공급사가 oi.provider_seq에 찍히는 경우가 많음)
    if (providerSeq) {
      whereClauses.push("oi.provider_seq = ?");
      params.push(providerSeq);
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    console.log("[TOP-PRODUCTS] query=", req.query);
    console.log("[TOP-PRODUCTS] start/end=", start, end);
    console.log("[TOP-PRODUCTS] whereSql=", whereSql);
    console.log("[TOP-PRODUCTS] params=", params);

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        i.goods_seq,
        g.goods_code,
        g.goods_name,

        -- 상품 마스터의 공급사(참고용)
        g.provider_seq AS goods_provider_seq,
        IFNULL(p.provider_name, CONCAT('공급사 ', g.provider_seq)) AS goods_provider_name,

        -- 주문옵션에 찍힌 입점사(필터 기준/표시용)
        oi.provider_seq AS order_provider_seq,

        SUM(oi.ea) AS total_ea,
        SUM(oi.price * oi.ea) AS gross_sales
      FROM fm_order o
      JOIN fm_order_item i
        ON o.order_seq = i.order_seq
      JOIN fm_order_item_option oi
        ON i.item_seq = oi.item_seq
      JOIN fm_goods g
        ON i.goods_seq = g.goods_seq
      LEFT JOIN fm_provider p
        ON g.provider_seq = p.provider_seq
      ${whereSql}
      GROUP BY
        i.goods_seq, g.goods_code, g.goods_name,
        goods_provider_seq, goods_provider_name,
        order_provider_seq
      ORDER BY gross_sales DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    res.json({ items: rows });
  } catch (err) {
    console.error("GET /api/report/sales/top-products error:", err);
    res.status(500).json({ message: "top-products 조회 중 오류가 발생했습니다." });
  }
});


export default router;
