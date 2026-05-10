"use client"
import { useEffect, useState } from "react"
import { fetchNotifications } from "@/lib/data"

export default function NotificationPopup() {
  const [notif, setNotif]   = useState<{ content: string } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Chỉ hiện 1 lần sau login (dùng sessionStorage để track)
    const shown = sessionStorage.getItem("notif_shown")
    if (shown) return

    fetchNotifications().then(notifs => {
      const today  = new Date().toISOString().split("T")[0]
      const active = notifs.find(n => n.active && (!n.endDate || n.endDate >= today))

      if (active) {
        setTimeout(() => { setNotif(active); setVisible(true) }, 600)
        sessionStorage.setItem("notif_shown", "1")
      }
    })
  }, [])

  if (!visible || !notif) return null

  return (
    <div className="overlay" onClick={() => setVisible(false)} style={{ zIndex: 300 }}>
      <div className="modal animate-up" style={{ maxWidth: 460, padding: 32 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-light)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Thông báo</span>
          </div>
          <button onClick={() => setVisible(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 2 }}>✕</button>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-primary)" }}>{notif.content}</p>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 24, padding: "11px" }} onClick={() => setVisible(false)}>
          Đã hiểu ✓
        </button>
      </div>
    </div>
  )
}
