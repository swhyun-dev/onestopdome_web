// src/api/index.js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 필요하면 나중에 인터셉터 등 추가
// api.interceptors.request.use(...)

export default api
