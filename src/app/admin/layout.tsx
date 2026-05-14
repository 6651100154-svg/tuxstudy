'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import TopBar from '@/components/TopBar'

const NAV = [
  { href: '/admin',              icon: '📊', label: 'Dashboard' },
  { href: '/admin/courses',      icon: '📚', label: 'Nội dung' },
  { href: '/admin/students',     icon: '👥', label: 'Học viên' },
  { href: '/admin/codes',        icon: '🔑', label: 'Mã kích hoạt' },
  { href: '/admin/notifications',icon: '📢', label: 'Thông báo' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (user === null) router.push('/')
    if (user && user.role !== 'admin') router.push('/learn')
  }, [user])

  if (!user || user.role !== 'admin') return (
    <div className="loading-screen">
      <div className="loading-ring" />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar
        title="Quản trị"
        leftSlot={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setSidebarOpen(p => !p)}
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer', fontSize: 15 }}
            >
              ☰
            </button>
            <div style={{ width: 28, height: 28, background: 'var(--accent-shine)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🎓</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Admin</span>
          </div>
        }
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div className="sidebar sidebar-collapse scroll-thin" style={{ width: sidebarOpen ? 220 : 0, opacity: sidebarOpen ? 1 : 0, overflow: sidebarOpen ? 'visible' : 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '12px 10px', flex: 1 }}>
            {NAV.map(item => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
              return (
                <button
                  key={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ marginBottom: 3 }}
                  onClick={() => router.push(item.href)}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
          <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
            <button className="nav-item" style={{ color: 'var(--text-muted)', fontSize: 13 }} onClick={() => router.push('/learn')}>
              ← Về trang học
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
