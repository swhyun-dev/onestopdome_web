import path from "path";
import express from "express";
import dotenv from "dotenv";
import { pool } from "./db";

import purchaseRouter from "./routes/purchase";
import goodsRouter from "./routes/goods";
import membersRouter from "./routes/members";
import ordersRouter from "./routes/orders";
import dashboardRouter from "./routes/dashboard";
import stockRouter from "./routes/stock";
import reportRouter from "./routes/report";
import marginRoutes from "./routes/margin";
import providersRouter from "./routes/providers";
import adminStockRouter from "./routes/adminStock";


dotenv.config();

const app = express();

// body-parser 대체 (express 내장 기능)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows });
  } catch (err) {
    res.status(500).json({ status: "error", message: "DB 연결 실패" });
  }
});

// 라우터
app.use("/api/dashboard", dashboardRouter);
app.use("/api/stock", stockRouter);
app.use("/api/goods", goodsRouter);
app.use("/api/members", membersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/report", reportRouter);
app.use("/api/purchase", purchaseRouter);
app.use("/api/margin", marginRoutes);
app.use("/api/providers", providersRouter);
app.use("/api/admin/stock", adminStockRouter);
app.use(express.static(path.join(__dirname, "../public")));

app.listen(process.env.PORT || 3000, () => {
  console.log("API server started");
});
