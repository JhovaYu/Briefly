'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/Toast'
import {
  IoHomeOutline, IoHome,
  IoDocumentTextOutline, IoDocumentText,
  IoCalendarOutline, IoCalendar,
  IoCheckboxOutline, IoCheckbox,
  IoTimeOutline, IoTime,
  IoGridOutline, IoGrid,
  IoNotificationsOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoAddOutline,
  IoHelpCircleOutline,
} from 'react-icons/io5'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',   Icon: IoHomeOutline,         ActiveIcon: IoHome         },
  { href: '/notas',     label: 'Notas',        Icon: IoDocumentTextOutline, ActiveIcon: IoDocumentText },
  { href: '/calendario',label: 'Calendario',   Icon: IoCalendarOutline,     ActiveIcon: IoCalendar     },
  { href: '/tareas',    label: 'Tareas',        Icon: IoCheckboxOutline,     ActiveIcon: IoCheckbox     },
  { href: '/horario',   label: 'Horario',       Icon: IoTimeOutline,         ActiveIcon: IoTime         },
  { href: '/kanban',    label: 'Tableros',      Icon: IoGridOutline,         ActiveIcon: IoGrid         },
]

const TOP_TABS = ['Recientes', 'Notas', 'Compartidos']

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Recientes')

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login')
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="loading-center" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const initials = user?.name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <ToastProvider>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <span className="logo-butterfly">🦋</span>
            <span className="logo-text">Briefly</span>
          </div>

          {/* Nueva nota */}
          <button
            className="sidebar-new-btn"
            onClick={() => { router.push('/notas'); setSidebarOpen(false) }}
          >
            <IoAddOutline size={18} />
            Nueva nota
          </button>

          {/* Nav */}
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ href, label, Icon, ActiveIcon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              const NavIcon = active ? ActiveIcon : Icon
              return (
                <button
                  key={href}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => { router.push(href); setSidebarOpen(false) }}
                >
                  <NavIcon size={17} />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>

          {/* Bottom */}
          <div className="sidebar-bottom">
            <button className="sidebar-bottom-row" onClick={() => {}}>
              <IoNotificationsOutline size={18} />
              <span>Notificaciones</span>
            </button>
            <button className="sidebar-bottom-row" onClick={() => {}}>
              <IoHelpCircleOutline size={18} />
              <span>Ayuda</span>
            </button>
            <div className="sidebar-divider" />
            <div className="sidebar-user-row">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.name}</span>
                <span className="sidebar-user-email">{user?.email}</span>
              </div>
            </div>
            <button className="sidebar-bottom-row sidebar-logout" onClick={logout}>
              <IoLogOutOutline size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* ── Content area ── */}
        <div className="content-area">
          {/* Top bar */}
          <header className="top-bar">
            <div className="top-bar-left">
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
              <div className="top-bar-tabs">
                {TOP_TABS.map(tab => (
                  <button
                    key={tab}
                    className={`top-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="top-bar-actions">
              <button className="topbar-icon-btn" title="Notificaciones">
                <IoNotificationsOutline size={20} />
              </button>
              <button className="topbar-icon-btn" title="Ajustes">
                <IoSettingsOutline size={20} />
              </button>
              <div className="topbar-avatar" title={user?.name}>{initials}</div>
            </div>
          </header>

          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
