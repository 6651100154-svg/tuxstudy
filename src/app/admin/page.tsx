"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { fetchSubjects, type Subject } from "@/lib/data"
import { supabase } from "@/lib/supabase"

type AdminAccount = {
  id: string
  email: string
  name: string
  role: "admin" | "student"
  avatar?: string
  active: boolean
  createdAt: string
  enrollments: string[]
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [accountsError, setAccountsError] = useState("")

  useEffect(() => { 
    fetchSubjects().then(setSubjects)

    const fetchAccounts = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setAccounts([])
        setAccountsError("Chưa có phiên đăng nhập admin hợp lệ.")
        return
      }

      const response = await fetch("/api/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) {
        setAccounts([])
        setAccountsError(payload?.error || "Không tải được danh sách tài khoản.")
        return
      }
      setAccounts(payload.accounts || [])
      setAccountsError("")
    }

    fetchAccounts()
  }, [])

  const students     = (accounts || []).filter(a => a.role === "student").map(a => ({ ...a, enrollments: a.enrollments || [] }))
  const totalCourses = subjects.reduce((a, s) => a + s.courses.length, 0)
  const totalLessons = subjects.reduce((a, s) => a + s.courses.reduce((b, c) => b + c.chapters.reduce((d, ch) => d + ch.lessons.length, 0), 0), 0)
  const activeUsers  = students.filter(u => (u.enrollments || []).length > 0).length

  const enrollDist = subjects.flatMap(s => s.courses).map(c => ({
    id: c.id,
    name: c.teacherName,
    subject: subjects.find(s => s.id === c.subjectId)?.name || "",
    icon: subjects.find(s => s.id === c.subjectId)?.icon || "",
    count: students.filter(u => u.enrollments.includes(c.id)).length,
  })).sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...enrollDist.map(e => e.count), 1)

  const StatCard = ({ label, value, sub, color = "var(--accent-light)" }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="card" style={{ padding: 20 }}>
      <p className="section-title" style={{ marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 34, fontWeight: 700, color, fontFamily: "var(--font-display)" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</p>}
    </div>
  )

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>Thống kê</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>Tổng quan hoạt động nền tảng</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Tổng học viên" value={students.length} sub={`${activeUsers} đã kích hoạt khóa`} />
        <StatCard label="Môn học" value={subjects.length} color="var(--success)" />
        <StatCard label="Khóa học" value={totalCourses} color="var(--warning)" />
        <StatCard label="Bài học" value={totalLessons} color="var(--info)" />
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 18 }}>Học viên theo khóa</p>
        {enrollDist.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có dữ liệu</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {enrollDist.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ width: 150, flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.subject}</p>
                </div>
                <div style={{ flex: 1, background: "var(--bg-active)", borderRadius: 99, height: 7, overflow: "hidden" }}>
                  <div style={{ width: `${(item.count / maxCount) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, width: 20, textAlign: "right" }}>{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {accountsError && (
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--danger-dim)", color: "var(--danger)", fontSize: 13 }}>
          {accountsError}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Học viên mới nhất</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-hover)" }}>
              {["Học viên", "Email", "Khóa học", "Ngày tham gia"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.slice().reverse().slice(0, 8).map(u => (
              <tr key={u.email} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{u.name || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{u.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  {u.enrollments.length > 0
                    ? <span className="badge badge-accent">{u.enrollments.length} khóa</span>
                    : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chưa kích hoạt</span>}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{u.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
