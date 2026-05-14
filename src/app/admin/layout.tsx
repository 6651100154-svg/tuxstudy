"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import TopBar from "@/components/TopBar"

const NAV = [
  { href: "/admin",               icon: "📊", label: "Thống kê" },
  { href: "/admin/courses",       icon: "📚", label: "Môn & Giáo viên" },
  { href: "/admin/students",      icon: "👥", label: "Học viên" },
  { href: "/admin/codes",         icon: "🎟️", label: "Mã kích hoạt" },
  { href: "/admin/notifications", icon: "🔔", label: "Thông báo" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) { router.push("/"); return }
    if (user.role !== "admin") router.push("/learn")
  }, [user])

  if (!user || user.role !== "admin") return null

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", flexDirection: "column" }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 210, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎓</div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>Tuxstudy</span>
            </div>
            <span className="badge badge-accent" style={{ marginTop: 8, fontSize: 10 }}>👑 ADMIN</span>
          </div>

          <nav style={{ flex: 1, padding: "10px 8px" }}>
            <p className="section-title" style={{ padding: "0 6px", marginBottom: 6 }}>Quản lý</p>
            {NAV.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
                style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
            <button className="nav-item" onClick={() => router.push("/learn")}>
              <span>↩</span> Về trang học
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
