import axios from 'axios'
import { getToken } from './auth'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // optional: redirect to login
      if (!location.hash.includes('#/login')) location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)
