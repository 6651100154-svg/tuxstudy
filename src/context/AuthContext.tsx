'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase, getAccount, createAccount, getEnrollments, type DbAccount } from '@/lib/supabase'
import type { Account, Role } from '@/lib/types'

// ── Validation ────────────────────────────────────────────────────────────
// Email: chuẩn định dạng, trim, lowercase, kiểm tra đuôi domain
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
// Password: bỏ khoảng trắng đầu/cuối, chỉ cho a-z A-Z 0-9 và ký tự đặc biệt phổ biến
const PASS_CHARS_RE = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email) return 'Vui lòng nhập email'
  if (!EMAIL_RE.test(email)) return 'Địa chỉ email không hợp lệ (VD: ten@gmail.com)'
  const domain = email.split('@')[1] || ''
  if (!domain.includes('.')) return 'Email phải có đuôi hợp lệ (VD: .com, .vn)'
  return null
}

export function validatePassword(pw: string, minLen = 6): string | null {
  if (!pw || !pw.trim()) return 'Vui lòng nhập mật khẩu'
  const cleaned = pw.trim()
  if (cleaned.length < minLen) return `Mật khẩu tối thiểu ${minLen} ký tự`
  if (!PASS_CHARS_RE.test(cleaned)) return 'Mật khẩu chỉ gồm chữ, số và ký tự đặc biệt thông dụng'
  return null
}

// ── Account mapping ───────────────────────────────────────────────────────
async function dbToApp(db: DbAccount): Promise<Account> {
  const enrollments = await getEnrollments(db.id)
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    role: db.role,
    avatar: db.avatar,
    active: db.active,
    createdAt: db.created_at,
    enrollments,
  }
}

// ── Context types ─────────────────────────────────────────────────────────
interface AuthCtx {
  user: Account | null
  theme: 'dark' | 'light'
  login:    (email: string, password: string) => Promise<{ ok: boolean; msg: string; role?: string }>
  register: (email: string, name: string, password: string) => Promise<{ ok: boolean; msg: string }>
  logout:   () => Promise<void>
  toggleTheme: () => void
  updateProfile: (data: Partial<Account>) => void
  refreshUser: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be inside AuthProvider')
  return c
}

// ── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<Account | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [ready, setReady] = useState(false)

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) { setUser(null); return }
    const db = await getAccount(session.user.email)
    if (db && db.active) {
      const app = await dbToApp(db)
      setUser(app)
      localStorage.setItem('edu_user', JSON.stringify(app))
    } else {
      setUser(null)
      localStorage.removeItem('edu_user')
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    const saved = (localStorage.getItem('edu_theme') || 'dark') as 'dark' | 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        localStorage.removeItem('edu_user')
        setReady(true)
        return
      }
      if (session.user.email) {
        const db = await getAccount(session.user.email)
        if (db && db.active) {
          const app = await dbToApp(db)
          setUser(app)
          localStorage.setItem('edu_user', JSON.stringify(app))
        } else {
          setUser(null)
        }
      }
      setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const emailErr = validateEmail(email)
    if (emailErr) return { ok: false, msg: emailErr }
    const pwErr = validatePassword(password.trim())
    if (pwErr) return { ok: false, msg: pwErr }

    try {
      const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      })
      if (authErr || !auth.user) return { ok: false, msg: 'Email hoặc mật khẩu không đúng' }

      const db = await getAccount(email.trim().toLowerCase())
      if (!db) return { ok: false, msg: 'Không tìm thấy hồ sơ tài khoản' }
      if (!db.active) return { ok: false, msg: 'Tài khoản đã bị vô hiệu hóa' }

      const app = await dbToApp(db)
      setUser(app)
      localStorage.setItem('edu_user', JSON.stringify(app))
      return { ok: true, msg: 'Đăng nhập thành công', role: app.role }
    } catch {
      return { ok: false, msg: 'Lỗi server, vui lòng thử lại' }
    }
  }, [])

  const register = useCallback(async (email: string, name: string, password: string) => {
    const emailErr = validateEmail(email)
    if (emailErr) return { ok: false, msg: emailErr }
    const pwErr = validatePassword(password.trim())
    if (pwErr) return { ok: false, msg: pwErr }
    if (!name.trim()) return { ok: false, msg: 'Vui lòng nhập họ và tên' }

    try {
      const existing = await getAccount(email.trim().toLowerCase())
      if (existing) return { ok: false, msg: 'Email này đã được đăng ký' }

      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: { data: { name: name.trim(), role: 'student' } },
      })
      if (authErr || !auth.user) return { ok: false, msg: authErr?.message || 'Lỗi tạo tài khoản' }

      const db = await createAccount(email.trim().toLowerCase(), name.trim(), auth.user.id, 'student')
      if (!db) return { ok: false, msg: 'Lỗi tạo hồ sơ. Vui lòng thử lại.' }

      const app = await dbToApp(db)
      setUser(app)
      localStorage.setItem('edu_user', JSON.stringify(app))
      return { ok: true, msg: 'Đăng ký thành công' }
    } catch {
      return { ok: false, msg: 'Lỗi server, vui lòng thử lại' }
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('edu_user')
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('edu_theme', next)
  }, [theme])

  const updateProfile = useCallback((data: Partial<Account>) => {
    if (!user) return
    const updated = { ...user, ...data }
    setUser(updated)
    localStorage.setItem('edu_user', JSON.stringify(updated))
  }, [user])

  if (!ready) return (
    <div className="loading-screen">
      <div className="loading-ring" />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</p>
    </div>
  )

  return (
    <Ctx.Provider value={{ user, theme, login, register, logout, toggleTheme, updateProfile, refreshUser }}>
      {children}
    </Ctx.Provider>
  )
}
