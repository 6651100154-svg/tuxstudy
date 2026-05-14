'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/types'
import type { Notification } from '@/lib/types'

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(url, { ...init, headers })
}

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok')
  const [editing, setEditing] = useState<Notification | null>(null)
  const [form, setForm] = useState({ content: '', startDate: '', endDate: '' })

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/admin/notifications')
      const json = await res.json()
      if (json.ok) setNotifs(json.data.map(mapNotif))
      else showToast(json.error || 'Lỗi tải thông báo', 'err')
    } catch {
      showToast('Lỗi kết nối', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function mapNotif(r: any): Notification {
    return {
      id: r.id,
      content: r.content,
      startDate: r.start_date || '',
      endDate: r.end_date || '',
      active: r.active,
      createdAt: r.created_at,
    }
  }

  const submit = async () => {
    if (!form.content.trim()) return
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({ content: form.content, startDate: form.startDate, endDate: form.endDate }),
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ Đã đăng thông báo')
        setForm({ content: '', startDate: '', endDate: '' })
        load()
      } else {
        showToast(json.error || 'Lỗi đăng thông báo', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          id: editing.id,
          content: editing.content,
          startDate: editing.startDate,
          endDate: editing.endDate,
          active: editing.active,
        }),
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ Đã cập nhật')
        setEditing(null)
        load()
      } else {
        showToast(json.error || 'Lỗi cập nhật', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (n: Notification) => {
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'PUT',
        body: JSON.stringify({ id: n.id, active: !n.active }),
      })
      const json = await res.json()
      if (json.ok) {
        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, active: !x.active } : x))
        showToast(n.active ? '🔕 Đã tắt thông báo' : '🔔 Đã bật thông báo')
      } else {
        showToast(json.error || 'Lỗi', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa thông báo này?')) return
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (json.ok) {
        setNotifs(prev => prev.filter(n => n.id !== id))
        showToast('🗑 Đã xóa thông báo')
      } else {
        showToast(json.error || 'Lỗi xóa', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Thông báo</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Hiển thị popup khi học viên đăng nhập</p>
      </div>

      {/* Create form */}
      <div className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 22 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>✏️ Soạn thông báo mới</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Nội dung *</label>
            <textarea
              className="input"
              rows={4}
              placeholder="VD: 🎉 Khai giảng khóa học mới! Đăng ký trước 30/6 để nhận ưu đãi đặc biệt..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Ngày bắt đầu</label>
              <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ngày kết thúc</label>
              <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>

          {form.content.trim() && (
            <div style={{ padding: 14, background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--r-lg)' }}>
              <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Xem trước popup</p>
              <p style={{ fontSize: 14, lineHeight: 1.7 }}>{form.content}</p>
            </div>
          )}

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={submit} disabled={saving || !form.content.trim()}>
            🔔 Đăng thông báo
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>THÔNG BÁO HIỆN CÓ ({notifs.length})</p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="loading-ring" /></div>
        ) : notifs.length === 0 ? (
          <div className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 48, textAlign: 'center' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>🔔</span>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thông báo nào</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifs.map(n => (
              <div key={n.id} className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 18, opacity: n.active ? 1 : 0.55, transition: 'opacity var(--transition)' }}>
                {editing?.id === n.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <textarea
                      className="input"
                      rows={3}
                      value={editing.content}
                      onChange={e => setEditing(prev => prev ? { ...prev, content: e.target.value } : null)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input className="input" type="date" value={editing.startDate || ''} onChange={e => setEditing(p => p ? { ...p, startDate: e.target.value } : null)} />
                      <input className="input" type="date" value={editing.endDate || ''} onChange={e => setEditing(p => p ? { ...p, endDate: e.target.value } : null)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={saveEdit} disabled={saving}>Lưu</button>
                      <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing(null)}>Hủy</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                        <span className={`badge ${n.active ? 'badge-success' : ''}`} style={!n.active ? { background: 'var(--bg-active)', color: 'var(--text-muted)' } : {}}>
                          {n.active ? '🟢 Đang hiện' : '⭕ Đã tắt'}
                        </span>
                        {n.startDate && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            📅 {n.startDate}{n.endDate ? ` → ${n.endDate}` : ''}
                          </span>
                        )}
                        {n.createdAt && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tạo: {formatDateTime(n.createdAt)}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65 }}>{n.content}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setEditing(n)}>Sửa</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => toggleActive(n)}>
                        {n.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => remove(n.id)}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toastType === 'err' ? 'toast-err' : ''}`}>{toast}</div>}
    </div>
  )
}
