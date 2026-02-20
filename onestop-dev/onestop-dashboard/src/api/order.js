// src/api/order.js
import api from './index'

export const fetchOrderProducts = (params = {}) => api.get('/orders/products', { params })
export const submitOrder = (payload) => api.post('/orders', payload)

export const fetchOrders = (params = {}) => api.get('/orders', { params })
export const fetchOrderDetail = (orderId) => api.get(`/orders/${orderId}`)