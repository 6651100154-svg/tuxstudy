'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { initials } from '@/lib/types'

interface TopBarProps {
  title?: string
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
}

export default function TopBar({ title, leftSlot, rightSlot }: TopBarProps) {
  const router = useRouter()
  const { user, logout, theme, toggleTheme } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {leftSlot ?? (
          <button
            onClick={() => router.push('/learn')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ width: 30, height: 30, background: 'var(--accent-shine)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              🎓
            </div>
          </button>
        )}
        {title && (
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightSlot}

        <button
          onClick={toggleTheme}
          style={{ background: 'var(--bg-card)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-full)', padding: '6px 10px', cursor: 'pointer', fontSize: 14, transition: 'all var(--transition)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {user && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-full)', padding: '5px 12px 5px 5px', cursor: 'pointer', transition: 'all var(--transition)' }}
            >
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : initials(user.name)
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name.split(' ').slice(-1)[0]}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
            </button>

            {menuOpen && (
              <div className="glass animate-down" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 200, padding: 8, zIndex: 200, borderRadius: 'var(--r-lg)' }}>
                <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</p>
                  {user.role === 'admin' && <span className="badge badge-accent" style={{ marginTop: 4, fontSize: 10 }}>Admin</span>}
                </div>
                <button className="nav-item" style={{ fontSize: 13, borderRadius: 'var(--r-sm)' }} onClick={() => { router.push('/learn'); setMenuOpen(false) }}>📚 Học liệu</button>
                <button className="nav-item" style={{ fontSize: 13, borderRadius: 'var(--r-sm)' }} onClick={() => { router.push('/account'); setMenuOpen(false) }}>👤 Tài khoản</button>
                {user.role === 'admin' && (
                  <button className="nav-item" style={{ fontSize: 13, borderRadius: 'var(--r-sm)' }} onClick={() => { router.push('/admin'); setMenuOpen(false) }}>⚙️ Quản trị</button>
                )}
                <hr className="divider" />
                <button className="nav-item" style={{ fontSize: 13, color: 'var(--danger)', borderRadius: 'var(--r-sm)' }} onClick={handleLogout}>🚪 Đăng xuất</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
