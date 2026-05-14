'use client'
import { useEffect, useState } from 'react'
import { getActiveNotifications } from '@/lib/supabase'

export default function NotificationPopup() {
  const [notices, setNotices] = useState<{ id: string; content: string }[]>([])
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    getActiveNotifications().then(data => {
      if (data.length) { setNotices(data); setVisible(true) }
    })
  }, [])

  const current = notices.filter(n => !dismissed.includes(n.id))[idx] || null

  const dismiss = () => {
    if (!current) return
    const next = [...dismissed, current.id]
    setDismissed(next)
    if (next.length >= notices.length) setVisible(false)
    else setIdx(0)
  }

  if (!visible || !current) return null

  return (
    <div style={{ padding: '10px 16px 0' }}>
      <div className="animate-down" style={{
        background: 'var(--accent-dim)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 'var(--r-md)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📢</span>
        <p style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>{current.content}</p>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, flexShrink: 0, padding: 2 }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
