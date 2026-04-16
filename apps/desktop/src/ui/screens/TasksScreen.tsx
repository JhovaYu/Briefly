import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  History, FileText, Calendar, CheckSquare, Clock, Archive,
  Trash2, Settings, LogOut, Bell, Plus, X,
  CheckCircle2, AlertCircle, Loader2,
  LayoutList, LayoutGrid, Search, MoreHorizontal,
  Flag,
} from 'lucide-react';
import * as Y from 'yjs';
import type { Task, TaskState, TaskPriority, TaskList } from '@tuxnotas/shared';
import { TaskService } from '@tuxnotas/shared';
import type { UserProfile } from '../../core/domain/UserProfile';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STATUS_META: Record<TaskState, { label: string; color: string; bgVar: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente',   color: 'var(--text-tertiary)',  bgVar: 'var(--bg-secondary)',       icon: <CheckSquare size={14} /> },
  working:  { label: 'En progreso', color: 'var(--accent)',         bgVar: 'var(--accent-light)',        icon: <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} /> },
  done:     { label: 'Completada',  color: 'var(--color-success)',  bgVar: 'rgba(16,185,129,0.08)',     icon: <CheckCircle2 size={14} /> },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: 'Baja',  color: 'var(--text-secondary)' },
  medium: { label: 'Media', color: 'var(--color-warning)'  },
  high:   { label: 'Alta',  color: 'var(--color-error)'    },
};

// Converts a Unix timestamp to yyyy-mm-dd for <input type="date">
function tsToDateInput(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toISOString().split('T')[0];
}

// Converts yyyy-mm-dd string to start-of-day Unix timestamp
function dateInputToTs(s: string): number | undefined {
  if (!s) return undefined;
  return new Date(s).getTime();
}

// ─────────────────────────────────────────────
// SCREEN PROPS
// ─────────────────────────────────────────────

interface TasksScreenProps {
  user: UserProfile;
  yjsDoc: Y.Doc;  // The user's personal Y.Doc (IndexedDB-backed)
  onNavigate: (screen: 'dashboard' | 'notes' | 'calendar' | 'tasks' | 'schedule' | 'boards' | 'trash') => void;
  onBack: () => void;
}

// ─────────────────────────────────────────────
// TASK FORM MODAL
// ─────────────────────────────────────────────

interface TaskFormProps {
  initial?: Partial<Task> & { dueDateStr?: string }; // dueDateStr is yyyy-mm-dd
  onSave: (data: {
    text: string;
    description: string;
    state: TaskState;
    priority: TaskPriority;
    tags: string[];
    dueDateStr: string;
  }) => void;
  onClose: () => void;
}

