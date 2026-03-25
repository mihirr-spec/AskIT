import axios from 'axios'
import { supabase } from './supabase'

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL : undefined) ||
  'http://localhost:8000'

const api = axios.create({ baseURL: API_URL })

// Auto-attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Documents
export const uploadDocument = (formData) =>
  api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export const ingestUrl = (url, name) =>
  api.post('/documents/ingest-url', { url, name })

export const processDocuments = () =>
  api.post('/documents/process')

export const processFile = (docId, formData) =>
  api.post(`/documents/process-file/${docId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export const getDocuments = () =>
  api.get('/documents')

// Query
export const runQuery = (query, includeHistory = true) =>
  api.post('/query', { query, include_history: includeHistory })

// Chat history
export const getChatHistory = (limit = 50) =>
  api.get(`/chat/history?limit=${limit}`)

// Health
export const getHealth = () =>
  api.get('/health')

export default api
