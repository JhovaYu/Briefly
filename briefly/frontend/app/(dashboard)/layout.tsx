'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/Toast'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="loading-center" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const navItems = [
    { href: '/notas', label: 'Notas', icon: '📝' },
    { href: '/tareas', label: 'Tareas y Calendario', icon: '✅' },
    { href: '/kanban', label: 'Kanban', icon: '📋' },
  ]

  const getPageTitle = () => {
    const item = navItems.find(n => pathname.startsWith(n.href))
    return item?.label || 'Dashboard'
  }

  const initials = user?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <ToastProvider>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <span className="logo-icon">⚡</span>
            <h1>Briefly</h1>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.href}
                className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
                onClick={() => {
                  router.push(item.href)
                  setSidebarOpen(false)
                }}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <header className="header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h2>{getPageTitle()}</h2>
          </div>

          <div className="header-right">
            <div className="user-badge">
              <div className="user-avatar">{initials}</div>
              <span>{user?.name}</span>
            </div>
            <button className="btn-logout" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
