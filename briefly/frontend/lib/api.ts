import axios from 'axios'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8001'
const NOTES_URL = process.env.NEXT_PUBLIC_NOTES_URL || 'http://localhost:8002'
const TASKS_URL = process.env.NEXT_PUBLIC_TASKS_URL || 'http://localhost:8003'
const PLANNER_URL = process.env.NEXT_PUBLIC_PLANNER_URL || 'http://localhost:8004'
const KANBAN_URL = process.env.NEXT_PUBLIC_KANBAN_URL || 'http://localhost:8005'
const COLLAB_WS = process.env.NEXT_PUBLIC_COLLABORATION_WS || 'ws://localhost:8006'

function createClient(baseURL: string) {
  const client = axios.create({ baseURL })

  client.interceptors.request.use(config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('briefly_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  client.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('briefly_token')
        localStorage.removeItem('briefly_user')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )

  return client
}

export const authApi = createClient(AUTH_URL)
export const notesApi = createClient(NOTES_URL)
export const tasksApi = createClient(TASKS_URL)
export const plannerApi = createClient(PLANNER_URL)
export const kanbanApi = createClient(KANBAN_URL)
export const COLLAB_WS_URL = COLLAB_WS

export default createClient
