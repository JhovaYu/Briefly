'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { tasksApi, plannerApi } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'es': es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface Task {
  id: string
  title: string
  description: string
  due_date: string | null
  completed: boolean
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  source: string
  source_id: string | null
}

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [taskError, setTaskError] = useState('')
  const [calView, setCalView] = useState<View>('month')
  const [calDate, setCalDate] = useState(new Date())

  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)

  const { addToast } = useToast()
  const { confirm, dialog } = useConfirm()

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true)
      setTaskError('')
      const res = await tasksApi.get('/tasks')
      setTasks(res.data)
    } catch {
      setTaskError('No se pudieron cargar las tareas.')
    } finally {
      setLoadingTasks(false)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true)
      const res = await plannerApi.get('/events')
      setEvents(res.data)
    } catch {
      // Silent fail for calendar
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchEvents()
  }, [fetchTasks, fetchEvents])

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const payload: any = { title: newTitle, description: newDesc }
      if (newDate) payload.due_date = new Date(newDate).toISOString()
      const res = await tasksApi.post('/tasks', payload)
      setTasks(prev => [res.data, ...prev])
      setNewTitle('')
      setNewDesc('')
      setNewDate('')
      addToast('Tarea creada', 'success')
      // Refetch events to pick up the synced event
      fetchEvents()
    } catch {
      addToast('Error al crear la tarea', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleComplete = async (task: Task) => {
    try {
      const res = await tasksApi.patch(`/tasks/${task.id}/complete`)
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t))
    } catch {
      addToast('Error al actualizar tarea', 'error')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm('Eliminar tarea', '¿Estás seguro de eliminar esta tarea?')
    if (!confirmed) return
    try {
      await tasksApi.delete(`/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      addToast('Tarea eliminada', 'success')
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: new Date(e.date),
    end: new Date(e.date),
    allDay: true,
    resource: e,
  }))

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    } catch { return '' }
  }

  return (
    <>
      {dialog}
      <div className="tasks-layout">
        {/* Task Panel */}
        <div className="tasks-panel">
          <div className="tasks-panel-header">
            <h3>Tareas ({tasks.length})</h3>
          </div>

          <form className="task-form" onSubmit={handleCreateTask}>
            <input
              type="text"
              className="form-input"
              placeholder="Nueva tarea..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
            <div className="task-form-row">
              <input
                type="text"
                className="form-input"
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="date"
                className="form-input"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{ width: '160px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
              {creating ? 'Creando...' : '+ Agregar tarea'}
            </button>
          </form>

          {loadingTasks ? (
            <div style={{ padding: '16px' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" />)}
            </div>
          ) : taskError ? (
            <div className="error-state">
              <div className="icon">⚠️</div>
              <h3>Error</h3>
              <p>{taskError}</p>
              <button className="btn btn-primary btn-sm" onClick={fetchTasks}>Reintentar</button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>Sin tareas</h3>
              <p>Crea tu primera tarea usando el formulario de arriba.</p>
            </div>
          ) : (
            <div style={{ overflow: 'auto', flex: 1 }}>
              {tasks.map(task => (
                <div key={task.id} className="task-item">
                  <button
                    className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                    onClick={() => handleToggleComplete(task)}
                  >
                    {task.completed && '✓'}
                  </button>
                  <div className="task-info">
                    <h4 className={task.completed ? 'completed' : ''}>{task.title}</h4>
                    <div className="task-meta">
                      {task.description && <span>{task.description.slice(0, 60)}</span>}
                      {task.due_date && (
                        <span className="task-date">📅 {formatDate(task.due_date)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn-icon task-delete"
                    onClick={() => handleDeleteTask(task.id)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Panel */}
        <div className="calendar-panel">
          {loadingEvents ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={calView}
              onView={setCalView}
              date={calDate}
              onNavigate={setCalDate}
              style={{ flex: 1, minHeight: 400 }}
              messages={{
                today: 'Hoy',
                previous: '←',
                next: '→',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                noEventsInRange: 'No hay eventos en este rango.',
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}
