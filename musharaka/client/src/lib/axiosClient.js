import axios from 'axios'

export const TOKEN_KEY = 'musharaka_access_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
  withCredentials: true,   // send httpOnly refresh_token cookie
})

// Attach access token before every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config || {}

    // ── 401: try to refresh once via httpOnly cookie, then retry ─────────────
    if (err.response?.status === 401 && !config._sessionRefreshed) {
      config._sessionRefreshed = true
      try {
        const base = api.defaults.baseURL
        const { data } = await axios.post(`${base}/auth/refresh`, {}, {
          withCredentials: true,
          timeout: 10000,
        })
        if (data.accessToken) {
          localStorage.setItem(TOKEN_KEY, data.accessToken)
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(config)
        }
      } catch { /* refresh failed — fall through to login redirect */ }
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // ── Network error / server timeout: retry once after a short pause ────────
    if (!config._retried && (err.code === 'ECONNABORTED' || !err.response)) {
      config._retried = true
      await new Promise(r => setTimeout(r, 1500))
      return api(config)
    }

    return Promise.reject(err)
  }
)

export default api
