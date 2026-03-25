'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { notesApi, COLLAB_WS_URL } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

// Dynamic TipTap imports (client-only)
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
}

export default function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const { addToast } = useToast()
  const { confirm, dialog } = useConfirm()

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
    onUpdate: ({ editor }) => {
      if (!selectedNote) return
      setSaveStatus('idle')

      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          const content = editor.getHTML()
          await notesApi.put(`/notes/${selectedNote.id}`, {
            content,
            title: selectedNote.title,
          })
          setSaveStatus('saved')
          // Update local state
          setNotes(prev => prev.map(n =>
            n.id === selectedNote.id ? { ...n, content, updated_at: new Date().toISOString() } : n
          ))
        } catch {
          setSaveStatus('idle')
          addToast('Error al guardar la nota', 'error')
        }
      }, 2000)
    },
  })

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await notesApi.get('/notes')
      setNotes(res.data)
    } catch (err) {
      setError('No se pudieron cargar las notas. Verifica que el backend esté activo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note)
    editor?.commands.setContent(note.content || '<p></p>')
    setSaveStatus('idle')
  }

  const handleCreateNote = async () => {
    try {
      const res = await notesApi.post('/notes', { title: 'Nueva nota', content: '' })
      const newNote = res.data
      setNotes(prev => [newNote, ...prev])
      handleSelectNote(newNote)
      addToast('Nota creada', 'success')
    } catch {
      addToast('Error al crear la nota', 'error')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = await confirm('Eliminar nota', '¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.')
    if (!confirmed) return

    try {
      await notesApi.delete(`/notes/${noteId}`)
      setNotes(prev => prev.filter(n => n.id !== noteId))
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
        editor?.commands.setContent('')
      }
      addToast('Nota eliminada', 'success')
    } catch {
      addToast('Error al eliminar la nota', 'error')
    }
  }

  const handleTitleChange = async (newTitle: string) => {
    if (!selectedNote) return
    setSelectedNote({ ...selectedNote, title: newTitle })
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title: newTitle } : n))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await notesApi.put(`/notes/${selectedNote.id}`, { title: newTitle })
        setSaveStatus('saved')
      } catch {
        addToast('Error al guardar el título', 'error')
      }
    }, 1000)
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })
    } catch { return '' }
  }

  if (loading) {
    return (
      <div className="notes-layout">
        <div className="notes-list">
          <div className="notes-list-header"><h3>Notas</h3></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '14px 16px' }}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            </div>
          ))}
        </div>
        <div className="note-editor-container">
          <div className="loading-center"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="icon">⚠️</div>
        <h3>Error de conexión</h3>
        <p>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={fetchNotes}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      {dialog}
      <div className="notes-layout">
        <div className="notes-list">
          <div className="notes-list-header">
            <h3>Notas ({notes.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={handleCreateNote}>+ Nueva</button>
          </div>
          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📝</div>
              <h3>Sin notas aún</h3>
              <p>Crea tu primera nota para comenzar a organizar tus ideas.</p>
              <button className="btn btn-primary btn-sm" onClick={handleCreateNote}>Crear nota</button>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => handleSelectNote(note)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4>{note.title || 'Sin título'}</h4>
                  <button
                    className="btn-icon btn-sm"
                    onClick={e => { e.stopPropagation(); handleDeleteNote(note.id) }}
                    style={{ opacity: 0.5, fontSize: '0.8rem' }}
                  >
                    🗑
                  </button>
                </div>
                <span>{formatDate(note.updated_at)}</span>
              </div>
            ))
          )}
        </div>

        <div className="note-editor-container">
          {selectedNote ? (
            <>
              <div className="editor-header">
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="form-input"
                  style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 600, padding: '4px 0' }}
                  placeholder="Título de la nota"
                />
                <div className={`save-indicator ${saveStatus}`}>
                  {saveStatus === 'saving' && '⏳ Guardando...'}
                  {saveStatus === 'saved' && '✓ Guardado'}
                </div>
              </div>
              <div className="editor-content">
                <EditorContent editor={editor} />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="icon">👈</div>
              <h3>Selecciona una nota</h3>
              <p>Elige una nota de la lista o crea una nueva para comenzar a editar.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
