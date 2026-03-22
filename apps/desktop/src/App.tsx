/// <reference path="./electron.d.ts" />
import { useState, useEffect, useRef } from 'react';
import { Editor } from './infrastructure/ui/components/Editor';
import { AppServices } from './infrastructure/AppServices';
import {
  FileText, Plus, Search, Sun, Moon, LogOut, Trash2,
  MoreHorizontal, ChevronRight, ChevronDown, FolderPlus, Copy,
  Edit3, FilePlus, FolderOpen, BookOpen, X, Clipboard, GripVertical,
  ArrowLeft, Users, Clock, Zap, ListChecks, ChevronLeft, Download, QrCode,
  Settings, Type, Sidebar
} from 'lucide-react';
import type { Note, Notebook, TaskList } from '@tuxnotas/shared';
import { TaskBoard } from './infrastructure/ui/components/TaskBoard';
import {
  getUserProfile, saveUserProfile, getSavedPools, addPool, removePool,
  updatePoolLastOpened,
  type UserProfile, type PoolInfo,
} from './core/domain/UserProfile';
import { application_name } from './constants';
import QRCodeLib from 'qrcode';
import JSZip from 'jszip';
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

// ─── Export helpers ───

async function getNoteContentAsText(doc: any, noteId: string): Promise<string> {
  const fragment = doc.getXmlFragment(`note-${noteId}`);
  const lines: string[] = [];
  const walk = (node: any) => {
    if (node.toString) {
      const str = node.toString();
      // strip XML tags to get plain text
      const plain = str.replace(/<[^>]+>/g, '').trim();
      if (plain) lines.push(plain);
    }
    if (node.toArray) {
      for (const child of node.toArray()) walk(child);
    }
  };
  walk(fragment);
  return lines.join('\n');
}

async function exportNoteAs(doc: any, note: Note, format: 'txt' | 'md') {
  const content = await getNoteContentAsText(doc, note.id);
  let output = '';
  let ext = format;
  if (format === 'md') {
    output = `# ${note.title || 'Sin título'}\n\n${content}`;
  } else {
    output = `${note.title || 'Sin título'}\n${'='.repeat((note.title || 'Sin título').length)}\n\n${content}`;
  }
  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title || 'nota'}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportAllPoolAsZip(doc: any, notes: Note[], notebooks: Notebook[], poolName: string) {
  const zip = new JSZip();
  const root = zip.folder(poolName) || zip;

  // Group notes by notebook
  const nbMap = new Map<string | undefined, Note[]>();
  for (const n of notes) {
    const key = n.notebookId;
    if (!nbMap.has(key)) nbMap.set(key, []);
    nbMap.get(key)!.push(n);
  }

  const nbNameMap = new Map<string, string>();
  for (const nb of notebooks) nbNameMap.set(nb.id, nb.name);

  for (const [nbId, nbNotes] of nbMap.entries()) {
    const folderName = nbId ? (nbNameMap.get(nbId) || 'Cuaderno') : 'Sin cuaderno';
    const folder = root.folder(folderName) || root;
    for (const note of nbNotes) {
      const content = await getNoteContentAsText(doc, note.id);
      const md = `# ${note.title || 'Sin título'}\n\n${content}`;
      folder.file(`${note.title || 'nota'}.md`, md);
      folder.file(`${note.title || 'nota'}.txt`, `${note.title || 'Sin título'}\n\n${content}`);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${poolName}-export.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── QR Code Modal ───
function QrModal({ value, onClose }: { value: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: Math.min(window.innerWidth, window.innerHeight) * 0.35,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [value]);

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvasRef} />
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
          Escanea para unirte al espacio
        </p>
        <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>
          {value}
        </p>
        <button className="login-btn-secondary" style={{ marginTop: 8 }} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

// ─── Settings ───
export type SidebarStyle = 'floating' | 'header';

export function useSettings() {
  const [fontSize, setFontSize] = useState<number>(() => parseFloat(localStorage.getItem('app-font-size') || '1'));
  const [fontColor, setFontColor] = useState<string>(() => localStorage.getItem('app-font-color') || '');
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>(() => (localStorage.getItem('app-sidebar-style') as SidebarStyle) || 'floating');
  const [customColors, setCustomColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('app-custom-colors') || '[]'); } catch { return []; }
  });

  const addCustomColor = (color: string) => {
    const c = color.toLowerCase();
    if (c === '#ffffff' || c === '#000000' || customColors.includes(c)) return;
    const newColors = [c, ...customColors].slice(0, 3); // Solo guardamos 3 dinámicos (más los 2 fijos son 5)
    setCustomColors(newColors);
    localStorage.setItem('app-custom-colors', JSON.stringify(newColors));
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-multiplier', fontSize.toString());
    localStorage.setItem('app-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (fontColor) {
      document.documentElement.style.setProperty('--custom-text-color', fontColor);
    } else {
      document.documentElement.style.removeProperty('--custom-text-color');
    }
    localStorage.setItem('app-font-color', fontColor);
  }, [fontColor]);

  useEffect(() => {
    localStorage.setItem('app-sidebar-style', sidebarStyle);
  }, [sidebarStyle]);

  return { fontSize, setFontSize, fontColor, setFontColor, sidebarStyle, setSidebarStyle, customColors, addCustomColor };
}

