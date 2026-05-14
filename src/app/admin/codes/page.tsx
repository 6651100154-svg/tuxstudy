'use client'
import { useEffect, useMemo, useState } from 'react'
import { CODE_TEMPLATES } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/types'

type CodeRow = {
  id: string
  code: string
  label: string
  template_key: string
  scope: string
  variant: string
  is_active: boolean
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
  used_by_name?: string
  used_by_email?: string
}

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(url, { ...init, headers })
}

function scopeLabel(scope: string): string {
  if (scope === 'single_course') return '1 Khóa'
  if (scope === 'single_subject') return '1 Môn'
  if (scope === 'three_subjects') return '3 Môn'
  return 'Tất cả'
}

function variantBadge(variant: string) {
  const map: Record<string, string> = { thpt: 'badge-accent', exam: 'badge-warning', vip: 'badge-danger', general: '' }
  return map[variant] || ''
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterScope, setFilterScope] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok')
  const [creating, setCreating] = useState<string>('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [expiresAt, setExpiresAt] = useState('')

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/activation-codes')
      const json = await res.json()
      if (res.ok) setCodes(json.codes || [])
      else showToast(json.error || 'Không tải được danh sách code', 'err')
    } catch {
      showToast('Lỗi kết nối', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createBatch = async (templateKey: string) => {
    const tpl = CODE_TEMPLATES.find(t => t.key === templateKey)
    if (!tpl) return
    setCreating(templateKey)
    try {
      const quantity = quantities[templateKey] || tpl.quantity
      const res = await fetchWithAuth('/api/activation-codes', {
        method: 'POST',
        body: JSON.stringify({ templateKey, quantity, expiresAt: expiresAt || null }),
      })
      const json = await res.json()
      if (res.ok) {
        showToast(`✅ Đã tạo ${json.count || 0} code cho gói "${tpl.label}"`)
        load()
      } else {
        showToast(json.error || 'Tạo code thất bại', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    } finally {
      setCreating('')
    }
  }

  const toggleCode = async (row: CodeRow) => {
    try {
      const res = await fetchWithAuth('/api/activation-codes', {
        method: 'PATCH',
        body: JSON.stringify({ id: row.id, isActive: !row.is_active }),
      })
      const json = await res.json()
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === row.id ? json.code : c))
        showToast(row.is_active ? '🔒 Đã tắt code' : '✅ Đã bật code')
      } else {
        showToast(json.error || 'Cập nhật thất bại', 'err')
      }
    } catch {
      showToast('Lỗi kết nối', 'err')
    }
  }

  const stats = useMemo(() => ({
    total: codes.length,
    active: codes.filter(c => c.is_active && !c.used_by).length,
    used: codes.filter(c => Boolean(c.used_by)).length,
    inactive: codes.filter(c => !c.is_active).length,
  }), [codes])

  const filtered = codes.filter(c => {
    if (filterScope !== 'all' && c.scope !== filterScope) return false
    if (filterStatus === 'used' && !c.used_by) return false
    if (filterStatus === 'available' && (c.used_by || !c.is_active)) return false
    if (filterStatus === 'inactive' && c.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return c.code.toLowerCase().includes(q) || (c.used_by_name || '').toLowerCase().includes(q) || (c.used_by_email || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Mã kích hoạt</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Tạo và quản lý mã theo gói kích hoạt</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Tổng code', value: stats.total, color: 'var(--text)' },
          { label: 'Sẵn sàng', value: stats.active, color: 'var(--success)' },
          { label: 'Đã dùng', value: stats.used, color: 'var(--warning)' },
          { label: 'Đã tắt', value: stats.inactive, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create panel */}
      <div className="glass" style={{ borderRadius: 'var(--r-xl)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Tạo nhanh theo gói</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="label" style={{ margin: 0 }}>Hết hạn:</label>
            <input className="input" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ width: 150, fontSize: 12 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CODE_TEMPLATES.map(tpl => (
            <div key={tpl.key} style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 10, alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{tpl.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="input"
                  type="number" min={1} max={500}
                  value={quantities[tpl.key] ?? tpl.quantity}
                  onChange={e => setQuantities(p => ({ ...p, [tpl.key]: Math.max(1, Number(e.target.value)) }))}
                  style={{ width: 72, textAlign: 'center', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>code</span>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '7px 14px' }}
                onClick={() => createBatch(tpl.key)}
                disabled={!!creating}
              >
                {creating === tpl.key ? '...' : 'Tạo'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Code list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <span className="search-icon">🔍</span>
            <input className="input" placeholder="Tìm code, học viên..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, borderRadius: 'var(--r-full)' }} />
          </div>
          <select className="input" value={filterScope} onChange={e => setFilterScope(e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
            <option value="all">Tất cả gói</option>
            <option value="single_course">1 Khóa</option>
            <option value="single_subject">1 Môn</option>
            <option value="three_subjects">3 Môn</option>
            <option value="all_courses">Tất cả</option>
          </select>
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
            <option value="all">Mọi trạng thái</option>
            <option value="available">Sẵn sàng</option>
            <option value="used">Đã dùng</option>
            <option value="inactive">Đã tắt</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} code</span>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={load} disabled={loading}>Làm mới</button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="loading-ring" /></div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 'var(--r-lg)' }}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Gói</th>
                  <th>Phạm vi</th>
                  <th>Trạng thái</th>
                  <th>Đã dùng bởi</th>
                  <th>Ngày tạo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Không có code nào</td></tr>
                ) : filtered.map(row => (
                  <tr key={row.id} style={{ opacity: row.is_active ? 1 : 0.5 }}>
                    <td>
                      <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>{row.code}</p>
                      {row.expires_at && (
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>HH: {formatDateTime(row.expires_at)}</p>
                      )}
                    </td>
                    <td>
                      <p style={{ fontSize: 13 }}>{row.label}</p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                        {row.variant && <span className={`badge ${variantBadge(row.variant)}`} style={{ fontSize: 9 }}>{row.variant.toUpperCase()}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{scopeLabel(row.scope)}</td>
                    <td>
                      {row.used_by
                        ? <span className="badge badge-warning" style={{ fontSize: 10 }}>Đã dùng</span>
                        : row.is_active
                          ? <span className="badge badge-success" style={{ fontSize: 10 }}>Sẵn sàng</span>
                          : <span className="badge badge-danger" style={{ fontSize: 10 }}>Đã tắt</span>
                      }
                    </td>
                    <td>
                      {row.used_by ? (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500 }}>{row.used_by_name || row.used_by_email || '—'}</p>
                          {row.used_at && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDateTime(row.used_at)}</p>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(row.created_at)}</td>
                    <td>
                      {!row.used_by && (
                        <button
                          className={`btn ${row.is_active ? 'btn-ghost' : 'btn-success'}`}
                          style={{ fontSize: 11, padding: '5px 10px' }}
                          onClick={() => toggleCode(row)}
                        >
                          {row.is_active ? 'Tắt' : 'Bật'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toastType === 'err' ? 'toast-err' : ''}`}>{toast}</div>}
    </div>
  )
}
