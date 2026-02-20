// src/api/dashboard.js
import api from './index'

/**
 * 최근 N일의 날짜 범위 구하기 (YYYY-MM-DD)
 * 예: days = 30이면, 오늘 포함 최근 30일
 */
const getLastNDaysRange = (days = 90) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))

  const fmt = (d) => d.toISOString().slice(0, 10) // YYYY-MM-DD
  return {
    startDate: fmt(start),
    endDate: fmt(end),
  }
}

/* ================= 유저 대시보드 ================= */

export const fetchUserSalesDaily = () =>
  api.get('/report/sales/daily', { params: { scope: 'self' } })

// 👇 아직 “내가 많이 산 상품”용 API는 안 만들어졌으니
// 일단 남겨두거나 나중에 /sales/top-products 를 회원 기준으로 분기해서 쓰면 됨
export const fetchUserTopProducts = () =>
  api.get('/report/sales/top-products', {
    params: {
      scope: 'self',
      limit: 10,
      // startDate, endDate는 나중에 self용 라우터 만들 때 붙여도 됨
    },
  })

export const fetchUserTodayOrders = () =>
  api.get('/report/orders/today', { params: { scope: 'self' } })

/* ================= 관리자 대시보드 ================= */

export const fetchAdminSalesDaily = (params) =>
  api.get('/report/sales/daily', { params: { scope: 'all', ...params } })

export const fetchAdminSalesMonth = (params) =>
  api.get('/report/sales/month', { params: { scope: 'all', ...params } })

export const fetchProviders = (params) => api.get('/providers', { params })

/**
 * 관리자용 최근 N일 TOP 상품 (기본 30일)
 * 백엔드가 startDate, endDate 필수로 요구하므로 여기서 붙여준다.
 */
export const fetchAdminTopProducts = (params) =>
  api.get('/report/sales/top-products', { params: { scope: 'all', ...params } })

export const fetchLowStock = (params) => api.get('/stock/alerts', { params })

export const fetchAdminSalesDailyByProvider = ({ startDate, endDate, providerSeq }) =>
  api.get('/report/sales/daily', { params: { startDate, endDate, providerSeq } })
