// src/api/adminStock.js
import api from "@/api"; // ✅ baseURL=/api 적용되는 인스턴스

export function fetchAdminStockList(params = {}) {
  const mapped = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    provider_seq: params.providerSeq || "",
    keyword: params.keyword || "",
    period: params.period ?? 30,
  };
  return api.get("/stock/list", { params: mapped }); // ✅ 결과적으로 /api/stock/list
}

export function fetchLowStockList(params = {}) {
  const mapped = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    provider_seq: params.providerSeq || "",
    keyword: params.keyword || "",
    period: params.period ?? 30,
  };
  return api.get("/stock/low", { params: mapped });
}

export async function downloadOrderSheetExcel(payload) {
  return api.post("/admin/stock/ordersheet/excel", payload, { responseType: "blob" });
}

export function fetchStockOptions(params = {}) {
  const mapped = {
    goods_seq: params.goods_seq ?? params.goodsSeq ?? "", // ✅ 둘 다 지원
    period: params.period ?? 30,
  };
  return api.get("/stock/options", { params: mapped });
}
