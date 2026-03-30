'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { plannerApi } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  IoAddOutline,
  IoCalendarOutline,
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

interface NewEventForm {
  title: string
  description: string
  date: string
  time: string
}

const MESSAGES = {
  today: 'Hoy', previous: '←', next: '→',
  month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda',
  noEventsInRange: 'No hay eventos en este rango.',
  showMore: (n: number) => `+${n} más`,
}

export default function CalendarioPage() {
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null)
  const [form, setForm] = useState<NewEventForm>({ title: '', description: '', date: '', time: '09:00' })

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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    setCreating(true)
    try {
      const dateTime = form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(form.date).toISOString()
      const res = await plannerApi.post('/events', {
        title: form.title,
        description: form.description,
        date: dateTime,
      })
      setEvents(prev => [...prev, res.data])
      setForm({ title: '', description: '', date: '', time: '09:00' })
      setShowForm(false)
      addToast('Evento creado', 'success')
    } catch {
      addToast('Error al crear el evento', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm('Eliminar evento', '¿Seguro que deseas eliminar este evento?')
    if (!ok) return
    try {
      await plannerApi.delete(`/events/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      addToast('Evento eliminado', 'success')
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  const calEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: new Date(e.date),
    end: new Date(e.date),
    allDay: true,
    resource: e,
  }))

  const handleSelectEvent = (ev: any) => setSelectedEvent(ev.resource as PlannerEvent)

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const y = start.getFullYear()
    const m = String(start.getMonth() + 1).padStart(2, '0')
    const d = String(start.getDate()).padStart(2, '0')
    setForm(f => ({ ...f, date: `${y}-${m}-${d}` }))
    setShowForm(true)
  }

  return (
    <>
      {dialog}

      <div className="cal-page">
        {/* Header */}
        <div className="cal-header">
          <div className="cal-header-left">
            <IoCalendarOutline size={22} />
            <h1 className="cal-title">Calendario</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IoAddOutline size={18} />
            Nuevo evento
          </button>
        </div>

        {/* Calendar */}
        <div className="cal-body">
          {loading ? (
            <div className="loading-center" style={{ flex: 1 }}>
              <div className="spinner" />
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              style={{ flex: 1 }}
              messages={MESSAGES}
            />
          )}
        </div>
      </div>

      {/* New event form modal */}
      {showForm && (
        <div className="cal-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <h3>Nuevo evento</h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}>
                <IoCloseOutline size={20} />
              </button>
            </div>
            <form className="cal-modal-form" onSubmit={handleCreate}>
              <input
                className="form-input"
                placeholder="Título del evento"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
              <input
                className="form-input"
                placeholder="Descripción (opcional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="cal-modal-row">
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  style={{ flex: 1 }}
                />
                <input
                  type="time"
                  className="form-input"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={{ width: 120 }}
                />
              </div>
              <div className="cal-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event detail popover */}
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
                📅 {new Date(selectedEvent.date).toLocaleDateString('es-MX', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
              {selectedEvent.description && (
                <p className="cal-event-desc">{selectedEvent.description}</p>
              )}
              <span className={`cal-event-badge ${selectedEvent.source === 'task' ? 'badge-task' : 'badge-manual'}`}>
                {selectedEvent.source === 'task' ? '📋 Desde tarea' : '📌 Manual'}
              </span>
            </div>
            {selectedEvent.source !== 'task' && (
              <div className="cal-modal-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(selectedEvent.id)}
                >
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
