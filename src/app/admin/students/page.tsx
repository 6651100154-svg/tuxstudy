"use client"
import { useState, useEffect } from "react"
import { useAuth, type Account } from "@/context/AuthContext"
import { fetchSubjects, type Subject } from "@/lib/data"

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AdminStudentsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAuth()
  const students = accounts.filter(a => a.role === "student")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState<"all" | "active" | "inactive">("all")
  const [showModal, setShowModal] = useState(false)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [form, setForm] = useState({ email: "", name: "", enrollments: [] as string[] })
  const [formError, setFormError] = useState("")

  useEffect(() => { fetchSubjects().then(setSubjects) }, [])

  const allCourses = subjects.flatMap(s => s.courses.map(c => ({ ...c, subjectName: s.name, subjectIcon: s.icon })))

  const filtered = students.filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || (filter === "active" && u.enrollments.length > 0) || (filter === "inactive" && u.enrollments.length === 0)
    return matchSearch && matchFilter
  })

  const openAdd = () => {
    setEditingEmail(null)
    setForm({ email: "", name: "", enrollments: [] })
    setFormError("")
    setShowModal(true)
  }

  const openEdit = (u: Account) => {
    setEditingEmail(u.email)
    setForm({ email: u.email, name: u.name, enrollments: u.enrollments || [] })
    setFormError("")
    setShowModal(true)
  }

  const toggleCourse = (id: string) => setForm(f => ({
    ...f, enrollments: f.enrollments.includes(id) ? f.enrollments.filter(x => x !== id) : [...f.enrollments, id]
  }))

  const save = () => {
    setFormError("")
    if (!form.email.trim()) return setFormError("Email không được để trống")
    if (!form.name.trim()) return setFormError("Tên không được để trống")
    if (editingEmail) {
      updateAccount(editingEmail, { name: form.name, enrollments: form.enrollments })
    } else {
      if (accounts.find(a => a.email.toLowerCase() === form.email.toLowerCase())) return setFormError("Email đã tồn tại!")
      const newAcc: Account = {
        id: crypto.randomUUID(),
        email: form.email.trim(), name: form.name.trim(),
        role: "student", avatar: "", enrollments: form.enrollments,
        createdAt: new Date().toISOString().split("T")[0], active: true,
      }
      addAccount(newAcc)
    }
    setShowModal(false)
  }

  const handleDelete = (email: string, name: string) => {
    if (!confirm(`Xóa học viên "${name}" (${email})?`)) return
    deleteAccount(email)
  }

  const toggleActive = (u: Account) => updateAccount(u.email, { active: !u.active })

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Quản lý học viên</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            {students.length} tổng • {students.filter(u => u.enrollments.length > 0).length} đã kích hoạt • {students.filter(u => !u.active).length} bị khóa
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Thêm học viên</button>
      </div>

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 300 }} placeholder="🔍 Tìm theo tên hoặc email..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {(["all","active","inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 14px", border: "none", cursor: "pointer", fontSize: 13, transition: "all var(--transition)", background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "#fff" : "var(--text-secondary)" }}>
              {f === "all" ? "Tất cả" : f === "active" ? "Đã kích hoạt" : "Chưa kích hoạt"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <span style={{ fontSize: 40, display: "block", marginBottom: 10 }}>🔍</span>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Không tìm thấy học viên nào</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openAdd}>+ Thêm học viên mới</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
                {["Học viên", "Khóa học đã kích hoạt", "Ngày tham gia", "Trạng thái", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const courses = u.enrollments.map(id => allCourses.find(c => c.id === id)).filter(Boolean)
                return (
                  <tr key={u.email} style={{ borderTop: "1px solid var(--border)", opacity: u.active ? 1 : 0.55 }}>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{u.name || "—"}</p>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>{u.email}</p>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {courses.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chưa kích hoạt</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {courses.slice(0, 3).map(c => c && (
                            <span key={c.id} className="badge badge-accent" style={{ fontSize: 10 }}>{c.subjectIcon} {c.teacherName.split(" ").slice(-2).join(" ")}</span>
                          ))}
                          {courses.length > 3 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{courses.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-muted)" }}>{u.createdAt}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span className={`badge ${u.active ? "badge-success" : "badge-danger"}`} style={{ fontSize: 11 }}>
                        {u.active ? "🟢 Hoạt động" : "🔴 Bị khóa"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => openEdit(u)}>✏️</button>
                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => toggleActive(u)} title={u.active ? "Khóa tài khoản" : "Mở khóa"}>{u.active ? "🔒" : "🔓"}</button>
                        <button className="btn btn-danger" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => handleDelete(u.email, u.name)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editingEmail ? "Chỉnh sửa học viên" : "Thêm học viên mới"} onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="hocvien@gmail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editingEmail} style={{ opacity: editingEmail ? 0.6 : 1 }} />
            </div>
            <div>
              <label className="label">Họ và tên *</label>
              <input className="input" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <label className="label" style={{ marginBottom: 10 }}>Kích hoạt khóa học</label>
              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                {subjects.map(subj => (
                  <div key={subj.id}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.04em", padding: "6px 4px 4px", textTransform: "uppercase" }}>{subj.icon} {subj.name}</p>
                    {subj.courses.map(c => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-md)", cursor: "pointer", background: form.enrollments.includes(c.id) ? "var(--accent-dim)" : "transparent", border: `1px solid ${form.enrollments.includes(c.id) ? "rgba(99,102,241,0.3)" : "transparent"}`, transition: "all var(--transition)", marginBottom: 2 }}>
                        <input type="checkbox" checked={form.enrollments.includes(c.id)} onChange={() => toggleCourse(c.id)} />
                        <span style={{ fontSize: 14, color: form.enrollments.includes(c.id) ? "var(--accent-light)" : "var(--text-primary)" }}>{c.teacherName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--danger-dim)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--danger)" }}>⚠ {formError}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={save}>{editingEmail ? "Lưu thay đổi" : "Thêm học viên"}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
