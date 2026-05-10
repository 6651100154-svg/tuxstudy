"use client"
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { supabase, getAccount, createAccount, getEnrollments, type DbAccount } from "@/lib/supabase"

// ── Types ─────────────────────────────────────────────────────────────────────
export type Role = "admin" | "student"

export interface Account {
  id: string
  email: string
  name: string
  role: Role
  avatar: string
  enrollments: string[]
  createdAt: string
  active: boolean
}

// ── Convert DB to App format ──────────────────────────────────────────────────
async function dbAccountToApp(dbAcc: DbAccount): Promise<Account> {
  const enrollments = await getEnrollments(dbAcc.id)
  return {
    id: dbAcc.id,
    email: dbAcc.email,
    name: dbAcc.name,
    role: dbAcc.role,
    avatar: dbAcc.avatar,
    enrollments,
    createdAt: dbAcc.created_at,
    active: dbAcc.active,
  }
}

// ── Context types ─────────────────────────────────────────────────────────────
interface AuthCtx {
  user: Account | null
  accounts: Account[]
  theme: "dark" | "light"
  login: (email: string, password: string) => Promise<{ ok: boolean; msg: string; role?: string }>
  register: (email: string, name: string, password: string) => Promise<{ ok: boolean; msg: string }>
  logout: () => void
  toggleTheme: () => void
  updateProfile: (data: Partial<Account>) => void
  addAccount: (acc: Account) => Promise<void>
  updateAccount: (email: string, data: Partial<Account>) => Promise<void>
  deleteAccount: (email: string) => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error("useAuth outside provider"); return c }

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [ready, setReady] = useState(false)

  // Fetch all accounts from Supabase
  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("accounts").select("*")
      if (error) return
      const appAccounts = await Promise.all((data || []).map(dbAccountToApp))
      setAccounts(appAccounts)
    } catch (e) {
      console.error("fetchAccounts error:", e)
    }
  }, [])

  // Init theme from localStorage and fetch accounts
  useEffect(() => {
    const savedTheme = (localStorage.getItem("edu_theme") || "dark") as "dark" | "light"
    setTheme(savedTheme)
    document.documentElement.setAttribute("data-theme", savedTheme)
    fetchAccounts()
    setReady(true)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) return { ok: false, msg: "Email hoặc mật khẩu không đúng" }
      if (!authData.user) return { ok: false, msg: "Lỗi đăng nhập từ Supabase" }

      const dbAcc = await getAccount(email.toLowerCase())
      if (!dbAcc) return { ok: false, msg: "Không tìm thấy hồ sơ hệ thống" }
      if (!dbAcc.active) return { ok: false, msg: "Tài khoản đã bị vô hiệu hóa" }

      const appAcc = await dbAccountToApp(dbAcc)
      setUser(appAcc)
      localStorage.setItem("edu_user", JSON.stringify(appAcc))
      return { ok: true, msg: "Đăng nhập thành công", role: appAcc.role }
    } catch (error) {
      return { ok: false, msg: "Lỗi server" }
    }
  }, [])

  const register = useCallback(async (email: string, name: string, password: string) => {
    try {
      const existing = await getAccount(email.toLowerCase())
      if (existing) return { ok: false, msg: "Email đã được đăng ký" }
      if (password.length < 6) return { ok: false, msg: "Mật khẩu tối thiểu 6 ký tự" }

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { name, role: 'student' } }
      })
      if (authErr) return { ok: false, msg: authErr.message }
      if (!authData.user) return { ok: false, msg: "Lỗi tạo tài khoản bảo mật" }

      const dbAcc = await createAccount(email.toLowerCase(), name, authData.user.id, "student")
      if (!dbAcc) return { ok: false, msg: "Lỗi tạo hồ sơ" }

      const appAcc = await dbAccountToApp(dbAcc)
      setUser(appAcc)
      localStorage.setItem("edu_user", JSON.stringify(appAcc))
      return { ok: true, msg: "Đăng ký thành công" }
    } catch (error) {
      return { ok: false, msg: "Lỗi server" }
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem("edu_user")
  }, [])

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("edu_theme", next)
  }, [theme])

  const updateProfile = useCallback((data: Partial<Account>) => {
    if (!user) return
    const updated = { ...user, ...data }
    setUser(updated)
    localStorage.setItem("edu_user", JSON.stringify(updated))
  }, [user])

  const addAccount = useCallback(async (acc: Account) => {
    alert("Vui lòng đăng ký tài khoản qua trang Đăng ký. Không thể tự tạo mật khẩu Supabase từ Admin client.")
  }, [fetchAccounts])

  const updateAccount = useCallback(async (email: string, data: Partial<Account>) => {
    try {
      // Update account fields
      const { error } = await supabase
        .from("accounts")
        .update({
          name: data.name,
          active: data.active,
          avatar: data.avatar,
        })
        .eq("email", email)
      if (error) { console.error("updateAccount error:", error); return }

      // Sync enrollments if provided
      if (data.enrollments !== undefined) {
        // Find the account id
        const { data: accData } = await supabase.from("accounts").select("id").eq("email", email).single()
        if (accData) {
          // Delete existing enrollments
          await supabase.from("enrollments").delete().eq("account_id", accData.id)
          // Insert new enrollments
          if (data.enrollments.length > 0) {
            await supabase.from("enrollments").insert(
              data.enrollments.map(courseId => ({ account_id: accData.id, course_id: courseId }))
            )
          }
        }
      }

      await fetchAccounts()
    } catch (e) {
      console.error("updateAccount error:", e)
    }
  }, [fetchAccounts])

  const deleteAccount = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.from("accounts").delete().eq("email", email)
      if (!error) {
        await fetchAccounts()
      }
    } catch (e) {
      console.error("deleteAccount error:", e)
    }
  }, [fetchAccounts])

  if (!ready) return null

  return (
    <Ctx.Provider value={{ user, accounts, theme, login, register, logout, toggleTheme, updateProfile, addAccount, updateAccount, deleteAccount }}>
      {children}
    </Ctx.Provider>
  )
}
