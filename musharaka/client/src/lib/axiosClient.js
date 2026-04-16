import axios from 'axios'
import { supabase } from './supabaseClient'
import { devApiCall } from './devApi'

const IS_DEV = !import.meta.env.VITE_SUPABASE_URL ||
               import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
})

// Attach fresh token before every request
api.interceptors.request.use(async config => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config || {}

    // ── 401: try to refresh the session once, then retry the request ──────────
    if (err.response?.status === 401 && !config._sessionRefreshed) {
      config._sessionRefreshed = true
      try {
        const { data: { session } } = await supabase.auth.refreshSession()
        if (session?.access_token) {
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${session.access_token}`
          return api(config)   // transparent retry with fresh token
        }
      } catch { /* refresh failed — fall through to login redirect */ }
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // ── Network error / server timeout: retry once after a short pause ────────
    if (!config._retried && (err.code === 'ECONNABORTED' || !err.response)) {
      config._retried = true
      await new Promise(r => setTimeout(r, 1500))
      return api(config)   // transparent single retry
    }

    return Promise.reject(err)
  }
)

// In dev mode, intercept all requests and handle locally
async function callDev(method, url, data) {
  const result = await devApiCall(method, url, data)
  if (result.status >= 400) {
    const error = new Error(result.data?.error || 'خطأ')
    error.response = { status: result.status, data: result.data }
    throw error
  }
  return { data: result.data, status: result.status }
}

const devAdapter = {
  get:    (url, config)       => callDev('get',    url, null),
  post:   (url, data, config) => callDev('post',   url, data),
  put:    (url, data, config) => callDev('put',    url, data),
  delete: (url, config)       => callDev('delete', url, null),
}

export default IS_DEV ? devAdapter : api