function TaskForm({ initial, onSave, onClose }: TaskFormProps) {
  const [text, setText]               = useState(initial?.text ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [state, setState]             = useState<TaskState>(initial?.state ?? 'pending');
  const [priority, setPriority]       = useState<TaskPriority>(initial?.priority ?? 'medium');
  const [dueDateStr, setDueDateStr]   = useState(initial?.dueDateStr ?? '');
  const [tagInput, setTagInput]       = useState('');
  const [tags, setTags]               = useState<string[]>(initial?.tags ?? []);
  const textRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({ text: text.trim(), description: description.trim(), state, priority, tags, dueDateStr });
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-modal)', border: '1px solid var(--border-color)',
    borderRadius: '12px', boxShadow: 'var(--shadow-lg)', width: '480px', maxWidth: '95vw',
    padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--border-input)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-ui)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <motion.div
      style={overlayStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        style={modalStyle}
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {initial?.id ? 'Editar tarea' : 'Nueva tarea'}
          </h3>
          <button type="button" onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Título *</label>
          <input ref={textRef} style={inputStyle} value={text} onChange={e => setText(e.target.value)} placeholder="¿Qué hay que hacer?" />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' } as React.CSSProperties}
            value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles opcionales..." />
        </div>

        {/* Row: State + Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Estado</label>
            <select style={selectStyle} value={state} onChange={e => setState(e.target.value as TaskState)}>
              <option value="pending">Pendiente</option>
              <option value="working">En progreso</option>
              <option value="done">Completada</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prioridad</label>
            <select style={selectStyle} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label style={labelStyle}>Fecha límite</label>
          <input type="date" style={inputStyle} value={dueDateStr} onChange={e => setDueDateStr(e.target.value)} />
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Etiquetas (Enter para añadir)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {tags.map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '12px', fontWeight: 500 }}>
                {t}
                <button type="button" onClick={() => setTags(tags.filter(x => x !== t))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input style={inputStyle} value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder="ej: frontend, urgente" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Cancelar
          </button>
          <button type="submit"
            style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            {initial?.id ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// TASK CARD (List view)
// ─────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onStateCycle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function TaskCard({ task, onStateCycle, onEdit, onDelete }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta  = STATUS_META[task.state];
  const pMeta = task.priority ? PRIORITY_META[task.priority] : null;

  // dueDate is a timestamp; compare with today for overdue
  const isOverdue = task.dueDate && task.state !== 'done' && task.dueDate < Date.now();
  const dueDateDisplay = task.dueDate ? tsToDateInput(task.dueDate) : null;

  return (
    <motion.div
      layout
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
        padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'default',
        opacity: task.state === 'done' ? 0.7 : 1,
        position: 'relative',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      {/* State toggle */}
      <button
        onClick={() => onStateCycle(task.id)}
        title={`Estado: ${meta.label} — clic para cambiar`}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: meta.color, padding: '2px', marginTop: '1px', flexShrink: 0 }}>
        {meta.icon}
      </button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)',
            textDecoration: task.state === 'done' ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>{task.text}</span>
          {/* Priority flag — only when medium or high */}
          {pMeta && task.priority !== 'low' && (
            <Flag size={12} style={{ color: pMeta.color, flexShrink: 0 }} />
          )}
        </div>
        {task.description && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
            {task.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          {/* State chip */}
          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: meta.bgVar, color: meta.color }}>
            {meta.label}
          </span>
          {/* Tags */}
          {(task.tags ?? []).map(t => (
            <span key={t} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }}>{t}</span>
          ))}
          {/* Due date */}
          {dueDateDisplay && (
            <span style={{ fontSize: '11px', color: isOverdue ? 'var(--color-error)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {isOverdue && <AlertCircle size={11} />}
              {isOverdue ? 'Vencida: ' : ''}{dueDateDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Context menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', borderRadius: '4px', display: 'flex' }}>
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
            boxShadow: 'var(--shadow-md)', minWidth: '140px', padding: '4px', animation: 'fadeIn 100ms ease',
          }}>
            <button onClick={() => { onEdit(task); setMenuOpen(false); }}
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px 12px', textAlign: 'left', fontSize: '13px', color: 'var(--text-primary)', borderRadius: '5px', fontFamily: 'var(--font-ui)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >Editar</button>
            <button onClick={() => { onDelete(task.id); setMenuOpen(false); }}
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px 12px', textAlign: 'left', fontSize: '13px', color: 'var(--color-error)', borderRadius: '5px', fontFamily: 'var(--font-ui)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >Eliminar</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// KANBAN COLUMN
// ─────────────────────────────────────────────

interface KanbanColProps {
  state: TaskState;
  tasks: Task[];
  onStateCycle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDrop: (taskId: string, newState: TaskState) => void;
  onAddQuick: (state: TaskState) => void;
}

function KanbanCol({ state, tasks, onStateCycle, onEdit, onDelete, onDrop, onAddQuick }: KanbanColProps) {
  const meta = STATUS_META[state];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onDrop(taskId, state);
  };

  return (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      style={{
        flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '8px',
        background: isDragOver ? meta.bgVar : 'transparent',
        border: isDragOver ? `2px dashed ${meta.color}` : '2px dashed transparent',
        borderRadius: '10px', padding: '8px', transition: 'background 0.15s, border-color 0.15s',
        boxSizing: 'border-box',
      }}
    >
      {/* Col header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {tasks.length}
          </span>
        </div>
        <button onClick={() => onAddQuick(state)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '3px', borderRadius: '4px', display: 'flex' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; }}
          title="Añadir tarea"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      {tasks.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          <CheckSquare size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
          <span style={{ fontSize: '12px', opacity: 0.6 }}>Sin tareas aquí</span>
        </div>
      ) : (
        tasks.map(task => (
          <div key={task.id} draggable
            onDragStart={e => { e.dataTransfer.setData('taskId', task.id); }}
            style={{ cursor: 'grab' }}>
            <TaskCard task={task} onStateCycle={onStateCycle} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────

export function TasksScreen({ user, yjsDoc, onBack, onNavigate }: TasksScreenProps) {
  const serviceRef                          = useRef<TaskService | null>(null);
  const [personalListId, setPersonalListId] = useState<string | null>(null);
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [viewMode, setViewMode]             = useState<'list' | 'kanban'>('list');
  const [filterState, setFilterState]       = useState<TaskState | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [search, setSearch]                 = useState('');
  const [sortBy, setSortBy]                 = useState<'createdAt' | 'priority' | 'dueDate'>('createdAt');
  const [formOpen, setFormOpen]             = useState(false);
  const [editingTask, setEditingTask]       = useState<Task | undefined>(undefined);
  const [defaultState, setDefaultState]     = useState<TaskState>('pending');

  // Initialize TaskService and resolve (or create) the personal TaskList
  useEffect(() => {
    const svc = new TaskService(yjsDoc);
    serviceRef.current = svc;

    const existingLists = svc.getTaskLists(user.id);
    const list: TaskList = existingLists.length > 0
      ? existingLists[0]
      : svc.createTaskList('Personal', user.id);

    setPersonalListId(list.id);
  }, [yjsDoc, user.id]);

  // Reactively read tasks from Y.Map — re-renders on remote changes too
  useEffect(() => {
    if (!personalListId) return;
    const tasksMap = yjsDoc.getMap<Task>('tasks');
    const refresh = () => {
      setTasks(serviceRef.current?.getTasks(personalListId) ?? []);
    };
    refresh(); // initial load
    tasksMap.observe(refresh);
    return () => tasksMap.unobserve(refresh);
  }, [yjsDoc, personalListId]);

  // ── CRUD ──────────────────────────────────────

  const handleCreate = (data: {
    text: string;
    description: string;
    state: TaskState;
    priority: TaskPriority;
    tags: string[];
    dueDateStr: string;
  }) => {
    if (!serviceRef.current || !personalListId) return;

    serviceRef.current.addTask(
      personalListId,
      data.text,
      user.id,
      dateInputToTs(data.dueDateStr),
    );

    // TODO Fase 2: extender TaskService.addTask() para aceptar priority, tags y state directamente
    // Por ahora, encontramos la tarea recién creada (la más nueva) y hacemos un segundo write
    const all = serviceRef.current.getTasks(personalListId);
    const created = all.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (created && (data.priority || data.tags.length || data.state !== 'pending' || data.description)) {
      serviceRef.current.updateTask(created.id, {
        priority: data.priority,
        tags: data.tags,
        state: data.state,
        description: data.description || undefined,
      });
    }

    setFormOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleUpdate = (data: {
    text: string;
    description: string;
    state: TaskState;
    priority: TaskPriority;
    tags: string[];
    dueDateStr: string;
  }) => {
    if (!editingTask || !serviceRef.current) return;
    serviceRef.current.updateTask(editingTask.id, {
      text: data.text,
      description: data.description || undefined,
      state: data.state,
      priority: data.priority,
      tags: data.tags,
      dueDate: dateInputToTs(data.dueDateStr),
    });
    setFormOpen(false);
    setEditingTask(undefined);
  };

  const handleDelete = (id: string) => serviceRef.current?.deleteTask(id);

  const cycleState = (id: string) => {
    const order: TaskState[] = ['pending', 'working', 'done'];
    const task = tasks.find(t => t.id === id);
    if (!task || !serviceRef.current) return;
    const next = order[(order.indexOf(task.state) + 1) % order.length];
    serviceRef.current.updateTask(id, { state: next });
  };

  const handleKanbanDrop = (taskId: string, newState: TaskState) => {
    serviceRef.current?.updateTask(taskId, { state: newState });
  };

  const openCreateWithState = (s: TaskState) => {
    setDefaultState(s);
    setEditingTask(undefined);
    setFormOpen(true);
  };

  // ── FILTERING / SORTING ────────────────────

  const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

  const filteredTasks = tasks
    .filter(t => filterState === 'all' || t.state === filterState)
    .filter(t => filterPriority === 'all' || t.priority === filterPriority)
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.text.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const pa = a.priority ? PRIORITY_ORDER[a.priority] : 99;
        const pb = b.priority ? PRIORITY_ORDER[b.priority] : 99;
        return pa - pb;
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1; if (!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      }
      return b.createdAt - a.createdAt;
    });

  // Stats for header chips
  const total       = tasks.length;
  const pending     = tasks.filter(t => t.state === 'pending').length;
  const working     = tasks.filter(t => t.state === 'working').length;
  const done        = tasks.filter(t => t.state === 'done').length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Read current theme from the DOM (managed globally via data-theme)
  const currentTheme = document.documentElement.getAttribute('data-theme') ?? 'light';

  // ── RENDER ────────────────────────────────

  return (
    <>
      {/* Keyframes — minimal, no external dep */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="db2-container">
        {/* ─── SIDEBAR (identical pattern to CalendarScreen) ─── */}
        <aside className="db2-sidebar">
          <div className="db2-brand">
            <div className="db2-logo" style={{ background: 'transparent' }}>
              <img src="./logo.png" alt="Logo" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div className="db2-brand-text"><h2>Briefly</h2><span>Estudio Personal</span></div>
          </div>

          <div className="db2-new-btn-wrapper">
            <button className="db2-btn-primary" onClick={() => { setEditingTask(undefined); setDefaultState('pending'); setFormOpen(true); }}>
              <Plus size={16} /> Nueva Tarea
            </button>
          </div>

          <nav className="db2-nav">
            <button className="db2-nav-item" onClick={() => onNavigate('dashboard')}><History size={16} /> Dashboard</button>
            <button className="db2-nav-item" onClick={() => onNavigate('notes')}><FileText size={16} /> Notas</button>
            <button className="db2-nav-item" onClick={() => onNavigate('calendar')}><Calendar size={16} /> Calendario</button>
            <button className="db2-nav-item active" onClick={() => onNavigate('tasks')}><CheckSquare size={16} /> Tareas</button>
            <button className="db2-nav-item" onClick={() => onNavigate('schedule')}><Clock size={16} /> Horario</button>
            <button className="db2-nav-item" onClick={() => onNavigate('boards')}><Archive size={16} /> Tableros</button>
            <button className="db2-nav-item" onClick={() => onNavigate('trash')}><Trash2 size={16} /> Papelera</button>
          </nav>

          <div className="db2-bottom-nav">
            <div className="db2-user-profile">
              <div className="db2-user-avatar2" style={{ background: user.color }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="db2-user-name2" title={user.name}>{user.name}</div>
              <button className="db2-user-icon-btn"><Bell size={18} /></button>
            </div>
            <div className="db2-bottom-divider" />
            <button className="db2-nav-item"><Settings size={16} /> Ajustes</button>
            <button className="db2-nav-item"><LogOut size={16} /> Cerrar sesión</button>
          </div>
        </aside>

        {/* ─── MAIN ─── */}
        <main className="db2-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 28px', boxSizing: 'border-box', gap: '20px', overflow: 'hidden' }}>

          {/* ── Page Header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Tareas</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                {total} tarea{total !== 1 ? 's' : ''} · {progressPct}% completada{progressPct !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Stat chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {([['pending', pending, STATUS_META.pending], ['working', working, STATUS_META.working], ['done', done, STATUS_META.done]] as const).map(([s, count, m]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: m.bgVar, color: m.color, fontSize: '12px', fontWeight: 600 }}>
                  {m.icon}
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Progress Bar ── */}
          {total > 0 && (
            <div style={{ flexShrink: 0 }}>
              <div style={{ height: '4px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-success)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {/* ── Toolbar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tareas..."
                style={{ width: '100%', padding: '7px 12px 7px 32px', border: '1px solid var(--border-input)', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-ui)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Filter: State */}
            <select value={filterState} onChange={e => setFilterState(e.target.value as TaskState | 'all')}
              style={{ padding: '7px 10px', border: '1px solid var(--border-input)', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none' }}>
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="working">En progreso</option>
              <option value="done">Completada</option>
            </select>

            {/* Filter: Priority */}
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')}
              style={{ padding: '7px 10px', border: '1px solid var(--border-input)', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none' }}>
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'createdAt' | 'priority' | 'dueDate')}
              style={{ padding: '7px 10px', border: '1px solid var(--border-input)', borderRadius: '6px', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none' }}>
              <option value="createdAt">Más recientes</option>
              <option value="priority">Prioridad</option>
              <option value="dueDate">Fecha límite</option>
            </select>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* View toggle with animated pill */}
            <div style={{ position: 'relative', display: 'flex', gap: '2px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '7px', border: '1px solid var(--border-color)' }}>
              {(['list', 'kanban'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    position: 'relative', zIndex: 1,
                    padding: '5px 12px', borderRadius: '5px', fontSize: '13px', fontWeight: 600,
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'transparent',
                    color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    transition: 'color 0.15s',
                  }}
                >
                  {/* Animated background pill */}
                  {viewMode === mode && (
                    <motion.span
                      layoutId="view-toggle-pill"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '5px',
                        background: 'var(--bg-primary)', boxShadow: 'var(--shadow-sm)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {mode === 'list' ? <LayoutList size={14} /> : <LayoutGrid size={14} />}
                  {mode === 'list' ? 'Lista' : 'Kanban'}
                </button>
              ))}
            </div>

            {/* New task btn */}
            <button onClick={() => { setEditingTask(undefined); setDefaultState('pending'); setFormOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
              <Plus size={14} /> Nueva tarea
            </button>
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {filteredTasks.length === 0 && tasks.length === 0 ? (
              // Empty state
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-tertiary)' }}>
                <CheckSquare size={48} style={{ opacity: 0.2 }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sin tareas todavía</p>
                <p style={{ margin: 0, fontSize: '13px', maxWidth: '30ch', textAlign: 'center' }}>Crea tu primera tarea para empezar a organizarte.</p>
                <button onClick={() => { setEditingTask(undefined); setDefaultState('pending'); setFormOpen(true); }}
                  style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  <Plus size={14} /> Crear primera tarea
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              // No results
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-tertiary)' }}>
                <Search size={36} style={{ opacity: 0.25 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Sin resultados para los filtros actuales</p>
              </div>
            ) : viewMode === 'list' ? (
              // ── LIST VIEW ──────────────────────────────────────────
              <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} onStateCycle={cycleState} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              // ── KANBAN VIEW ────────────────────────────────────────
              <div style={{ height: '100%', display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px' }}>
                {(['pending', 'working', 'done'] as TaskState[]).map(s => (
                  <KanbanCol
                    key={s}
                    state={s}
                    tasks={filteredTasks.filter(t => t.state === s)}
                    onStateCycle={cycleState}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDrop={handleKanbanDrop}
                    onAddQuick={openCreateWithState}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── TASK FORM MODAL ─── */}
      <AnimatePresence>
        {formOpen && (
          <TaskForm
            initial={
              editingTask
                ? { ...editingTask, dueDateStr: tsToDateInput(editingTask.dueDate) }
                : { state: defaultState }
            }
            onSave={editingTask ? handleUpdate : handleCreate}
            onClose={() => { setFormOpen(false); setEditingTask(undefined); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
