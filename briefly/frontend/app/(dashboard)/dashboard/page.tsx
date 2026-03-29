'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notesApi, tasksApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  IoFolderOutline,
  IoChevronForwardOutline,
  IoChevronDownOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoCheckmarkDoneOutline,
  IoSchoolOutline,
  IoCodeSlashOutline,
  IoBookOutline,
  IoLayersOutline,
} from 'react-icons/io5'

// ─── Types ───────────────────────────────────────

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
  group?: string
}

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  completed: boolean
  subject?: string
}

interface Group {
  name: string
  count: number
  expanded: boolean
}

// ─── Helpers ─────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = name?.split(' ')[0] || ''
  return `${saludo}, ${firstName}...`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Modificado hace ${mins} minutos`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Modificado hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`
  return `Modificado hace ${Math.floor(hrs / 24)} días`
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Vencido'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `EN ${mins} MINUTOS`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `EN ${hrs}:${String(Math.floor((mins % 60))).padStart(2, '0')} HORAS`
  return `EN ${Math.floor(hrs / 24)} DÍAS`
}

// Card icons/colors rotated by index
const CARD_STYLES = [
  { bg: '#312e81', icon: IoSchoolOutline,    iconColor: '#818cf8' },
  { bg: '#1e3a5f', icon: IoCodeSlashOutline, iconColor: '#60a5fa' },
  { bg: '#064e3b', icon: IoCheckmarkDoneOutline, iconColor: '#34d399' },
  { bg: '#4c1d95', icon: IoBookOutline,      iconColor: '#a78bfa' },
  { bg: '#7c2d12', icon: IoLayersOutline,    iconColor: '#fb923c' },
]

// ─── Component ────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [notesRes, tasksRes] = await Promise.allSettled([
          notesApi.get('/notes'),
          tasksApi.get('/tasks'),
        ])

        let fetchedNotes: Note[] = []
        if (notesRes.status === 'fulfilled') {
          fetchedNotes = notesRes.value.data || []
          setNotes(fetchedNotes)
        }

        if (tasksRes.status === 'fulfilled') {
          setTasks((tasksRes.value.data || []).filter((t: Task) => !t.completed))
        }

        // Build groups from notes
        const groupMap: Record<string, number> = {}
        fetchedNotes.forEach(n => {
          const g = n.group || 'General'
          groupMap[g] = (groupMap[g] || 0) + 1
        })
        setGroups(
          Object.entries(groupMap).map(([name, count]) => ({ name, count, expanded: false }))
        )
      } catch {
        // graceful — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleGroup = (i: number) =>
    setGroups(prev => prev.map((g, idx) => idx === i ? { ...g, expanded: !g.expanded } : g))

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const pendingTasks = tasks.slice(0, 6)

  return (
    <div className="dash-root">
      {/* ── Title ── */}
      <div className="dash-hero">
        <h1 className="dash-title">Mi espacio de trabajo</h1>
        <p className="dash-subtitle">{user?.name ? getGreeting(user.name) : ''}</p>
      </div>

      {/* ── Body ── */}
      <div className="dash-body">
        {/* Left column */}
        <div className="dash-left">
          {/* Mis grupos */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Mis grupos</h2>
              <button
                className="dash-expand-all"
                onClick={() => setGroups(prev => prev.map(g => ({ ...g, expanded: true })))}
              >
                Expand all
              </button>
            </div>

            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 8 }} />
              ))
            ) : groups.length === 0 ? (
              <div className="dash-empty">
                <IoFolderOutline size={32} />
                <p>No hay grupos todavía.<br />Crea una nota para empezar.</p>
                <button className="btn btn-primary" onClick={() => router.push('/notas')}>
                  Nueva nota
                </button>
              </div>
            ) : (
              <div className="dash-group-list">
                {groups.map((g, i) => (
                  <button
                    key={g.name}
                    className="dash-group-row"
                    onClick={() => toggleGroup(i)}
                  >
                    {g.expanded
                      ? <IoChevronDownOutline size={15} className="dash-group-arrow" />
                      : <IoChevronForwardOutline size={15} className="dash-group-arrow" />
                    }
                    <IoFolderOutline size={18} className="dash-group-icon" />
                    <span className="dash-group-name">{g.name}</span>
                    <span className="dash-group-badge">{g.count} NOTAS</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Notas recientes */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">
                <IoTimeOutline size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Notas recientes
              </h2>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
              ))
            ) : recentNotes.length === 0 ? (
              <p className="dash-empty-text">Sin notas recientes</p>
            ) : (
              <div className="dash-recent-list">
                {recentNotes.map(note => (
                  <button
                    key={note.id}
                    className="dash-recent-row"
                    onClick={() => router.push('/notas')}
                  >
                    <IoDocumentTextOutline size={16} className="dash-recent-icon" />
                    <div className="dash-recent-info">
                      <span className="dash-recent-title">{note.title || 'Sin título'}</span>
                      <span className="dash-recent-time">{timeAgo(note.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column — Pendientes */}
        <div className="dash-right">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Pendientes</h2>
          </div>

          {loading ? (
            <div className="dash-cards-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
              ))}
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="dash-empty">
              <IoCheckmarkDoneOutline size={36} />
              <p>¡Todo al día! No tienes tareas pendientes.</p>
              <button className="btn btn-primary" onClick={() => router.push('/tareas')}>
                Ver tareas
              </button>
            </div>
          ) : (
            <div className="dash-cards-grid">
              {pendingTasks.map((task, i) => {
                const style = CARD_STYLES[i % CARD_STYLES.length]
                const CardIcon = style.icon
                return (
                  <button
                    key={task.id}
                    className="dash-card"
                    onClick={() => router.push('/tareas')}
                  >
                    <div className="dash-card-icon-wrap" style={{ background: style.bg }}>
                      <CardIcon size={20} color={style.iconColor} />
                    </div>
                    <h3 className="dash-card-title">{task.title}</h3>
                    {task.description && (
                      <p className="dash-card-desc">{task.description}</p>
                    )}
                    {task.due_date && (
                      <div className="dash-card-time">
                        <IoTimeOutline size={13} />
                        <span>{timeUntil(task.due_date)}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
