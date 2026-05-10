"use client"
import { useState, useEffect } from "react"
import { fetchNotifications, saveNotifications, uid, type Notification } from "@/lib/data"

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [form, setForm]     = useState({ content: "", startDate: "", endDate: "" })
  const [saved, setSaved]   = useState(false)

  useEffect(() => { fetchNotifications().then(setNotifs) }, [])

  const persist = (n: Notification[]) => { setNotifs(n); saveNotifications(n) }

  const add = () => {
    if (!form.content.trim()) return
    const n: Notification = { id: uid(), content: form.content.trim(), startDate: form.startDate, endDate: form.endDate, active: true }
    persist([n, ...notifs])
    setForm({ content: "", startDate: "", endDate: "" })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const toggle  = (id: string) => persist(notifs.map(n => n.id === id ? { ...n, active: !n.active } : n))
  const remove  = (id: string) => { if (confirm("Xóa thông báo này?")) persist(notifs.filter(n => n.id !== id)) }

  return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Thông báo</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>Thông báo hiện popup khi học viên đăng nhập thành công</p>
      </div>

      {/* Form */}
      <div className="card" style={{ padding: 22, marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>✏️ Soạn thông báo mới</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Nội dung *</label>
            <textarea className="input" rows={4} placeholder="VD: 🎉 Chào mừng khai giảng! Đăng ký trước 30/5 được giảm 20%..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Ngày bắt đầu</label>
              <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ngày kết thúc</label>
              <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>

          {form.content && (
            <div style={{ padding: 14, background: "var(--accent-dim)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-md)" }}>
              <p className="section-title" style={{ color: "var(--accent-light)", marginBottom: 6 }}>Preview popup</p>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{form.content}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={add}>🔔 Đăng thông báo</button>
            {saved && <span style={{ fontSize: 13, color: "var(--success)" }}>✓ Đã lưu!</span>}
          </div>
        </div>
      </div>

      {/* List */}
      <p className="section-title" style={{ marginBottom: 12 }}>Thông báo hiện có ({notifs.length})</p>
      {notifs.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: "center" }}>
          <span style={{ fontSize: 36, display: "block", marginBottom: 10 }}>🔔</span>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có thông báo nào</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifs.map(n => (
            <div key={n.id} className="card" style={{ padding: 18, opacity: n.active ? 1 : 0.5, transition: "opacity var(--transition)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                    <span className={`badge ${n.active ? "badge-success" : ""}`} style={!n.active ? { background: "var(--bg-active)", color: "var(--text-muted)" } : {}}>
                      {n.active ? "🟢 Đang hiện" : "⭕ Đã tắt"}
                    </span>
                    {n.startDate && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📅 {n.startDate}{n.endDate ? ` → ${n.endDate}` : ""}</span>}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65 }}>{n.content}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => toggle(n.id)}>{n.active ? "Tắt" : "Bật"}</button>
                  <button className="btn btn-danger" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => remove(n.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
