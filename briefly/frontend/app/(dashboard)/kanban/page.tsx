'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { kanbanApi, COLLAB_WS_URL } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Card {
  id: string
  title: string
  description: string
  column: string
  assignee_id: string | null
  board_id: string
}

interface Board {
  id: string
  title: string
  cards?: Card[]
}

const COLUMNS = ['Por hacer', 'En progreso', 'Revisión', 'Completado']
const COLUMN_COLORS: Record<string, string> = {
  'Por hacer': '#94a3b8',
  'En progreso': '#6366f1',
  'Revisión': '#f59e0b',
  'Completado': '#10b981',
}

function KanbanCard({ card, onDelete }: { card: Card; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <h4>{card.title}</h4>
      {card.description && <p>{card.description}</p>}
      <div className="card-footer">
        <span />
        <button
          className="btn-icon btn-sm"
          style={{ fontSize: '0.7rem', opacity: 0.5 }}
          onClick={(e) => { e.stopPropagation(); onDelete(card.id) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [boardDetail, setBoardDetail] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [addingCard, setAddingCard] = useState<string | null>(null) // column name
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardDesc, setNewCardDesc] = useState('')
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)

  const { addToast } = useToast()
  const { confirm, dialog } = useConfirm()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await kanbanApi.get('/boards')
      setBoards(res.data)
      if (res.data.length > 0 && !selectedBoardId) {
        setSelectedBoardId(res.data[0].id)
      }
    } catch {
      setError('No se pudieron cargar los tableros.')
    } finally {
      setLoading(false)
    }
  }, [selectedBoardId])

  const fetchBoardDetail = useCallback(async () => {
    if (!selectedBoardId) return
    try {
      const res = await kanbanApi.get(`/boards/${selectedBoardId}`)
      setBoardDetail(res.data)
    } catch {
      addToast('Error al cargar el tablero', 'error')
    }
  }, [selectedBoardId, addToast])

  useEffect(() => {
    fetchBoards()
  }, [])

  useEffect(() => {
    if (selectedBoardId) {
      fetchBoardDetail()

      // Connect WebSocket for real-time updates
      try {
        const ws = new WebSocket(`${COLLAB_WS_URL}/ws/board-${selectedBoardId}`)
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data))
            if (data.type === 'card_moved') {
              setBoardDetail(prev => {
                if (!prev?.cards) return prev
                return {
                  ...prev,
                  cards: prev.cards.map(c =>
                    c.id === data.card_id ? { ...c, column: data.column } : c
                  ),
                }
              })
            }
          } catch {}
        }
        setWsConnection(ws)
        return () => ws.close()
      } catch {}
    }
  }, [selectedBoardId])

  const handleCreateBoard = async () => {
    const title = prompt('Nombre del tablero:')
    if (!title?.trim()) return
    try {
      const res = await kanbanApi.post('/boards', { title })
      setBoards(prev => [res.data, ...prev])
      setSelectedBoardId(res.data.id)
      addToast('Tablero creado', 'success')
    } catch {
      addToast('Error al crear tablero', 'error')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as Card
    setActiveCard(card || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId = active.id as string
    const card = boardDetail?.cards?.find(c => c.id === cardId)
    if (!card) return

    // Determine target column - the over target could be a card or a column droppable
    let targetColumn: string | null = null

    // Check if dropped over another card
    const overCard = boardDetail?.cards?.find(c => c.id === over.id)
    if (overCard) {
      targetColumn = overCard.column
    } else if (COLUMNS.includes(over.id as string)) {
      targetColumn = over.id as string
    }

    if (!targetColumn || targetColumn === card.column) return

    // Optimistic update
    setBoardDetail(prev => {
      if (!prev?.cards) return prev
      return {
        ...prev,
        cards: prev.cards.map(c =>
          c.id === cardId ? { ...c, column: targetColumn! } : c
        ),
      }
    })

    try {
      await kanbanApi.patch(`/cards/${cardId}/move`, { column: targetColumn })
    } catch {
      // Revert on failure
      fetchBoardDetail()
      addToast('Error al mover tarjeta', 'error')
    }
  }

  const handleAddCard = async (column: string) => {
    if (!newCardTitle.trim() || !selectedBoardId) return
    try {
      const res = await kanbanApi.post(`/boards/${selectedBoardId}/cards`, {
        title: newCardTitle,
        description: newCardDesc,
        column,
      })
      setBoardDetail(prev => {
        if (!prev) return prev
        return { ...prev, cards: [...(prev.cards || []), res.data] }
      })
      setNewCardTitle('')
      setNewCardDesc('')
      setAddingCard(null)
      addToast('Tarjeta creada', 'success')
    } catch {
      addToast('Error al crear tarjeta', 'error')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    const confirmed = await confirm('Eliminar tarjeta', '¿Eliminar esta tarjeta del tablero?')
    if (!confirmed) return
    try {
      await kanbanApi.delete(`/cards/${cardId}`)
      setBoardDetail(prev => {
        if (!prev?.cards) return prev
        return { ...prev, cards: prev.cards.filter(c => c.id !== cardId) }
      })
      addToast('Tarjeta eliminada', 'success')
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="kanban-header">
          <div className="skeleton skeleton-title" style={{ width: 200 }} />
        </div>
        <div className="kanban-columns">
          {COLUMNS.map(col => (
            <div key={col} className="kanban-column">
              <div className="kanban-column-header"><h3>{col}</h3></div>
              <div className="kanban-cards">
                {[1, 2].map(i => <div key={i} className="skeleton skeleton-card" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="icon">⚠️</div>
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={fetchBoards}>Reintentar</button>
      </div>
    )
  }

  if (boards.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <h3>Sin tableros</h3>
        <p>Crea tu primer tablero Kanban para organizar tu trabajo visualmente.</p>
        <button className="btn btn-primary" onClick={handleCreateBoard}>Crear tablero</button>
      </div>
    )
  }

  const cards = boardDetail?.cards || []

  return (
    <>
      {dialog}
      <div className="kanban-header">
        <div className="board-selector">
          <select
            value={selectedBoardId || ''}
            onChange={e => setSelectedBoardId(e.target.value)}
          >
            {boards.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleCreateBoard}>+ Nuevo tablero</button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-columns">
          {COLUMNS.map(column => {
            const columnCards = cards.filter(c => c.column === column)
            return (
              <div key={column} className="kanban-column">
                <div className="kanban-column-header">
                  <h3>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: COLUMN_COLORS[column],
                      display: 'inline-block',
                    }} />
                    {column}
                    <span className="column-count">{columnCards.length}</span>
                  </h3>
                </div>
                <div className="kanban-cards" id={column}>
                  {columnCards.map(card => (
                    <KanbanCard key={card.id} card={card} onDelete={handleDeleteCard} />
                  ))}

                  {addingCard === column ? (
                    <div className="add-card-form">
                      <input
                        type="text"
                        placeholder="Título"
                        value={newCardTitle}
                        onChange={e => setNewCardTitle(e.target.value)}
                        autoFocus
                      />
                      <textarea
                        placeholder="Descripción (opcional)"
                        value={newCardDesc}
                        onChange={e => setNewCardDesc(e.target.value)}
                        rows={2}
                      />
                      <div className="form-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleAddCard(column)}>
                          Agregar
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setAddingCard(null); setNewCardTitle(''); setNewCardDesc('') }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="kanban-add-card" onClick={() => setAddingCard(column)}>
                      + Agregar tarjeta
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="kanban-card" style={{ transform: 'rotate(4deg)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <h4>{activeCard.title}</h4>
              {activeCard.description && <p>{activeCard.description}</p>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  )
}
