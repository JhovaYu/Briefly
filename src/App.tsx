/// <reference path="./electron.d.ts" />
import { useState, useEffect, useRef } from 'react';
import { Editor } from './infrastructure/ui/components/Editor';
import { AppServices } from './infrastructure/AppServices';
import {
  FileText, Plus, Search, Sun, Moon, LogOut, Trash2, PenLine,
  MoreHorizontal, ChevronRight, ChevronDown, FolderPlus, Copy,
  Edit3, FilePlus, FolderOpen, BookOpen, X, Clipboard, GripVertical,
  ArrowLeft, Users, Clock, Zap,
} from 'lucide-react';
import type { Note, Notebook } from './core/domain/Entities';
import {
  getUserProfile, saveUserProfile, getSavedPools, addPool, removePool,
  updatePoolLastOpened,
  type UserProfile, type PoolInfo,
} from './core/domain/UserProfile';
import './infrastructure/ui/styles/index.css';

// ─── Shared Components ───

function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const ax = Math.min(x, window.innerWidth - 220);
  const ay = Math.min(y, window.innerHeight - items.length * 36 - 20);
  return (
    <div ref={ref} className="context-menu" style={{ top: ay, left: ax }}>
      {items.map((item, i) => (
        <button key={i} className={`context-menu-item ${item.danger ? 'danger' : ''}`}
          onClick={() => { item.onClick(); onClose(); }}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function InlineRename({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input ref={ref} className="inline-rename-input" value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSave(text); if (e.key === 'Escape') onCancel(); }}
      onClick={(e) => e.stopPropagation()} />
  );
}

// ════════════════════════════════════════════════════
// 1. PROFILE SETUP SCREEN
// ════════════════════════════════════════════════════

function ProfileSetup({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('fluent-theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const profile: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      color,
      createdAt: Date.now(),
    };
    saveUserProfile(profile);
    onComplete(profile);
  };

  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e63', '#795548', '#607d8b'];

  return (
    <div className="login-screen">
      <div className="login-theme-toggle">
        <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
      <div className="login-card fade-in" style={{ maxWidth: 440 }}>
        <div className="login-logo"><PenLine size={36} /><h1>Fluent</h1></div>
        <p className="login-subtitle">Configura tu perfil para empezar</p>

        <div style={{ textAlign: 'left', marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Tu nombre
          </label>
          <input className="login-input" style={{ width: '100%' }} placeholder="Ej: Jhovan, Equipo Alpha..."
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Color de cursor
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                  background: c, cursor: 'pointer', transition: 'all 120ms ease',
                }} />
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!name.trim()} className="login-btn-primary">
          <Zap size={16} /> Comenzar
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 2. HOME DASHBOARD
// ════════════════════════════════════════════════════

function HomeDashboard({ user, onOpenPool, onLogout }: {
  user: UserProfile;
  onOpenPool: (poolId: string, name: string, signalingUrl?: string) => void;
  onLogout: () => void;
}) {
  const [pools, setPools] = useState<PoolInfo[]>(getSavedPools());
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('fluent-theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fluent-theme', theme);
  }, [theme]);

  const handleCreate = async () => {
    let signalingIp = 'localhost';
    try {
      if (window.electronAPI) {
        signalingIp = await window.electronAPI.startSignaling();
        console.log('[Dashboard] Signaling started at IP:', signalingIp);
      }
    } catch (e) {
      console.error('Error starting signaling:', e);
    }

    const name = newPoolName.trim() || 'Mi espacio';
    // Generar ID único + IP para compartir
    const randomId = `pool-${Math.random().toString(36).substr(2, 9)}`;
    // Si estamos en electron, pegamos la IP. Si no (web), dejamos solo el ID.
    const fullPoolId = window.electronAPI ? `${randomId}@${signalingIp}` : randomId;

    const pool: PoolInfo = { id: fullPoolId, name, icon: 'workspace', lastOpened: Date.now(), createdAt: Date.now() };
    addPool(pool);
    setPools(getSavedPools());
    setCreating(false);
    setNewPoolName('');

    // Al crear, somos el HOST -> usamos la IP local (signalingIp) para conectar nuestro adaptador
    // URL de signaling: ws://<IP>:4444
    const signalingUrl = `ws://${signalingIp}:4444`;
    onOpenPool(fullPoolId, name, signalingUrl);
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;

    try {
      if (window.electronAPI) {
        await window.electronAPI.stopSignaling();
        console.log('[Dashboard] Signaling stopped (joining existing pool)');
      }
    } catch (e) {
      console.error('Error stopping signaling:', e);
    }

    // Parse id@ip
    const input = joinId.trim();
    let signalingUrl = undefined;

    if (input.includes('@')) {
      const parts = input.split('@');
      // Ojo: Yjs necesita coincidir en el nombre de la sala. 
      // Si el host usa "pool-123@192.168.1.50", el cliente también debe usar ese string como nombre de sala.
      // O usamos solo la parte "pool-123"? -> Mejor usar TODO el string para evitar colisiones si hay otro pool-123 en otra IP.
      // PERO, si cambia la IP del host y reinicia, cambia el nombre de la sala.
      // Aceptable por simplicidad.

      const ip = parts[1];
      signalingUrl = `ws://${ip}:4444`;
    }

    const pool: PoolInfo = { id: input, name: input, icon: 'collab', lastOpened: Date.now(), createdAt: Date.now() };
    addPool(pool);
    setPools(getSavedPools());
    setJoinId('');
    onOpenPool(pool.id, pool.name, signalingUrl);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removePool(id);
    setPools(getSavedPools());
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const sorted = [...pools].sort((a, b) => b.lastOpened - a.lastOpened);

  return (
    <div className="dashboard-screen">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <PenLine size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Fluent</span>
        </div>
        <div className="dashboard-topbar-right">
          <div className="header-user">
            <div className="header-user-dot" style={{ background: user.color }} />
            <span>{user.name}</span>
          </div>
          <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button className="header-btn" onClick={onLogout} title="Cambiar perfil">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-greeting fade-in">
          <h1>Hola, {user.name}</h1>
          <p>Tus espacios de trabajo colaborativos</p>
        </div>

        <div className="dashboard-grid fade-in">
          {/* Create new pool */}
          {!creating ? (
            <div className="pool-card pool-card-new" onClick={() => setCreating(true)}>
              <div className="pool-card-icon-big"><Plus size={32} /></div>
              <span className="pool-card-new-label">Crear nuevo espacio</span>
            </div>
          ) : (
            <div className="pool-card pool-card-creating">
              <input className="login-input" style={{ width: '100%', marginBottom: 8 }}
                autoFocus placeholder="Nombre del espacio..."
                value={newPoolName} onChange={(e) => setNewPoolName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="login-btn-primary" style={{ flex: 1, padding: '6px 8px', fontSize: 12 }} onClick={handleCreate}>Crear</button>
                <button className="login-btn-secondary" style={{ padding: '6px 8px', fontSize: 12 }} onClick={() => setCreating(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Join pool */}
          <div className="pool-card pool-card-join">
            <div className="pool-card-icon-big" style={{ opacity: 0.6 }}><Users size={28} /></div>
            <span className="pool-card-new-label" style={{ fontSize: 13, marginBottom: 8 }}>Unirse a espacio</span>
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input className="login-input" style={{ flex: 1, fontSize: 12 }}
                placeholder="Pool ID..." value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()} />
              <button className="login-btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={handleJoin} disabled={!joinId.trim()}>Unirse</button>
            </div>
          </div>

          {/* Existing pools — icons only, no emojis */}
          {sorted.map((pool) => (
            <div key={pool.id} className="pool-card" onClick={() => { updatePoolLastOpened(pool.id); onOpenPool(pool.id, pool.name); }}>
              <div className="pool-card-header">
                <div className="pool-card-icon-big" style={{ width: 36, height: 36 }}>
                  <FileText size={18} />
                </div>
                <button className="pool-card-delete" onClick={(e) => handleDelete(pool.id, e)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="pool-card-title">{pool.name}</h3>
              <div className="pool-card-meta">
                <Clock size={12} />
                <span>{formatDate(pool.lastOpened)}</span>
              </div>
              <div className="pool-card-id">
                <span>{pool.id}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 3. POOL WORKSPACE (editor + sidebar)
// ════════════════════════════════════════════════════

function PoolWorkspace({ poolId, poolName, user, onBack, signalingUrl }: {
  poolId: string; poolName: string; user: UserProfile; onBack: () => void; signalingUrl?: string;
}) {
  const [services, setServices] = useState<AppServices | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId?: string; notebookId?: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<'note' | 'notebook'>('note');
  const [collapsedNotebooks, setCollapsedNotebooks] = useState<Set<string>>(new Set());
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('fluent-theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fluent-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ─── Initialize services + REAL-TIME SYNC ───
  useEffect(() => {
    let cancelled = false;
    let updateHandler: (() => void) | null = null;
    let currentSvc: AppServices | null = null;

    (async () => {
      // ★ Use singleton cache — prevents "Yjs Doc already exists!" on StrictMode double-invoke
      const svc = await AppServices.getOrCreate(poolId, signalingUrl);
      if (cancelled) { AppServices.release(poolId); return; }
      currentSvc = svc;
      setServices(svc);

      // Store the pool name in Y.Doc so joining peers see it
      if (poolName) {
        const existingName = svc.getPoolName();
        if (!existingName) {
          svc.setPoolMeta(poolName);
        }
      }

      // Helper to refresh all data from Y.Doc
      const refreshAll = () => {
        if (cancelled) return;
        const notesMap = svc.doc.getMap<Note>('notes');
        const nbMap = svc.doc.getMap<Notebook>('notebooks');
        setNotes(Array.from(notesMap.values()));
        setNotebooks(Array.from(nbMap.values()));

        // Also sync pool name from Y.Doc → localStorage for joining peers
        const syncedName = svc.getPoolName();
        if (syncedName && syncedName !== poolName) {
          // Update the local pool entry with the real name
          const pools = getSavedPools();
          const entry = pools.find(p => p.id === poolId);
          if (entry && entry.name !== syncedName) {
            entry.name = syncedName;
            import('./core/domain/UserProfile').then(m => m.savePools(pools));
          }
        }
      };

      // Initial load
      refreshAll();
      const allNotes = Array.from(svc.doc.getMap<Note>('notes').values());
      if (allNotes.length > 0) setActiveNoteId(allNotes[0].id);

      // ★ REAL-TIME SYNC: Listen to ALL Y.Doc updates (local + remote via WebRTC)
      updateHandler = refreshAll;
      svc.doc.on('update', updateHandler);
    })();

    return () => {
      cancelled = true;
      if (currentSvc && updateHandler) {
        currentSvc.doc.off('update', updateHandler);
      }
      AppServices.release(poolId);
    };
  }, [poolId]);

  if (!services) {
    return (
      <div className="login-screen">
        <div className="pulse" style={{ color: 'var(--text-tertiary)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={20} /> Conectando al espacio...
        </div>
      </div>
    );
  }

  // ─── Note/Notebook CRUD ───

  const handleCreateNote = async (targetNbId?: string) => {
    const nbId = targetNbId || activeNotebookId;
    const note = nbId
      ? await services.createNoteInNotebook(nbId)
      : await services.createNote();
    setActiveNoteId(note.id);
  };

  const handleCreateSubPage = async (parentId: string) => {
    const note = await services.createSubPage(parentId);
    if (note) setActiveNoteId(note.id);
  };

  const handleDuplicateNote = async (noteId: string) => {
    const copy = await services.duplicateNote(noteId);
    if (copy) setActiveNoteId(copy.id);
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const children = notes.filter(n => n.parentId === id);
    for (const child of children) await services.persistence.deleteNote(child.id);
    await services.persistence.deleteNote(id);
    if (activeNoteId === id) {
      const remaining = notes.filter(n => n.id !== id && n.parentId !== id);
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameNote = async (noteId: string, newTitle: string) => {
    setRenamingId(null);
    if (!newTitle.trim()) return;
    const note = await services.persistence.getNote(noteId);
    if (note) {
      note.title = newTitle;
      note.titleLocked = true;
      note.updatedAt = Date.now();
      await services.persistence.saveNote(note);
    }
  };

  const handleTitleChange = async (title: string) => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note?.titleLocked) return;
    const persisted = await services.persistence.getNote(activeNoteId);
    if (persisted) {
      persisted.title = title;
      persisted.updatedAt = Date.now();
      await services.persistence.saveNote(persisted);
    }
  };

  const handleCreateNotebook = async (name: string) => {
    setCreatingNotebook(false);
    if (!name.trim()) return;
    await services.createNotebook(name);
  };

  const handleRenameNotebook = async (nbId: string, newName: string) => {
    setRenamingId(null);
    if (!newName.trim()) return;
    const nb = await services.persistence.getNotebook(nbId);
    if (nb) { nb.name = newName; await services.persistence.saveNotebook(nb); }
  };

  const handleDeleteNotebook = async (nbId: string) => {
    await services.persistence.deleteNotebook(nbId);
    if (activeNotebookId === nbId) setActiveNotebookId(null);
  };

  const handleMoveToNotebook = async (noteId: string, notebookId: string | undefined) => {
    const note = await services.persistence.getNote(noteId);
    if (note) { note.notebookId = notebookId; await services.persistence.saveNote(note); }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedNotebooks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ─── Drag & Drop ───
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    setDraggedNoteId(noteId); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverTarget(targetId);
  };
  const handleDropOnNotebook = async (e: React.DragEvent, nbId: string) => {
    e.preventDefault(); setDragOverTarget(null);
    if (draggedNoteId) { await handleMoveToNotebook(draggedNoteId, nbId); setDraggedNoteId(null); }
  };
  const handleDropOnUncategorized = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOverTarget(null);
    if (draggedNoteId) { await handleMoveToNotebook(draggedNoteId, undefined); setDraggedNoteId(null); }
  };

  const copyPoolId = async () => {
    try { await navigator.clipboard.writeText(poolId); } catch { /* fallback */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ─── Derived data ───
  const activeNote = notes.find(n => n.id === activeNoteId);
  const filterMatch = (n: Note) => n.title.toLowerCase().includes(searchQuery.toLowerCase());
  const getTopNotes = (nbId?: string) => notes.filter(n => n.notebookId === nbId && !n.parentId && filterMatch(n)).sort((a, b) => b.createdAt - a.createdAt);
  const getSubPages = (parentId: string) => notes.filter(n => n.parentId === parentId && filterMatch(n));

  // ─── Context Menus ───
  const openNoteMenu = (e: React.MouseEvent, noteId: string) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, noteId }); };
  const openNbMenu = (e: React.MouseEvent, nbId: string) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, notebookId: nbId }); };

  const noteMenuItems = (noteId: string) => [
    { label: 'Renombrar', icon: <Edit3 size={14} />, onClick: () => { setRenamingId(noteId); setRenamingType('note'); } },
    { label: 'Duplicar', icon: <Copy size={14} />, onClick: () => handleDuplicateNote(noteId) },
    { label: 'Sub-pagina', icon: <FilePlus size={14} />, onClick: () => handleCreateSubPage(noteId) },
    ...notebooks.map(nb => ({ label: `Mover a ${nb.name}`, icon: <FolderOpen size={14} />, onClick: () => handleMoveToNotebook(noteId, nb.id) })),
    ...(notes.find(n => n.id === noteId)?.notebookId ? [{ label: 'Sacar de cuaderno', icon: <FileText size={14} />, onClick: () => handleMoveToNotebook(noteId, undefined) }] : []),
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => handleDeleteNote(noteId), danger: true },
  ];

  const nbMenuItems = (nbId: string) => [
    { label: 'Renombrar', icon: <Edit3 size={14} />, onClick: () => { setRenamingId(nbId); setRenamingType('notebook'); } },
    { label: 'Nueva pagina aqui', icon: <FilePlus size={14} />, onClick: () => handleCreateNote(nbId) },
    { label: 'Eliminar cuaderno', icon: <Trash2 size={14} />, onClick: () => handleDeleteNotebook(nbId), danger: true },
  ];

  // ─── Note Item Renderer ───
  const renderNoteItem = (note: Note, depth = 0) => {
    const subs = getSubPages(note.id);
    const isActive = note.id === activeNoteId;
    const isRenaming = renamingId === note.id && renamingType === 'note';
    return (
      <div key={note.id}>
        <div className={`sidebar-note-item ${isActive ? 'active' : ''} ${draggedNoteId === note.id ? 'dragging' : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => { setActiveNoteId(note.id); setActiveNotebookId(note.notebookId || null); }}
          role="button" tabIndex={0}
          onContextMenu={(e) => openNoteMenu(e, note.id)}
          draggable onDragStart={(e) => handleDragStart(e, note.id)} onDragEnd={() => { setDraggedNoteId(null); setDragOverTarget(null); }}>
          <span className="drag-handle"><GripVertical size={12} /></span>
          {subs.length > 0 && (
            <button className="note-toggle" onClick={(e) => { e.stopPropagation(); toggleCollapse(note.id); }}>
              {collapsedNotebooks.has(note.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <FileText className="note-icon" size={15} />
          {isRenaming
            ? <InlineRename value={note.title} onSave={v => handleRenameNote(note.id, v)} onCancel={() => setRenamingId(null)} />
            : <span className="note-title">{note.title || 'Sin titulo'}</span>}
          <button className="note-action-btn" onClick={(e) => openNoteMenu(e, note.id)}><MoreHorizontal size={14} /></button>
        </div>
        {!collapsedNotebooks.has(note.id) && subs.map(s => renderNoteItem(s, depth + 1))}
      </div>
    );
  };

  return (
    <div className="app-layout">
      {contextMenu?.noteId && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={noteMenuItems(contextMenu.noteId)} onClose={() => setContextMenu(null)} />}
      {contextMenu?.notebookId && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={nbMenuItems(contextMenu.notebookId)} onClose={() => setContextMenu(null)} />}

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={onBack} title="Volver al dashboard">
            <ArrowLeft size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 13 }}>{poolName}</span>
          </div>
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={() => handleCreateNote()} title={activeNotebookId ? 'Nueva pagina en cuaderno' : 'Nueva pagina'}>
              <Plus size={16} />
            </button>
            <button className="sidebar-action-btn" onClick={() => setCreatingNotebook(true)} title="Nuevo cuaderno">
              <FolderPlus size={16} />
            </button>
          </div>
        </div>

        <div className="sidebar-search">
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar..." className="sidebar-search-input" style={{ paddingLeft: 28 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="sidebar-notes">
          {notebooks.length > 0 && <div className="sidebar-section-label">Cuadernos</div>}
          {notebooks.map(nb => {
            const isCollapsed = collapsedNotebooks.has(nb.id);
            const nbNotes = getTopNotes(nb.id);
            const isRenamingNb = renamingId === nb.id && renamingType === 'notebook';
            return (
              <div key={nb.id} className="notebook-group">
                <div className={`notebook-header ${dragOverTarget === nb.id ? 'drop-target' : ''} ${activeNotebookId === nb.id ? 'active-nb' : ''}`}
                  onClick={() => { toggleCollapse(nb.id); setActiveNotebookId(nb.id); }}
                  onContextMenu={(e) => openNbMenu(e, nb.id)}
                  onDragOver={(e) => handleDragOver(e, nb.id)}
                  onDragLeave={() => setDragOverTarget(null)}
                  onDrop={(e) => handleDropOnNotebook(e, nb.id)}
                  role="button" tabIndex={0}>
                  <span className="notebook-toggle">{isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</span>
                  <BookOpen size={14} className="notebook-icon" />
                  {isRenamingNb
                    ? <InlineRename value={nb.name} onSave={v => handleRenameNotebook(nb.id, v)} onCancel={() => setRenamingId(null)} />
                    : <span className="notebook-name">{nb.name}</span>}
                  <button className="note-action-btn" onClick={(e) => openNbMenu(e, nb.id)}><MoreHorizontal size={14} /></button>
                </div>
                {!isCollapsed && (
                  <div className="notebook-notes">
                    {nbNotes.length === 0 && <div className="sidebar-empty-hint">Sin paginas</div>}
                    {nbNotes.map(n => renderNoteItem(n, 1))}
                  </div>
                )}
              </div>
            );
          })}

          {creatingNotebook && (
            <div className="notebook-header" style={{ gap: 6, padding: '4px 8px' }}>
              <FolderPlus size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <InlineRename value="" onSave={handleCreateNotebook} onCancel={() => setCreatingNotebook(false)} />
              <button className="note-action-btn" style={{ opacity: 1 }} onClick={() => setCreatingNotebook(false)}><X size={14} /></button>
            </div>
          )}

          <div className={`sidebar-section-label ${dragOverTarget === '__uncat' ? 'drop-target-label' : ''}`}
            onDragOver={(e) => handleDragOver(e, '__uncat')} onDragLeave={() => setDragOverTarget(null)} onDrop={handleDropOnUncategorized}
            onClick={() => setActiveNotebookId(null)}>
            Paginas
          </div>
          {getTopNotes(undefined).length === 0 && <div className="sidebar-empty-hint">{searchQuery ? 'Sin resultados' : 'Sin notas aun'}</div>}
          {getTopNotes(undefined).map(n => renderNoteItem(n))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-pool-info pool-id-copy" onClick={copyPoolId} title="Click para copiar ID">
            <div className="status-dot" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{poolId}</span>
            <Clipboard size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
            {copied && <span className="copied-badge">Copiado</span>}
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme}>{theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="main-header">
          <div className="main-header-left">
            <div className="breadcrumb">
              <span style={{ cursor: 'pointer' }} onClick={onBack}>Fluent</span>
              <span className="breadcrumb-separator">/</span>
              <span>{poolName}</span>
              {activeNote?.notebookId && (
                <><span className="breadcrumb-separator">/</span><span>{notebooks.find(nb => nb.id === activeNote.notebookId)?.name}</span></>
              )}
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{activeNote?.title || 'Selecciona una nota'}</span>
            </div>
          </div>
          <div className="main-header-right">
            <div className="header-user">
              <div className="header-user-dot" style={{ background: user.color }} />
              <span>{user.name}</span>
            </div>
            <button className="header-btn" onClick={onBack}><ArrowLeft size={14} /><span>Dashboard</span></button>
          </div>
        </div>

        {activeNote && services ? (
          <Editor
            key={activeNote.id}
            doc={services.doc}
            provider={services.network.provider}
            user={{ name: user.name, color: user.color }}
            noteId={activeNote.id}
            noteTitle={activeNote.title}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: 12 }}>
            <FileText size={48} strokeWidth={1} />
            <p style={{ fontSize: 16 }}>Selecciona una nota o crea una nueva</p>
            <button className="login-btn-primary" style={{ width: 'auto' }} onClick={() => handleCreateNote()}>
              <Plus size={16} /> Nueva pagina
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN APP — Screen Router
// ════════════════════════════════════════════════════

type Screen = { type: 'profile' } | { type: 'dashboard' } | { type: 'workspace'; poolId: string; poolName: string; signalingUrl?: string };

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getUserProfile());
  const [screen, setScreen] = useState<Screen>(() => {
    return getUserProfile() ? { type: 'dashboard' } : { type: 'profile' };
  });

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setScreen({ type: 'dashboard' });
  };

  const handleOpenPool = (poolId: string, poolName: string, signalingUrl?: string) => {
    setScreen({ type: 'workspace', poolId, poolName, signalingUrl });
  };

  const handleBack = () => {
    setScreen({ type: 'dashboard' });
  };

  const handleLogout = () => {
    setScreen({ type: 'profile' });
  };

  if (screen.type === 'profile' || !userProfile) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  if (screen.type === 'dashboard') {
    return <HomeDashboard user={userProfile} onOpenPool={handleOpenPool} onLogout={handleLogout} />;
  }

  return (
    <PoolWorkspace
      key={screen.poolId}
      poolId={screen.poolId}
      poolName={screen.poolName}
      user={userProfile}
      onBack={handleBack}
      signalingUrl={screen.signalingUrl}
    />
  );
}

export default App;
