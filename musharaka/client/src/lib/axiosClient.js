import axios from 'axios'
import { supabase } from './supabaseClient'
import { devApiCall } from './devApi'

const IS_DEV = !import.meta.env.VITE_SUPABASE_URL ||
               import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(async config => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
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
