import { useState, useEffect } from 'react';
import {
  Clock, FileText, Archive, Trash2, LogOut,
  Sun, Moon, Bell, Settings, Folder, Activity, Plus, Edit2, FolderPlus,
  History, Calendar, CheckSquare
} from 'lucide-react';
import {
  type UserProfile, type PoolInfo,
  getSavedPools, addPool, removePool, updatePoolLastOpened
} from '../../core/domain/UserProfile';
import { useSettings, SettingsModal } from '../components/SettingsModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { ScheduleScreen } from './ScheduleScreen';

export function HomeDashboard({ user, onOpenPool, onLogout, onOpenCalendar }: {
  user: UserProfile;
  onOpenPool: (poolId: string, name: string, signalingUrl?: string) => void;
  onLogout: () => void;
  onOpenCalendar: () => void;
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

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

    const poolId = `pool-${Math.random().toString(36).substr(2, 9)}`;
    const signalingUrl = `ws://${signalingIp}:4444`;

    const pool: PoolInfo = {
      id: poolId,
      name,
      icon: 'workspace',
      lastOpened: Date.now(),
      createdAt: Date.now(),
      signalingUrl
    };

    addPool(pool);
    setPools(getSavedPools());
    setCreating(false);
    setNewPoolName('');

    onOpenPool(poolId, name, signalingUrl);
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;

    try {
      if (window.electronAPI) {
        await window.electronAPI.stopSignaling();
      }
    } catch (e) {
      console.error('Error stopping signaling:', e);
    }

    const input = joinId.trim();
    if (!input) return;

    let poolId = input;
    let signalingUrl = undefined;

    if (input.includes('@')) {
      const parts = input.split('@');
      poolId = parts[0];
      const ip = parts[1];
      signalingUrl = `ws://${ip}:4444`;
    }

    const savedPools = getSavedPools();
    const existingIndex = savedPools.findIndex(p => p.id === poolId);
    const poolName = existingIndex >= 0 ? savedPools[existingIndex].name : poolId;

    const pool: PoolInfo = {
      id: poolId,
      name: poolName,
      icon: 'collab',
      lastOpened: Date.now(),
      createdAt: existingIndex >= 0 ? savedPools[existingIndex].createdAt : Date.now(),
      signalingUrl: signalingUrl || (existingIndex >= 0 ? savedPools[existingIndex].signalingUrl : undefined)
    };

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

  const sorted = [...pools].sort((a, b) => b.lastOpened - a.lastOpened);

  if (showSchedule) {
    return <ScheduleScreen user={user} onBack={() => setShowSchedule(false)} />;
  }

  return (
    <div className="db2-container">
      {/* SIDEBAR */}
      <aside className="db2-sidebar">
        <div className="db2-brand">
          <div className="db2-logo" style={{ background: 'transparent' }}>
            <img src="./logo.png" alt="Briefly Logo" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          </div>
          <div className="db2-brand-text">
            <h2>Briefly</h2>
            <span>Estudio Personal</span>
          </div>
        </div>

        <div className="db2-new-btn-wrapper">
          <button className="db2-btn-primary" onClick={() => setCreating(!creating)}>
            <Plus size={16} /> Nueva Nota
          </button>
        </div>

        <nav className="db2-nav">
          <button className="db2-nav-item active" onClick={() => setShowSchedule(false)}><History size={16} /> Dashboard</button>
          <button className="db2-nav-item"><FileText size={16} /> Notas</button>
          <button className="db2-nav-item" onClick={onOpenCalendar}><Calendar size={16} /> Calendario</button>
          <button className="db2-nav-item"><CheckSquare size={16} /> Tareas</button>
          <button className="db2-nav-item" onClick={() => setShowSchedule(true)}><Clock size={16} /> Horario</button>
          <button className="db2-nav-item"><Archive size={16} /> Tableros</button>
          <button className="db2-nav-item"><Trash2 size={16} /> Papelera</button>
        </nav>

        <div className="db2-bottom-nav">
          <div className="db2-user-profile">
            <div className="db2-user-avatar2" style={{ background: user.color }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="db2-user-name2" title={user.name}>
              {user.name}
            </div>
            <button className="db2-user-icon-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Cambiar tema">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="db2-user-icon-btn" onClick={() => setShowNotifications(true)} title="Notificaciones">
              <Bell size={18} />
            </button>
          </div>
          <div className="db2-bottom-divider"></div>

          <button className="db2-nav-item" onClick={() => setShowSettings(true)}><Settings size={16} /> Ajustes</button>
          <button className="db2-nav-item" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="db2-main">
        {/* CONTENT */}
        <div className="db2-content">

          <div className="db2-header">
            <h1>Mi Espacio de Trabajo</h1>
            <p>Administra tus grupos y últimos hallazgos.</p>
          </div>

          <div className="db2-grid">
            {/* LEFT COLUMN: Mis grupos */}
            <div className="db2-col-left">
              <div className="db2-section-header">
                <h3><Folder size={14} fill="currentColor" /> Mis grupos</h3>
                <span className="db2-link" onClick={() => setCreating(!creating)}>Expandir todo</span>
              </div>

              {/* If creating, show inline inputs here to match current logic */}
              {creating && (
                <div className="db2-group-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <input className="login-input" placeholder="Nombre de nuevo grupo..." value={newPoolName} onChange={e => setNewPoolName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} style={{ marginBottom: '8px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="login-btn-primary" style={{ padding: '6px' }} onClick={handleCreate}>Crear</button>
                    <button className="login-btn-secondary" style={{ padding: '6px' }} onClick={() => setCreating(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              {sorted.length === 0 && !creating ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '20px' }}>No hay grupos.</div>
              ) : (
                sorted.map(pool => (
                  <div key={pool.id} className="db2-group-card" onClick={() => { updatePoolLastOpened(pool.id); onOpenPool(pool.id, pool.name, pool.signalingUrl); }}>
                    <div className="db2-group-icon">
                      <Folder size={16} fill="currentColor" />
                    </div>
                    <span className="db2-group-title">{pool.name}</span>
                    <span className="db2-badge">8 NOTAS</span>
                    <button className="pool-card-delete" onClick={(e) => handleDelete(pool.id, e)} title="Eliminar" style={{ marginLeft: 'auto', background: 'transparent' }}>
                      <Trash2 size={14} color="var(--text-tertiary)" />
                    </button>
                  </div>
                ))
              )}

              <div className="db2-section-header" style={{ marginTop: '24px' }}>
                <span className="db2-link" style={{ marginLeft: '10px' }}>Unirse a grupo con código...</span>
              </div>
              <div className="db2-group-card" style={{ cursor: 'default' }}>
                <input className="login-input" placeholder="ID del grupo..." value={joinId} onChange={e => setJoinId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ flex: 1, marginRight: '8px', padding: '6px', fontSize: '13px' }} />
                <button className="login-btn-secondary" style={{ padding: '6px 10px' }} onClick={handleJoin}>Unirse</button>
              </div>
            </div>

            {/* RIGHT COLUMN: Horarios & Notas recientes */}
            <div className="db2-col-right">

              <div className="db2-section-header">
                <h3>Horarios</h3>
              </div>
              <div className="db2-horarios-grid">
                {/* Mocked Cards reproducing design */}
                <div className="db2-horario-card">
                  <div className="db2-icon-badge pink"><Activity size={12} /></div>
                  <h4>Matemáticas</h4>
                  <p>Principios fundamentales de UX para interfaces móviles de alta fidelidad...</p>
                  <div className="db2-time"><Clock size={12} /> EN 1:34 HORAS</div>
                </div>
                <div className="db2-horario-card">
                  <div className="db2-icon-badge blue"><Activity size={12} /></div>
                  <h4>Interfaces Humano-Computador...</h4>
                  <p>Normalización de bases de datos relacionales y optimización de queries...</p>
                  <div className="db2-time"><Clock size={12} /> EN 21 MINUTOS</div>
                </div>
                <div className="db2-horario-card">
                  <div className="db2-icon-badge blue"><Activity size={12} /></div>
                  <h4>Sistemas Distribuidos</h4>
                  <p>Implementación de P2P y arquitecturas de sincronización local...</p>
                  <div className="db2-time"><Clock size={12} /> MAÑANA</div>
                </div>
                <div className="db2-horario-card">
                  <div className="db2-icon-badge blue"><Activity size={12} /></div>
                  <h4>Interfaces Humano-Computador...</h4>
                  <p>Normalización de bases de datos relacionales y optimización de queries...</p>
                  <div className="db2-time"><Clock size={12} /> EN 21 MINUTOS</div>
                </div>
              </div>

              <div className="db2-section-header" style={{ marginTop: '30px' }}>
                <h3><Clock size={14} /> Notas recientes</h3>
              </div>

              <div className="db2-recent-list">
                <div className="db2-recent-row">
                  <FileText size={16} />
                  <div className="db2-recent-info">
                    <strong>Briefing Cliente - Web 3.0</strong>
                    <span>Modificado hace 15 minutos</span>
                  </div>
                </div>
                <div className="db2-recent-row">
                  <FileText size={16} />
                  <div className="db2-recent-info">
                    <strong>Componentes de Diseño Atómico</strong>
                    <span>Modificado hace 1 hora</span>
                  </div>
                </div>
                <div className="db2-recent-row">
                  <FileText size={16} />
                  <div className="db2-recent-info">
                    <strong>Notas Reunión QA</strong>
                    <span>Modificado hace 1 día</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* BOTTOM FLOATING BUTTONS */}
        <div className="db2-floating-actions">
          <button className="db2-float-btn secondary"><FolderPlus size={16} /> NUEVA CARPETA</button>
          <button className="db2-float-btn primary" onClick={() => setCreating(true)}><Edit2 size={16} /> NUEVA NOTA</button>
        </div>

      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} settings={settings} />}
      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
