import api from './index'

// /api/goods/admin/products 로 호출 (api baseURL에 따라 prefix 자동)
export const fetchAdminProducts = (params) =>
  api.get('/goods/admin/products', { params })
