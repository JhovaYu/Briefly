'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { plannerApi } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addWeeks, subWeeks, startOfWeek as soW, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  IoAddOutline,
  IoTimeOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoCloseOutline,
  IoTrashOutline,
} from 'react-icons/io5'

const locales = { es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface PlannerEvent {
  id: string
  title: string
  description?: string
  date: string
  source: string
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7am–9pm

const SLOT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
]

const MESSAGES = {
  today: 'Hoy', previous: '←', next: '→',
  month: 'Mes', week: 'Semana', day: 'Día',
  noEventsInRange: 'Sin clases esta semana.',
  showMore: (n: number) => `+${n} más`,
}

function formatHour(h: number) {
  return `${h === 12 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`
}

export default function HorarioPage() {
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekBase, setWeekBase] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null)
  const [form, setForm] = useState({ title: '', description: '', dayOfWeek: '1', hour: '08', minute: '00' })

  const { addToast } = useToast()
  const { confirm, dialog } = useConfirm()

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await plannerApi.get('/events')
      setEvents(res.data || [])
    } catch {
      // service may not be running
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Build week dates (Mon-Sun)
  const weekStart = soW(weekBase, { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Filter events that fall within the current week
  const weekEvents = events.filter(e => {
    const d = new Date(e.date)
    return d >= weekDates[0] && d < addDays(weekDates[6], 1)
  })

  // Map events onto the grid
  function getEventsForSlot(dayIdx: number, hour: number) {
    const targetDate = weekDates[dayIdx]
    return weekEvents.filter(e => {
      const d = new Date(e.date)
      return (
        d.getDate() === targetDate.getDate() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getFullYear() === targetDate.getFullYear() &&
        d.getHours() === hour
      )
    })
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setCreating(true)
    try {
      // Place the event on the correct day of the current week
      const dayOffset = parseInt(form.dayOfWeek)
      const targetDate = addDays(weekStart, dayOffset)
      targetDate.setHours(parseInt(form.hour), parseInt(form.minute), 0, 0)
      const res = await plannerApi.post('/events', {
        title: form.title,
        description: form.description,
        date: targetDate.toISOString(),
      })
      setEvents(prev => [...prev, res.data])
      setForm({ title: '', description: '', dayOfWeek: '1', hour: '08', minute: '00' })
      setShowForm(false)
      addToast('Clase agregada', 'success')
    } catch {
      addToast('Error al crear la clase', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm('Eliminar clase', '¿Eliminar esta clase del horario?')
    if (!ok) return
    try {
      await plannerApi.delete(`/events/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      addToast('Clase eliminada', 'success')
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  const weekLabel = `${format(weekDates[0], 'd MMM', { locale: es })} – ${format(weekDates[6], 'd MMM yyyy', { locale: es })}`

  return (
    <>
      {dialog}

      <div className="hor-page">
        {/* Header */}
        <div className="hor-header">
          <div className="hor-header-left">
            <IoTimeOutline size={22} />
            <h1 className="hor-title">Horario</h1>
          </div>
          <div className="hor-nav">
            <button className="btn btn-secondary btn-sm hor-nav-btn" onClick={() => setWeekBase(w => subWeeks(w, 1))}>
              <IoChevronBackOutline size={16} />
            </button>
            <span className="hor-week-label">{weekLabel}</span>
            <button className="btn btn-secondary btn-sm hor-nav-btn" onClick={() => setWeekBase(w => addWeeks(w, 1))}>
              <IoChevronForwardOutline size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekBase(new Date())}>
              Hoy
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IoAddOutline size={18} />
            Agregar clase
          </button>
        </div>

        {/* Timetable grid */}
        {loading ? (
          <div className="loading-center" style={{ flex: 1 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="hor-grid-wrap">
            <div className="hor-grid">
              {/* Column headers */}
              <div className="hor-time-col" />
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString()
                return (
                  <div key={i} className={`hor-day-header ${isToday ? 'hor-today' : ''}`}>
                    <span className="hor-day-name">{DAYS[i]}</span>
                    <span className="hor-day-num">{d.getDate()}</span>
                  </div>
                )
              })}

              {/* Time slots */}
              {HOURS.map(hour => (
                <>
                  <div key={`h-${hour}`} className="hor-hour-label">
                    {formatHour(hour)}
                  </div>
                  {weekDates.map((_, dayIdx) => {
                    const slotEvents = getEventsForSlot(dayIdx, hour)
                    return (
                      <div key={`${dayIdx}-${hour}`} className="hor-slot">
                        {slotEvents.map((ev, i) => (
                          <button
                            key={ev.id}
                            className="hor-event"
                            style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }}
                            onClick={() => setSelectedEvent(ev)}
                          >
                            {ev.title}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>

            {weekEvents.length === 0 && (
              <div className="hor-empty">
                <IoTimeOutline size={40} />
                <p>No hay clases esta semana.</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                  Agregar clase
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New class modal */}
      {showForm && (
        <div className="cal-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h3>Agregar clase</h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}>
                <IoCloseOutline size={20} />
              </button>
            </div>
            <form className="cal-modal-form" onSubmit={handleCreate}>
              <input
                className="form-input"
                placeholder="Nombre de la materia"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
              <input
                className="form-input"
                placeholder="Descripción (ej. Aula 301, Prof. García)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="cal-modal-row">
                <select
                  className="form-input"
                  value={form.dayOfWeek}
                  onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                  style={{ flex: 1 }}
                >
                  {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
                </select>
                <input
                  type="time"
                  className="form-input"
                  value={`${form.hour}:${form.minute}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':')
                    setForm(f => ({ ...f, hour: h, minute: m }))
                  }}
                  style={{ width: 120 }}
                />
              </div>
              <div className="cal-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event detail */}
      {selectedEvent && (
        <div className="cal-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h3>{selectedEvent.title}</h3>
              <button className="btn-icon" onClick={() => setSelectedEvent(null)}>
                <IoCloseOutline size={20} />
              </button>
            </div>
            <div className="cal-event-detail">
              <p className="cal-event-date">
                🕐 {new Date(selectedEvent.date).toLocaleString('es-MX', {
                  weekday: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {selectedEvent.description && (
                <p className="cal-event-desc">{selectedEvent.description}</p>
              )}
            </div>
            {selectedEvent.source !== 'task' && (
              <div className="cal-modal-actions">
                <button className="btn btn-danger" onClick={() => handleDelete(selectedEvent.id)}>
                  <IoTrashOutline size={15} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
