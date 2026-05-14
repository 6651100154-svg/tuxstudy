'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatStudyTime, initials } from '@/lib/types'

async function adminApi(path: string, method: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return res.json()
}

interface Student {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  createdAt: string
  enrollmentCount: number
  completedLessons: number
  studySec: number
}

async function loadStudents(): Promise<Student[]> {
  const [accountsRes, enrollRes, progressRes, watchRes] = await Promise.all([
    supabase.from('accounts').select('*').order('created_at', { ascending: false }),
    supabase.from('enrollments').select('account_id, course_id'),
    supabase.from('lesson_progress').select('account_id').eq('completed', true),
    supabase.from('watch_history').select('account_id, duration_sec'),
  ])

  const enrollMap: Record<string, number> = {}
  for (const e of (enrollRes.data || [])) enrollMap[e.account_id] = (enrollMap[e.account_id] || 0) + 1

  const progressMap: Record<string, number> = {}
  for (const p of (progressRes.data || [])) progressMap[p.account_id] = (progressMap[p.account_id] || 0) + 1

  const watchMap: Record<string, number> = {}
  for (const w of (watchRes.data || [])) watchMap[w.account_id] = (watchMap[w.account_id] || 0) + (w.duration_sec || 0)

  return (accountsRes.data || []).map((a: any) => ({
    id: a.id, email: a.email, name: a.name, role: a.role,
    active: a.active, createdAt: a.created_at,
    enrollmentCount: enrollMap[a.id] || 0,
    completedLessons: progressMap[a.id] || 0,
    studySec: watchMap[a.id] || 0,
  }))
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'studySec' | 'enrollments'>('createdAt')

  const load = useCallback(async () => {
    setLoading(true)
    setStudents(await loadStudents())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const toggleActive = async (student: Student) => {
    setSaving(true)
    await adminApi('/api/accounts', 'PATCH', { id: student.id, active: !student.active })
    showToast(student.active ? '🔒 Đã khóa tài khoản' : '✅ Đã mở tài khoản')
    setSaving(false)
    setSelected(prev => prev?.id === student.id ? { ...prev, active: !prev.active } : prev)
    load()
  }

  const saveName = async () => {
    if (!selected || !editName.trim()) return
    setSaving(true)
    await adminApi('/api/accounts', 'PATCH', { id: selected.id, name: editName.trim() })
    showToast('✅ Đã cập nhật tên')
    setSaving(false)
    load()
    setSelected(prev => prev ? { ...prev, name: editName.trim() } : null)
  }

  const filtered = students
    .filter(s => {
      if (filter === 'active' && !s.active) return false
      if (filter === 'inactive' && s.active) return false
      if (search) {
        const q = search.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'studySec') return b.studySec - a.studySec
      if (sortBy === 'enrollments') return b.enrollmentCount - a.enrollmentCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Student list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
            <span className="search-icon">🔍</span>
            <input className="input" placeholder="Tìm học viên..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, borderRadius: 'var(--r-full)' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilter(f)}>
                {f === 'all' ? 'Tất cả' : f === 'active' ? '✓ Hoạt động' : '✗ Bị khóa'}
              </button>
            ))}
          </div>
          <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ width: 'auto', fontSize: 12 }}>
            <option value="createdAt">Mới nhất</option>
            <option value="studySec">Giờ học</option>
            <option value="enrollments">Số khóa</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} học viên</span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}><div className="loading-ring" /></div>
          ) : (
            <div className="table-wrap" style={{ margin: 16, borderRadius: 'var(--r-lg)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Trạng thái</th>
                    <th>Khóa học</th>
                    <th>Đã học</th>
                    <th>Giờ học</th>
                    <th>Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer', background: selected?.id === s.id ? 'var(--accent-dim)' : undefined }} onClick={() => { setSelected(s); setEditName(s.name) }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(s.name)}</div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {s.active
                          ? <span className="badge badge-success" style={{ fontSize: 10 }}>Hoạt động</span>
                          : <span className="badge badge-danger" style={{ fontSize: 10 }}>Bị khóa</span>
                        }
                        {s.role === 'admin' && <span className="badge badge-accent" style={{ fontSize: 10, marginLeft: 4 }}>Admin</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{s.enrollmentCount}</td>
                      <td style={{ fontSize: 13 }}>{s.completedLessons} bài</td>
                      <td style={{ fontSize: 13 }}>{formatStudyTime(s.studySec)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width: 280, borderLeft: '1px solid var(--border)', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700 }}>Chi tiết học viên</p>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
          </div>

          <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 12px' }}>{initials(selected.name)}</div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Tên</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 13 }} />
              <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }} onClick={saveName} disabled={saving}>Lưu</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Email</span>
              <span style={{ fontWeight: 500 }}>{selected.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Khóa học</span>
              <span style={{ fontWeight: 500 }}>{selected.enrollmentCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Đã học</span>
              <span style={{ fontWeight: 500 }}>{selected.completedLessons} bài</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Giờ học</span>
              <span style={{ fontWeight: 500 }}>{formatStudyTime(selected.studySec)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tham gia</span>
              <span style={{ fontWeight: 500 }}>{formatDate(selected.createdAt)}</span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className={`btn ${selected.active ? 'btn-danger' : 'btn-success'}`}
              style={{ width: '100%', fontSize: 13 }}
              onClick={() => toggleActive(selected)}
              disabled={saving}
            >
              {selected.active ? '🔒 Khóa tài khoản' : '🔓 Mở khóa tài khoản'}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