function SettingsModal({ onClose, settings }: { onClose: () => void, settings: ReturnType<typeof useSettings> }) {
  const [tab, setTab] = useState('accesibilidad');
  return (
    <div className="settings-overlay fade-in" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-sidebar">
          <h2 className="settings-title">Ajustes</h2>
          <button className={`settings-tab ${tab === 'accesibilidad' ? 'active' : ''}`} onClick={() => setTab('accesibilidad')}>
            <Type size={16} /> Accesibilidad
          </button>
        </div>
        <div className="settings-content">
          {tab === 'accesibilidad' && (
            <div className="settings-section">
              <h3>Accesibilidad</h3>
              
              <div className="settings-row">
                <div className="settings-info">
                  <label>Tamaño de letra (x{settings.fontSize})</label>
                  <p className="settings-desc">Ajusta el tamaño del texto en toda la aplicación.</p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select 
                    className="login-input" 
                    style={{ width: '80px', padding: '6px' }} 
                    value={[0.5, 1, 1.2, 1.5, 3].includes(settings.fontSize) ? settings.fontSize : 'custom'} 
                    onChange={(e) => { if (e.target.value !== 'custom') settings.setFontSize(Number(e.target.value)) }}
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.2">1.2x</option>
                    <option value="1.5">1.5x</option>
                    <option value="3">3x</option>
                    <option value="custom">Otro</option>
                  </select>
                  <input 
                    type="number" 
                    className="login-input" 
                    style={{ width: '70px', padding: '6px' }} 
                    step="0.1" min="0.3" max="4" 
                    value={settings.fontSize} 
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) settings.setFontSize(val);
                    }} 
                  />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-info">
                  <label>Color de texto personalizado</label>
                  <p className="settings-desc">Sobrescribe el color base del texto general.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {['#ffffff', '#000000', ...settings.customColors].map(c => (
                    <button 
                      key={c} 
                      className="settings-color-btn" 
                      style={{ background: c, border: settings.fontColor === c ? '2px solid var(--accent)' : '1px solid var(--border-color)' }} 
                      onClick={() => settings.setFontColor(c)} 
                      title={c}
                    />
                  ))}
                  <div style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', border: '1px dashed var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }} title="Elegir nuevo color">
                    <Plus size={14} />
                    <input 
                      type="color" 
                      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, cursor: 'pointer', padding: 0, border: 'none', opacity: 0 }} 
                      value={settings.fontColor || '#000000'} 
                      onChange={e => {
                        const newColor = e.target.value;
                        settings.setFontColor(newColor);
                        settings.addCustomColor(newColor);
                      }} 
                    />
                  </div>
                  {settings.fontColor && <button className="login-btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => settings.setFontColor('')}>Restablecer</button>}
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-info">
                  <label>Botón del panel lateral</label>
                  <p className="settings-desc">Ubicación del botón para alternar el menú en tus espacios.</p>
                </div>
                <select className="login-input" value={settings.sidebarStyle} onChange={e => settings.setSidebarStyle(e.target.value as SidebarStyle)} style={{ width: 'auto' }}>
                  <option value="floating">Botón flotante</option>
                  <option value="header">En el encabezado</option>
                </select>
              </div>

            </div>
          )}
        </div>
        <button className="settings-close" onClick={onClose}><X size={20} /></button>
      </div>
    </div>
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
        <div className="login-logo"><img src="./logo.png" alt="Logo" style={{ width: 40, height: 40 }} /><h1>{application_name}</h1></div>
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
  const settings = useSettings();
  const [showSettings, setShowSettings] = useState(false);

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

    // Generar ID único (sin IP)
    const poolId = `pool-${Math.random().toString(36).substr(2, 9)}`;
    const signalingUrl = `ws://${signalingIp}:4444`;

    // Guardar el pool con su ID puro y la IP actual
    const pool: PoolInfo = {
      id: poolId,
      name,
      icon: 'workspace',
      lastOpened: Date.now(),
      createdAt: Date.now(),
      signalingUrl // Guardamos la URL para recordar nuestra propia IP/config
    };

    addPool(pool);
    setPools(getSavedPools());
    setCreating(false);
    setNewPoolName('');

    // Al crear, somos el HOST -> usamos la IP local
    onOpenPool(poolId, name, signalingUrl);
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
    if (!input) return;

    let poolId = input;
    let signalingUrl = undefined;

    if (input.includes('@')) {
      const parts = input.split('@');
      poolId = parts[0]; // El ID real es solo la primera parte
      const ip = parts[1];
      signalingUrl = `ws://${ip}:4444`;
    }

    // Buscar si ya existe este pool (para actualizar su IP/signalingUrl)
    const savedPools = getSavedPools();
    const existingIndex = savedPools.findIndex(p => p.id === poolId);

    const poolName = existingIndex >= 0 ? savedPools[existingIndex].name : poolId;

    // Construir objeto pool (actualizando signalingUrl si es nuevo o cambió)
    const pool: PoolInfo = {
      id: poolId,
      name: poolName,
      icon: 'collab',
      lastOpened: Date.now(),
      createdAt: existingIndex >= 0 ? savedPools[existingIndex].createdAt : Date.now(),
      signalingUrl: signalingUrl || (existingIndex >= 0 ? savedPools[existingIndex].signalingUrl : undefined)
    };

    // Esto actualiza o añade el pool
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
          <img src="./logo.png" alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{application_name}</span>
        </div>
        <div className="dashboard-topbar-right">
          <div className="header-user">
            <div className="header-user-dot" style={{ background: user.color }} />
            <span>{user.name}</span>
          </div>
          <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button className="header-btn" onClick={() => setShowSettings(true)} title="Ajustes">
            <Settings size={14} strokeWidth={1.5} />
          </button>
          <button className="header-btn" onClick={onLogout} title="Cambiar perfil">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* LEFT COLUMN — Create / Join */}
        <aside className="dashboard-left-panel fade-in">
          <div className="dashboard-greeting">
            <h1>Hola, {user.name}</h1>
            <p>Tus espacios de trabajo colaborativos</p>
          </div>

          {/* Create new pool */}
          {!creating ? (
            <div className="panel-action-card panel-action-card--new" onClick={() => setCreating(true)}>
              <div className="pool-card-icon-big"><Plus size={28} /></div>
              <span className="pool-card-new-label">Crear nuevo espacio</span>
            </div>
          ) : (
            <div className="panel-action-card panel-action-card--creating">
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
          <div className="panel-action-card panel-action-card--join">
            <div className="pool-card-icon-big" style={{ opacity: 0.6 }}><Users size={26} /></div>
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
        </aside>

        {/* RIGHT AREA — Pools grid (scrollable horizontally) */}
        <div className="dashboard-pools-area fade-in">
          <div className="dashboard-grid">
            {sorted.map((pool) => {
              let shareCode = pool.id;
              if (pool.signalingUrl) {
                try {
                  const url = new URL(pool.signalingUrl);
                  shareCode = `${pool.id}@${url.hostname}`;
                } catch { /* ignore */ }
              }
              return (
                <div key={pool.id} className="pool-card" onClick={() => { updatePoolLastOpened(pool.id); onOpenPool(pool.id, pool.name, pool.signalingUrl); }}>
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
                  <div className="pool-card-id" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, opacity: 0.5, display: 'block' }}>ID: {pool.id}</span>
                    <div className="pool-id-copy"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(shareCode);
                        const el = e.currentTarget;
                        const original = el.innerHTML;
                        el.innerText = 'Copiado!';
                        setTimeout(() => el.innerHTML = original, 1000);
                      }}
                      style={{ marginTop: 4, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, cursor: 'copy', width: 'fit-content', maxWidth: '100%' }}
                      title="Click para copiar código de invitación">
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{shareCode}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '40px 0', gridColumn: '1/-1', textAlign: 'center' }}>
                No hay espacios aún. Crea uno desde el panel izquierdo.
              </div>
            )}
          </div>
        </div>
      </main>
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} settings={settings} />}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('fluent-theme') as 'light' | 'dark') || 'dark'
  );
  const [showSettings, setShowSettings] = useState(false);
  
  const settings = useSettings();
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const isDraggingRef = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarCollapseBtnRef = useRef<HTMLButtonElement>(null);

  const handleMouseDownResizer = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = false;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      if (Math.abs(diff) > 2 && !isDraggingRef.current) {
        isDraggingRef.current = true;
        document.body.classList.add('is-resizing-sidebar');
      }
      if (isDraggingRef.current && sidebarRef.current) {
         let newWidth = startWidth + diff;
         if (newWidth < 180) newWidth = 180;
         if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;
         // Actualización DIRECTA del DOM para latencia cero ("efecto laser")
         sidebarRef.current.style.width = `${newWidth}px`;
         sidebarRef.current.style.minWidth = `${newWidth}px`;
         if (sidebarCollapseBtnRef.current && settings.sidebarStyle === 'floating') {
            sidebarCollapseBtnRef.current.style.left = `${newWidth - 14}px`;
         }
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.body.classList.remove('is-resizing-sidebar');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (isDraggingRef.current) {
         // Finalizar arrastre y sincronizar estado de React
         const diff = upEvent.clientX - startX;
         let newWidth = startWidth + diff;
         if (newWidth < 180) newWidth = 180;
         if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;
         setSidebarWidth(newWidth);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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

  // Logic for Tasks
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [activeTaskListId, setActiveTaskListId] = useState<string | null>(null);
  const [creatingTaskList, setCreatingTaskList] = useState(false);

  useEffect(() => {
    if (!services) return;
    const updateTasks = () => {
      setTaskLists(services.tasks.getTaskLists(poolId));
    };
    updateTasks();
    services.doc.on('update', updateTasks);
    return () => services.doc.off('update', updateTasks);
  }, [services, poolId]);

  const handleCreateTaskList = (name: string) => {
    setCreatingTaskList(false);
    if (!name.trim() || !services) return;
    const list = services.tasks.createTaskList(name, poolId);
    setActiveTaskListId(list.id);
    setActiveNoteId(null); // Deselect note
  };

  const handleDeleteTaskList = (id: string) => {
    if (!services) return;
    services.tasks.deleteTaskList(id);
    if (activeTaskListId === id) setActiveTaskListId(null);
  };


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
    let textToCopy = poolId;
    if (signalingUrl) {
      try {
        const url = new URL(signalingUrl);
        textToCopy = `${poolId}@${url.hostname}`;
      } catch { }
    }
    try { await navigator.clipboard.writeText(textToCopy); } catch { /* fallback */ }
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
    { label: 'Exportar (.md)', icon: <Download size={14} />, onClick: () => { const n = notes.find(x => x.id === noteId); if (n && services) exportNoteAs(services.doc, n, 'md'); } },
    { label: 'Exportar (.txt)', icon: <Download size={14} />, onClick: () => { const n = notes.find(x => x.id === noteId); if (n && services) exportNoteAs(services.doc, n, 'txt'); } },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => handleDeleteNote(noteId), danger: true },
  ];

  const nbMenuItems = (nbId: string) => [
    { label: 'Renombrar', icon: <Edit3 size={14} />, onClick: () => { setRenamingId(nbId); setRenamingType('notebook'); } },
    { label: 'Nueva pagina aqui', icon: <FilePlus size={14} />, onClick: () => handleCreateNote(nbId) },
    { label: 'Exportar cuaderno', icon: <Download size={14} />, onClick: () => {
        if (!services) return;
        const nbNotes = notes.filter(n => n.notebookId === nbId);
        const nb = notebooks.find(n => n.id === nbId);
        exportAllPoolAsZip(services.doc, nbNotes, nb ? [nb] : [], nb?.name || 'cuaderno');
      }
    },
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
      <aside 
        ref={sidebarRef}
        className={`sidebar${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth, minWidth: sidebarCollapsed ? 0 : sidebarWidth }}
      >
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
            <button className="sidebar-action-btn" onClick={() => { if (services) exportAllPoolAsZip(services.doc, notes, notebooks, poolName); }} title="Exportar todo">
              <Download size={16} />
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
          {/* TASK LISTS SECTION */}
          <div className="sidebar-section-label">Listas de Tareas</div>
          {taskLists.map(list => (
            <div key={list.id}
              className={`sidebar-note-item ${activeTaskListId === list.id ? 'active' : ''}`}
              onClick={() => { setActiveTaskListId(list.id); setActiveNoteId(null); }}
              style={{ paddingLeft: 8 }}>
              <ListChecks className="note-icon" size={15} />
              <span className="note-title">{list.name}</span>
              <button className="note-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteTaskList(list.id); }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {creatingTaskList ? (
            <div className="notebook-header" style={{ gap: 6, padding: '4px 8px' }}>
              <ListChecks size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <InlineRename value="" onSave={handleCreateTaskList} onCancel={() => setCreatingTaskList(false)} />
            </div>
          ) : (
            <button className="sidebar-action-btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '4px 8px', opacity: 0.7 }} onClick={() => setCreatingTaskList(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> Nueva lista
            </button>
          )}

          <div className="divider" style={{ margin: '8px 0' }} />

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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {/* Intentar mostrar código completo si hay URL */}
              {(() => {
                if (signalingUrl) {
                  try {
                    const url = new URL(signalingUrl);
                    return `${poolId}@${url.hostname}`;
                  } catch { }
                }
                return poolId;
              })()}
            </span>
            <Clipboard size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
            {copied && <span className="copied-badge">Copiado</span>}
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme}>{theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}</button>
          <button className="theme-toggle-btn" onClick={() => setShowQr(true)} title="Mostrar QR"><QrCode size={14} /></button>
        </div>
      </aside>

      {/* Resizer */}
      {!sidebarCollapsed && (
        <div 
          role="separator" 
          tabIndex={0} 
          aria-label="Cambiar el tamaño lateral"
          className="sidebar-resizer"
          onMouseDown={handleMouseDownResizer}
          onClick={() => { if (!isDraggingRef.current) setSidebarCollapsed(true); }}
        >
          <div className="resizer-tooltip">
            <div><strong>Cerrar</strong> Clic o Ctrl+\</div>
            <div><strong>Redimensionar</strong> Arrastrar</div>
          </div>
        </div>
      )}

      {/* SIDEBAR COLLAPSE TOGGLE — OUTSIDE aside so it's always visible */}
      {settings.sidebarStyle === 'floating' && (
        <button
          ref={sidebarCollapseBtnRef}
          className="sidebar-collapse-btn"
          style={{ left: sidebarCollapsed ? 4 : sidebarWidth - 14 }}
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      {/* MAIN CONTENT */}
      <div className="main-content">
        <div className="main-header">
          <div className="main-header-left">
            {settings.sidebarStyle === 'header' && (
              <button className="sidebar-header-toggle" onClick={() => setSidebarCollapsed(c => !c)} title="Alternar panel lateral">
                <Sidebar size={16} />
              </button>
            )}
            <div className="breadcrumb">
              <span style={{ cursor: 'pointer' }} onClick={onBack}>{application_name}</span>
              <span className="breadcrumb-separator">/</span>
              <span>{poolName}</span>
              {activeNote?.notebookId && (
                <><span className="breadcrumb-separator">/</span><span>{notebooks.find(nb => nb.id === activeNote.notebookId)?.name}</span></>
              )}
              {activeTaskListId && (
                <><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{taskLists.find(l => l.id === activeTaskListId)?.name}</span></>
              )}
              {activeNoteId && (
                <><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{activeNote?.title || 'Selecciona una nota'}</span></>
              )}
            </div>
          </div>
          <div className="main-header-right">
            <div className="header-user">
              <div className="header-user-dot" style={{ background: user.color }} />
              <span>{user.name}</span>
            </div>
            <button className="header-btn" onClick={() => setShowSettings(true)} title="Ajustes">
              <Settings size={14} strokeWidth={1.5} />
            </button>
            <button className="header-btn" onClick={onBack}><ArrowLeft size={14} /><span>Dashboard</span></button>
          </div>
        </div>

        {activeTaskListId && services ? (
          <TaskBoard
            taskList={taskLists.find(t => t.id === activeTaskListId)!}
            service={services.tasks}
            doc={services.doc}
          />
        ) : activeNote && services ? (
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
            <p style={{ fontSize: 16 }}>Selecciona una nota, lista de tareas o crea una nueva</p>
            <button className="login-btn-primary" style={{ width: 'auto' }} onClick={() => handleCreateNote()}>
              <Plus size={16} /> Nueva pagina
            </button>
          </div>
        )}
      </div>

      {/* QR MODAL */}
      {showQr && (
        <QrModal
          value={(() => {
            let code = poolId;
            if (signalingUrl) {
              try {
                const url = new URL(signalingUrl);
                code = `${poolId}@${url.hostname}`;
              } catch { /* ignore */ }
            }
            return code;
          })()}
          onClose={() => setShowQr(false)}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} settings={settings} />}
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
