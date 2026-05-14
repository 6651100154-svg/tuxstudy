"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent-dim)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 600, color: "var(--accent-light)", flexShrink: 0, cursor: "pointer", transition: "all var(--transition)" }}>
      {initials}
    </div>
  )
}

export default function TopBar({ title }: { title?: string }) {
  const router = useRouter()
  const { user, logout, theme, toggleTheme } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (!user) return null

  return (
    <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0 }}>
      {title ? <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</p> : <div />}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển ban ngày" : "Chuyển ban đêm"}
          style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", background: "var(--bg-hover)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all var(--transition)" }}
        >{theme === "dark" ? "☀️" : "🌙"}</button>

        {/* Avatar dropdown */}
        <div ref={ref} style={{ position: "relative" }}>
          <div onClick={() => setOpen(p => !p)}>
            <Avatar name={user.name} size={34} />
          </div>

          {open && (
            <div className="animate-up" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 200, background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 200 }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{user.email}</p>
                {user.role === "admin" && <span className="badge badge-accent" style={{ marginTop: 6, fontSize: 10 }}>👑 Admin</span>}
              </div>

              <div style={{ padding: "6px" }}>
                <button className="nav-item" onClick={() => { setOpen(false); router.push("/account") }}>
                  <span>👤</span> Thông tin tài khoản
                </button>
                {user.role === "admin" && (
                  <button className="nav-item" onClick={() => { setOpen(false); router.push("/admin") }}>
                    <span>⚙️</span> Trang Admin
                  </button>
                )}
                {user.role === "student" && (
                  <>
                    <button className="nav-item" onClick={() => { setOpen(false); router.push("/learn") }}>
                      <span>📚</span> Trang học
                    </button>
                    <button className="nav-item" onClick={() => { setOpen(false); router.push("/activate") }}>
                      <span>🎟️</span> Nhập mã kích hoạt
                    </button>
                  </>
                )}
                <hr className="divider" style={{ margin: "4px 0" }} />
                <button className="nav-item" style={{ color: "var(--danger)" }} onClick={() => { logout(); router.push("/") }}>
                  <span>↩</span> Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { Avatar }
