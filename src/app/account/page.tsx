"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { fetchSubjects, getSubjectByCourse, getAllLessons, type Subject, type Chapter, type Lesson } from "@/lib/data"
import { supabase } from "@/lib/supabase"
import TopBar from "@/components/TopBar"

export default function AccountPage() {
  const router = useRouter()
  const { user, updateProfile, logout } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  const [editName, setEditName]       = useState(user?.name || "")
  const [editEmail, setEditEmail]     = useState(user?.email || "")
  const [oldPass, setOldPass]         = useState("")
  const [newPass, setNewPass]         = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [msg, setMsg]                 = useState("")
  const [msgType, setMsgType]         = useState<"ok" | "err">("ok")
  const [tab, setTab]                 = useState<"profile" | "progress" | "security">("profile")

  useEffect(() => { if (!user) router.push("/") }, [user])
  if (!user) return null

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(""), 3000)
  }

  const saveProfile = () => {
    if (!editName.trim()) return showMsg("Tên không được để trống", "err")
    updateProfile({ name: editName.trim() })
    showMsg("✓ Đã cập nhật thông tin")
  }

  const savePassword = async () => {
    if (!oldPass) return showMsg("Vui lòng nhập mật khẩu hiện tại", "err")
    if (newPass.length < 6) return showMsg("Mật khẩu mới tối thiểu 6 ký tự", "err")
    if (newPass !== confirmPass) return showMsg("Mật khẩu xác nhận không khớp", "err")

    // Verify old password by re-authenticating
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPass,
    })
    if (reAuthErr) return showMsg("Mật khẩu hiện tại không đúng", "err")
    
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) return showMsg("Lỗi khi đổi mật khẩu", "err")
    
    setOldPass(""); setNewPass(""); setConfirmPass("")
    showMsg("✓ Đã đổi mật khẩu thành công")
  }

  // Progress data
  const progressKey = `edu_progress_${user.email}`
  const completed: string[] = JSON.parse(localStorage.getItem(progressKey) || "[]")
  const allLessons = getAllLessons(subjects)

  const enrolledCourses = subjects
    .flatMap(s => s.courses)
    .filter(c => user.enrollments.includes(c.id))

  const getCourseProgress = (courseId: string) => {
    const course = enrolledCourses.find(c => c.id === courseId)
    if (!course) return { done: 0, total: 0, pct: 0 }
    const all  = course.chapters.flatMap((ch: Chapter) => ch.lessons)
    const done = all.filter((l: Lesson) => completed.includes(l.id)).length
    return { done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 }
  }

  const totalDone  = completed.filter(id => allLessons.some(l => l.id === id)).length
  const totalAll   = enrolledCourses.reduce((a, c) => a + c.chapters.flatMap((ch: Chapter) => ch.lessons).length, 0)
  const totalPct   = totalAll ? Math.round(totalDone / totalAll * 100) : 0

  const TABS = [
    { id: "profile",  label: "Thông tin",  icon: "👤" },
    { id: "progress", label: "Tiến độ",    icon: "📊" },
    { id: "security", label: "Bảo mật",    icon: "🔒" },
  ] as const

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar title="Tài khoản" />

      <div style={{ flex: 1, padding: "32px 24px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div className="card" style={{ padding: 24, marginBottom: 24, display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-dim)", border: "3px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "var(--accent-light)", flexShrink: 0 }}>
            {user.name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{user.name}</h1>
              {user.role === "admin" && <span className="badge badge-accent">👑 Admin</span>}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user.email}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Tham gia: {user.createdAt}</p>
          </div>
          {user.role === "student" && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-light)", fontFamily: "var(--font-display)" }}>{totalPct}%</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Tổng tiến độ</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{totalDone}/{totalAll} bài</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: 4, marginBottom: 24, border: "1px solid var(--border)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all var(--transition)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: tab === t.id ? "var(--accent)" : "transparent", color: tab === t.id ? "#fff" : "var(--text-secondary)" }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Profile tab ─────────────────────────────────────────────────── */}
        {tab === "profile" && (
          <div className="card animate-fade" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Thông tin cá nhân</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Họ và tên</label>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={editEmail} disabled style={{ opacity: 0.6 }} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Email không thể thay đổi</p>
              </div>
              <div>
                <label className="label">Vai trò</label>
                <div style={{ padding: "10px 13px", background: "var(--bg-input)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--text-secondary)" }}>
                  {user.role === "admin" ? "👑 Quản trị viên" : "📚 Học viên"}
                </div>
              </div>
            </div>

            {msg && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: msgType === "ok" ? "var(--success-dim)" : "var(--danger-dim)", borderRadius: "var(--radius-md)", fontSize: 13, color: msgType === "ok" ? "var(--success)" : "var(--danger)" }}>
                {msg}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={saveProfile}>Lưu thay đổi</button>
              <button className="btn btn-ghost" onClick={() => setEditName(user.name)}>Hủy</button>
            </div>
          </div>
        )}

        {/* ── Progress tab ────────────────────────────────────────────────── */}
        {tab === "progress" && (
          <div className="animate-fade">
            {enrolledCourses.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>📭</span>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Chưa đăng ký khóa học nào</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {enrolledCourses.map(course => {
                  const subj = getSubjectByCourse(subjects, course.id)
                  const prog = getCourseProgress(course.id)
                  const lessons = course.chapters.flatMap((ch: Chapter) => ch.lessons)
                  return (
                    <div key={course.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <span style={{ fontSize: 24 }}>{subj?.icon}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600 }}>{course.teacherName}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{subj?.name} • {lessons.length} bài học</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-light)" }}>{prog.pct}%</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{prog.done}/{prog.total}</p>
                        </div>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${prog.pct}%` }} /></div>
                      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {lessons.slice(0, 8).map((l: Lesson) => (
                          <span key={l.id} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: completed.includes(l.id) ? "var(--success-dim)" : "var(--bg-active)", color: completed.includes(l.id) ? "var(--success)" : "var(--text-muted)" }}>
                            {completed.includes(l.id) ? "✓" : "○"} {l.title.replace(/^Bài \d+ - /, "")}
                          </span>
                        ))}
                        {lessons.length > 8 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{lessons.length - 8} bài khác</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Security tab ────────────────────────────────────────────────── */}
        {tab === "security" && (
          <div className="card animate-fade" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Đổi mật khẩu</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Mật khẩu hiện tại *</label>
                <input className="input" type="password" placeholder="••••••••" value={oldPass} onChange={e => setOldPass(e.target.value)} />
              </div>
              <div>
                <label className="label">Mật khẩu mới</label>
                <input className="input" type="password" placeholder="Tối thiểu 6 ký tự" value={newPass} onChange={e => setNewPass(e.target.value)} />
              </div>
              <div>
                <label className="label">Xác nhận mật khẩu mới</label>
                <input className="input" type="password" placeholder="Nhập lại mật khẩu mới" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
              </div>
            </div>

            {msg && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: msgType === "ok" ? "var(--success-dim)" : "var(--danger-dim)", borderRadius: "var(--radius-md)", fontSize: 13, color: msgType === "ok" ? "var(--success)" : "var(--danger)" }}>
                {msg}
              </div>
            )}

            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={savePassword}>Đổi mật khẩu</button>

            <hr className="divider" style={{ marginTop: 28 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Đăng xuất</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Đăng xuất khỏi tài khoản trên thiết bị này</p>
              <button className="btn btn-danger" onClick={() => { logout(); router.push("/") }}>↩ Đăng xuất</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
