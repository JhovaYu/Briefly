import { useState, useCallback, useRef } from 'react';
import { type Task } from '@tuxnotas/shared';
import type { UserProfile } from '../../core/domain/UserProfile';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TaskStatus = 'pending' | 'working' | 'done';
type ViewMode  = 'list' | 'kanban';
type Priority  = 'low' | 'medium' | 'high';

interface LocalTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: number;
  dueDate?: string;
  tags: string[];
}

interface TasksScreenProps {
  user: UserProfile;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Por hacer',
  working: 'En progreso',
  done:    'Completado',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'var(--color-warning, #f59e0b)',
  working: 'var(--accent)',
  done:    'var(--color-success)',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low:    'Baja',
  medium: 'Media',
  high:   'Alta',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low:    'var(--text-tertiary)',
  medium: 'var(--color-warning, #f59e0b)',
  high:   'var(--color-error)',
};

const generateId = () =>
  `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const SEED_TASKS: LocalTask[] = [
  {
    id: generateId(),
    title: 'Configurar Signaling Server en AWS',
    description: 'Deploy del servidor y-webrtc en EC2. Actualizar variable VITE_SIGNALING_URL en todos los clientes.',
    status: 'pending',
    priority: 'high',
    createdAt: Date.now() - 86400000 * 3,
    tags: ['infraestructura', 'devops'],
  },
  {
    id: generateId(),
    title: 'Redesign HomeDashboard',
    description: 'Aplicar feedback del profesor: más visual, iconografía, gráficos circulares estilo Notion.',
    status: 'working',
    priority: 'high',
    createdAt: Date.now() - 86400000 * 2,
    tags: ['diseño', 'ui'],
  },
  {
    id: generateId(),
    title: 'Conectar jszip → Export Service',
    description: 'Implementar microservicio #5. Exportar Pool completo a .zip.',
    status: 'pending',
    priority: 'medium',
    createdAt: Date.now() - 86400000,
    tags: ['feature', 'microservicio'],
  },
  {
    id: generateId(),
    title: 'Implementar BoardsScreen',
    description: 'Pantalla de tableros Kanban colaborativo con Yjs.',
    status: 'pending',
    priority: 'medium',
    createdAt: Date.now() - 3600000 * 5,
    tags: ['feature', 'yjs'],
  },
  {
    id: generateId(),
    title: 'CalendarScreen entregado al profesor',
    description: 'Vista completa de calendario de eventos con integración Supabase.',
    status: 'done',
    priority: 'high',
    createdAt: Date.now() - 86400000 * 7,
    tags: ['entregado'],
  },
];

// ─────────────────────────────────────────────────────────────
// Kanban Column
// ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: LocalTask[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: LocalTask) => void;
  onDelete: (id: string) => void;
  dragOverCol: TaskStatus | null;
  onDragOver: (e: React.DragEvent, col: TaskStatus) => void;
  onDrop: (e: React.DragEvent, col: TaskStatus) => void;
  onDragLeave: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function KanbanColumn({
  status, tasks, onStatusChange, onEdit, onDelete,
  dragOverCol, onDragOver, onDrop, onDragLeave, onDragStart,
}: KanbanColumnProps) {
  const isOver = dragOverCol === status;

  return (
    <div
      className={`tasks-kanban-col${isOver ? ' drag-over' : ''}`}
      onDragOver={e => onDragOver(e, status)}
      onDrop={e => onDrop(e, status)}
      onDragLeave={onDragLeave}
    >
      <div className="tasks-kanban-col-header">
        <span
          className="tasks-status-dot"
          style={{ background: STATUS_COLORS[status] }}
        />
        <span className="tasks-kanban-col-title">{STATUS_LABELS[status]}</span>
        <span className="tasks-kanban-col-count">{tasks.length}</span>
      </div>

      <div className="tasks-kanban-cards">
        {tasks.length === 0 && (
          <div className="tasks-empty-col">
            <span>Arrastra aquí</span>
          </div>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            className="tasks-kanban-card"
            draggable
            onDragStart={e => onDragStart(e, task.id)}
          >
            <div className="tasks-kanban-card-top">
              <span
                className="tasks-priority-badge"
                style={{ color: PRIORITY_COLORS[task.priority] }}
              >
                {PRIORITY_LABELS[task.priority]}
              </span>
              <div className="tasks-card-actions">
                <button
                  className="tasks-icon-btn"
                  title="Editar"
                  onClick={() => onEdit(task)}
                >
                  <PencilIcon />
                </button>
                <button
                  className="tasks-icon-btn danger"
                  title="Eliminar"
                  onClick={() => onDelete(task.id)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            <p className="tasks-kanban-card-title">{task.title}</p>

            {task.description && (
              <p className="tasks-kanban-card-desc">{task.description}</p>
            )}

            <div className="tasks-kanban-card-footer">
              {task.tags.slice(0, 2).map(tag => (
                <span key={tag} className="tasks-tag">{tag}</span>
              ))}
              <div className="tasks-status-cycle">
                {(['pending', 'working', 'done'] as TaskStatus[]).map(s => (
                  <button
                    key={s}
                    className={`tasks-cycle-btn${task.status === s ? ' active' : ''}`}
                    style={task.status === s ? { background: STATUS_COLORS[s] } : {}}
                    title={STATUS_LABELS[s]}
                    onClick={() => onStatusChange(task.id, s)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Minimal SVG Icons (inline — no extra dep)
// ─────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="13"/>
      <rect x="14" y="3" width="7" height="8"/>
      <rect x="14" y="15" width="7" height="6"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Task Form Modal
// ─────────────────────────────────────────────────────────────

interface TaskFormProps {
  initial?: Partial<LocalTask>;
  onSave: (data: Omit<LocalTask, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

function TaskForm({ initial, onSave, onClose }: TaskFormProps) {
  const [title,       setTitle]       = useState(initial?.title       ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status,      setStatus]      = useState<TaskStatus>(initial?.status   ?? 'pending');
  const [priority,    setPriority]    = useState<Priority>(initial?.priority ?? 'medium');
  const [dueDate,     setDueDate]     = useState(initial?.dueDate ?? '');
  const [tagInput,    setTagInput]    = useState((initial?.tags ?? []).join(', '));
  const [error,       setError]       = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    onSave({
      title:       title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate:     dueDate || undefined,
      tags:        tagInput.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="tasks-modal-overlay" onClick={onClose}>
      <div
        className="tasks-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={initial?.title ? 'Editar tarea' : 'Nueva tarea'}
      >
        <div className="tasks-modal-header">
          <h2 className="tasks-modal-title">
            {initial?.title ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button className="tasks-icon-btn" onClick={onClose} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tasks-modal-form">
          {error && <p className="tasks-form-error">{error}</p>}

          <label className="tasks-form-label">
            Título
            <input
              className="tasks-form-input"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="¿Qué hay que hacer?"
              autoFocus
              required
            />
          </label>

          <label className="tasks-form-label">
            Descripción
            <textarea
              className="tasks-form-input tasks-form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle opcional..."
              rows={3}
            />
          </label>

          <div className="tasks-form-row">
            <label className="tasks-form-label" style={{ flex: 1 }}>
              Estado
              <select
                className="tasks-form-input"
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
              >
                {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>

            <label className="tasks-form-label" style={{ flex: 1 }}>
              Prioridad
              <select
                className="tasks-form-input"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
              >
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="tasks-form-label">
            Fecha límite
            <input
              className="tasks-form-input"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </label>

          <label className="tasks-form-label">
            Etiquetas <span className="tasks-form-hint">(separadas por coma)</span>
            <input
              className="tasks-form-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="diseño, backend, urgente"
            />
          </label>

          <div className="tasks-modal-footer">
            <button type="button" className="tasks-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="tasks-btn-primary">
              {initial?.title ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// List View Row
// ─────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusToggle,
  onEdit,
  onDelete,
}: {
  task: LocalTask;
  onStatusToggle: (id: string) => void;
  onEdit: (task: LocalTask) => void;
  onDelete: (id: string) => void;
}) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    pending: 'working',
    working: 'done',
    done:    'pending',
  };

  return (
    <div className={`tasks-row${task.status === 'done' ? ' done' : ''}`}>
      <button
        className="tasks-check-btn"
        style={{
          borderColor: STATUS_COLORS[task.status],
          background: task.status === 'done' ? STATUS_COLORS['done'] : 'transparent',
        }}
        onClick={() => onStatusToggle(task.id)}
        title={`Marcar como ${STATUS_LABELS[nextStatus[task.status]]}`}
        aria-label={`Estado: ${STATUS_LABELS[task.status]}. Click para avanzar.`}
      >
        {task.status === 'done' && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
        {task.status === 'working' && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor"/>
          </svg>
        )}
      </button>

      <div className="tasks-row-body">
        <span className="tasks-row-title">{task.title}</span>
        {task.description && (
          <span className="tasks-row-desc">{task.description}</span>
        )}
        <div className="tasks-row-meta">
          <span
            className="tasks-status-chip"
            style={{ color: STATUS_COLORS[task.status], borderColor: STATUS_COLORS[task.status] }}
          >
            {STATUS_LABELS[task.status]}
          </span>
          <span
            className="tasks-priority-chip"
            style={{ color: PRIORITY_COLORS[task.priority] }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.dueDate && (
            <span className="tasks-due-chip">📅 {task.dueDate}</span>
          )}
          {task.tags.map(tag => (
            <span key={tag} className="tasks-tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="tasks-row-actions">
        <button className="tasks-icon-btn" title="Editar" onClick={() => onEdit(task)}>
          <PencilIcon />
        </button>
        <button className="tasks-icon-btn danger" title="Eliminar" onClick={() => onDelete(task.id)}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TasksScreen — Main Component
// ─────────────────────────────────────────────────────────────

export function TasksScreen({ user, onBack, onNavigate }: TasksScreenProps) {
  const [tasks,      setTasks]      = useState<LocalTask[]>(SEED_TASKS);
  const [view,       setView]       = useState<ViewMode>('list');
  const [filter,     setFilter]     = useState<TaskStatus | 'all'>('all');
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<LocalTask | null>(null);
  const [dragId,     setDragId]     = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // ── CRUD ──────────────────────────────────────────────────

  const handleCreate = useCallback(
    (data: Omit<LocalTask, 'id' | 'createdAt'>) => {
      setTasks(prev => [{
        id: generateId(),
        createdAt: Date.now(),
        ...data,
      }, ...prev]);
      setShowForm(false);
    },
    [],
  );

  const handleUpdate = useCallback(
    (data: Omit<LocalTask, 'id' | 'createdAt'>) => {
      if (!editTarget) return;
      setTasks(prev =>
        prev.map(t => t.id === editTarget.id ? { ...t, ...data } : t),
      );
      setEditTarget(null);
    },
    [editTarget],
  );

  const handleDelete = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleStatusChange = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }, []);

  const handleStatusToggle = useCallback((id: string) => {
    const cycle: Record<TaskStatus, TaskStatus> = {
      pending: 'working',
      working: 'done',
      done:    'pending',
    };
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: cycle[t.status] } : t),
    );
  }, []);

  // ── Drag & Drop (Kanban) ──────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleDrop = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    if (dragId) handleStatusChange(dragId, col);
    setDragId(null);
    setDragOverCol(null);
  };

  const handleDragLeave = () => setDragOverCol(null);

  // ── Filtered / searched tasks ─────────────────────────────

  const visible = tasks.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  // ── Stats ─────────────────────────────────────────────────

  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'done').length;
  const working = tasks.filter(t => t.status === 'working').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="tasks-screen">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="tasks-header">
        <div className="tasks-header-left">
          <button className="tasks-back-btn" onClick={onBack} aria-label="Volver">
            <ArrowLeftIcon />
          </button>
          <div>
            <h1 className="tasks-title">Tareas</h1>
            <p className="tasks-subtitle">
              {done} de {total} completadas
            </p>
          </div>
        </div>

        <div className="tasks-header-right">
          {/* View toggle */}
          <div className="tasks-view-toggle" role="group" aria-label="Modo de vista">
            <button
              className={`tasks-view-btn${view === 'list' ? ' active' : ''}`}
              onClick={() => setView('list')}
              title="Vista lista"
              aria-pressed={view === 'list'}
            >
              <ListIcon />
            </button>
            <button
              className={`tasks-view-btn${view === 'kanban' ? ' active' : ''}`}
              onClick={() => setView('kanban')}
              title="Vista kanban"
              aria-pressed={view === 'kanban'}
            >
              <KanbanIcon />
            </button>
          </div>

          <button
            className="tasks-new-btn"
            onClick={() => { setEditTarget(null); setShowForm(true); }}
          >
            <PlusIcon />
            Nueva tarea
          </button>
        </div>
      </header>

      {/* ── Progress bar ───────────────────────────────── */}
      <div className="tasks-progress-bar-wrapper" aria-label={`Progreso: ${progress}%`}>
        <div
          className="tasks-progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Stats strip ────────────────────────────────── */}
      <div className="tasks-stats">
        <button
          className={`tasks-stat-pill${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas <span>{total}</span>
        </button>
        <button
          className={`tasks-stat-pill${filter === 'pending' ? ' active' : ''}`}
          onClick={() => setFilter('pending')}
          style={filter === 'pending' ? { borderColor: STATUS_COLORS['pending'] } : {}}
        >
          Por hacer <span style={{ color: STATUS_COLORS['pending'] }}>{pending}</span>
        </button>
        <button
          className={`tasks-stat-pill${filter === 'working' ? ' active' : ''}`}
          onClick={() => setFilter('working')}
          style={filter === 'working' ? { borderColor: STATUS_COLORS['working'] } : {}}
        >
          En progreso <span style={{ color: STATUS_COLORS['working'] }}>{working}</span>
        </button>
        <button
          className={`tasks-stat-pill${filter === 'done' ? ' active' : ''}`}
          onClick={() => setFilter('done')}
          style={filter === 'done' ? { borderColor: STATUS_COLORS['done'] } : {}}
        >
          Completadas <span style={{ color: STATUS_COLORS['done'] }}>{done}</span>
        </button>

        <div className="tasks-search-wrapper">
          <input
            className="tasks-search"
            placeholder="Buscar tareas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar tareas"
          />
        </div>
      </div>

      {/* ── Main content area ──────────────────────────── */}
      <main className="tasks-content">
        {view === 'list' ? (
          <div className="tasks-list">
            {visible.length === 0 ? (
              <div className="tasks-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <p>No hay tareas que mostrar.</p>
                <button
                  className="tasks-btn-primary"
                  onClick={() => { setEditTarget(null); setShowForm(true); }}
                >
                  Crear primera tarea
                </button>
              </div>
            ) : (
              visible.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusToggle={handleStatusToggle}
                  onEdit={t => { setEditTarget(t); setShowForm(true); }}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        ) : (
          <div className="tasks-kanban">
            {(['pending', 'working', 'done'] as TaskStatus[]).map(col => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={tasks.filter(t => t.status === col)}
                onStatusChange={handleStatusChange}
                onEdit={t => { setEditTarget(t); setShowForm(true); }}
                onDelete={handleDelete}
                dragOverCol={dragOverCol}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Task form modal ─────────────────────────────── */}
      {showForm && (
        <TaskForm
          initial={editTarget ?? undefined}
          onSave={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
