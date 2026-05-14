'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchSubjectsMeta, parseTsvBulk } from '@/lib/data'
import { uid } from '@/lib/types'
import type { Subject, Course } from '@/lib/types'
import { supabase } from '@/lib/supabase'

// ── Drive ID extraction ───────────────────────────────────────────────────
function extractDriveId(input: string): string {
  const m = input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || input.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

// ── API helpers (with auth token) ─────────────────────────────────────────
async function api(path: string, method: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// ── Modal ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} style={{ padding: 26 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Bulk Import Modal ─────────────────────────────────────────────────────
function BulkImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [tsv, setTsv] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const parsePreview = () => {
    if (!tsv.trim()) { setPreview([]); return }
    const rows = parseTsvBulk(tsv)
    setPreview(rows.slice(0, 10))
  }

  const doImport = async () => {
    if (!tsv.trim()) { setError('Vui lòng dán dữ liệu TSV'); return }
    setLoading(true); setError('')
    const rows = parseTsvBulk(tsv)
    const res = await api('/api/admin/bulk-import', 'POST', { rows })
    setLoading(false)
    if (!res.ok) { setError(res.error || 'Import lỗi'); return }
    setResult(`Import thành công: ${res.data.created} bài mới, ${res.data.skipped} đã tồn tại.`)
    setTimeout(() => { onSuccess(); onClose() }, 2500)
  }

  return (
    <Modal title="📥 Import hàng loạt từ TSV" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">
            Dán dữ liệu TSV (Tab-Separated) — mẫu: index↹Subject↹Provider↹FilePath↹FileType↹DriveID
          </label>
          <textarea
            className="input"
            rows={10}
            placeholder={'688\t08. COMBO ĐGÁ NĂNG LỰC...\t02. ĐÁNH GIÁ NĂNG LỰC HÀ NỘI...\tI:\\...\\file.mp4\tFile MP4\t1RL3h4EIHsF...'}
            value={tsv}
            onChange={e => setTsv(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 200 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={parsePreview}>👁 Xem trước</button>
          <button className="btn btn-primary" onClick={doImport} disabled={loading}>
            {loading ? <span className="loading-ring" style={{ width: 14, height: 14 }} /> : '📥 Import ngay'}
          </button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'var(--danger-dim)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger)' }}>⚠ {error}</div>}
        {result && <div style={{ padding: '10px 14px', background: 'var(--success-dim)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--success)' }}>✅ {result}</div>}

        {preview.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Xem trước {preview.length} dòng đầu:</p>
            <div className="table-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>#</th><th>Subject</th><th>Provider</th><th>File</th><th>Type</th><th>Drive ID</th></tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 11 }}>{r.index}</td>
                      <td style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subjectRaw}</td>
                      <td style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.providerRaw}</td>
                      <td style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filePath.split(/[\\/]/).pop()}</td>
                      <td style={{ fontSize: 11 }}>{r.fileType}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{r.driveId.slice(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Add/Edit Subject Modal ────────────────────────────────────────────────
function SubjectModal({ subject, onClose, onSave }: {
  subject?: Subject; onClose: () => void; onSave: (data: any) => void
}) {
  const [name, setName] = useState(subject?.name || '')
  const [icon, setIcon] = useState(subject?.icon || '📖')
  const [color, setColor] = useState(subject?.color || '#6366f1')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setLoading(true)
    await onSave({ id: subject?.id || uid(), name: name.trim(), icon, color })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title={subject ? 'Sửa môn học' : 'Thêm môn học'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label className="label">Tên môn *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Toán, Lý, Hóa..." autoFocus /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Icon</label><input className="input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="VD: 📐" style={{ fontSize: 20 }} /></div>
          <div style={{ flex: 1 }}><label className="label">Màu sắc</label><input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 'var(--r-md)', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', cursor: 'pointer' }} /></div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={loading || !name.trim()}>
          {loading ? <span className="loading-ring" style={{ width: 14, height: 14 }} /> : subject ? 'Lưu thay đổi' : 'Thêm môn'}
        </button>
      </div>
    </Modal>
  )
}

// ── Add/Edit Course Modal ─────────────────────────────────────────────────
function CourseModal({ course, providerId, onClose, onSave }: {
  course?: Course; providerId: string; onClose: () => void; onSave: (data: any) => void
}) {
  const [name, setName] = useState(course?.name || '')
  const [tagline, setTagline] = useState(course?.tagline || '')
  const [desc, setDesc] = useState(course?.description || '')
  const [coverImage, setCoverImage] = useState(course?.coverImage || '')
  const [previewVideoId, setPreviewVideoId] = useState(course?.previewVideoId || '')
  const [isPublished, setIsPublished] = useState(course?.isPublished ?? false)
  const [isTrialEnabled, setIsTrialEnabled] = useState(course?.isTrialEnabled ?? false)
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setLoading(true)
    await onSave({
      id: course?.id || uid(),
      provider_id: providerId,
      name: name.trim(), tagline, description: desc, cover_image: coverImage,
      preview_video_id: previewVideoId, is_published: isPublished, is_trial_enabled: isTrialEnabled,
    })
    setLoading(false)
    onClose()
  }

  return (
    <Modal title={course ? 'Sửa khóa học' : 'Thêm khóa học'} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label className="label">Tên khóa học *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Toán ĐGNL Kim Cương" autoFocus /></div>
        <div><label className="label">Slogan / Tagline</label><input className="input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="VD: Chinh phục ĐGNL với phương pháp hiệu quả" /></div>
        <div><label className="label">Mô tả</label><textarea className="input" value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Mô tả nội dung khóa học..." /></div>
        <div><label className="label">Ảnh bìa (URL)</label><input className="input" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://... hoặc để trống" /></div>
        <div><label className="label">Preview Video ID (Google Drive)</label><input className="input" value={previewVideoId} onChange={e => setPreviewVideoId(extractDriveId(e.target.value))} placeholder="Dán link hoặc ID Google Drive" /></div>
        <div style={{ display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Đã phát hành
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={isTrialEnabled} onChange={e => setIsTrialEnabled(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Cho học thử
          </label>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={loading || !name.trim()}>
          {loading ? <span className="loading-ring" style={{ width: 14, height: 14 }} /> : course ? 'Lưu thay đổi' : 'Thêm khóa'}
        </button>
      </div>
    </Modal>
  )
}

// ── Main Admin Content Page ───────────────────────────────────────────────
export default function AdminCoursesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selSubjectId, setSelSubjectId] = useState<string | null>(null)
  const [selProviderId, setSelProviderId] = useState<string | null>(null)
  const [selCourse, setSelCourse] = useState<Course | null>(null)

  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showEditSubject, setShowEditSubject] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showEditCourse, setShowEditCourse] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchSubjectsMeta()
    setSubjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const selSubject = subjects.find(s => s.id === selSubjectId)
  const selProvider = selSubject?.providers.find(p => p.id === selProviderId)

  // ── CRUD via API ──────────────────────────────────────────────────────────
  const saveSubject = async (data: any) => {
    const isEdit = subjects.some(s => s.id === data.id)
    await api('/api/admin/subjects', isEdit ? 'PUT' : 'POST', data)
    showToast(isEdit ? '✅ Đã cập nhật môn học' : '✅ Đã thêm môn học')
    load()
  }

  const deleteSubject = async (id: string) => {
    if (!confirm('Xóa môn học này? Toàn bộ nội dung liên quan sẽ bị xóa!')) return
    await api('/api/admin/subjects', 'DELETE', { id })
    showToast('🗑 Đã xóa môn học')
    setSelSubjectId(null)
    load()
  }

  const saveCourse = async (data: any) => {
    const isEdit = !!selCourse
    await api('/api/admin/courses', isEdit ? 'PUT' : 'POST', data)
    showToast(isEdit ? '✅ Đã cập nhật khóa học' : '✅ Đã thêm khóa học')
    load()
  }

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Xóa khóa học này?')) return
    await api('/api/admin/courses', 'DELETE', { id: courseId })
    showToast('🗑 Đã xóa khóa học')
    setSelCourse(null)
    load()
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Left: Subject list */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '14px 12px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Môn học</span>
            <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setShowAddSubject(true)}>+ Thêm</button>
          </div>
          <button
            className="btn btn-warning"
            style={{ width: '100%', fontSize: 12, marginBottom: 10, padding: '7px' }}
            onClick={() => setShowBulkImport(true)}
          >
            📥 Import TSV
          </button>
          {loading
            ? <div style={{ padding: 20, textAlign: 'center' }}><div className="loading-ring" /></div>
            : subjects.map(s => (
              <button
                key={s.id}
                className={`nav-item ${selSubjectId === s.id ? 'active' : ''}`}
                style={{ marginBottom: 2 }}
                onClick={() => { setSelSubjectId(s.id); setSelProviderId(null); setSelCourse(null) }}
              >
                <span>{s.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{s.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.providers.reduce((a, p) => a + p.courses.length, 0)}</span>
              </button>
            ))
          }
        </div>
      </div>

      {/* Middle: Providers + Courses */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!selSubjectId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
            {/* Import TSV banner */}
            <div
              onClick={() => setShowBulkImport(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,179,8,0.15) 100%)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 'var(--r-xl)',
                padding: '20px 28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                width: '100%',
                maxWidth: 520,
                transition: 'all var(--transition)',
              }}
            >
              <div style={{ fontSize: 40, flexShrink: 0 }}>📥</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)' }}>Import hàng loạt từ TSV</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Dán dữ liệu tab-separated để tạo Subject → Provider → Course → Lesson tự động</p>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.85)', color: '#fff', borderRadius: 'var(--r-full)', padding: '8px 16px', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                Mở →
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14 }}>
              <span style={{ fontSize: 36 }}>📚</span>
              <p>Chọn môn học ở bên trái để quản lý nội dung</p>
            </div>
          </div>
        ) : selSubject && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{selSubject.icon}</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{selSubject.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setShowEditSubject(true) }}>✏️ Sửa</button>
                <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => deleteSubject(selSubject.id)}>🗑 Xóa</button>
              </div>
            </div>

            {selSubject.providers.map(provider => (
              <div key={provider.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>👨‍🏫 {provider.name}</p>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => { setSelProviderId(provider.id); setSelCourse(null); setShowAddCourse(true) }}
                  >
                    + Thêm khóa
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {provider.courses.map(course => (
                    <div
                      key={course.id}
                      className="card card-hover"
                      style={{ padding: '14px 16px', cursor: 'pointer', borderColor: selCourse?.id === course.id ? 'var(--accent)' : undefined }}
                      onClick={() => setSelCourse(course)}
                    >
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{course.name}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {course.isPublished
                          ? <span className="badge badge-success" style={{ fontSize: 10 }}>Đã phát hành</span>
                          : <span className="badge badge-neutral" style={{ fontSize: 10 }}>Ẩn</span>
                        }
                        {course.isTrialEnabled && <span className="badge badge-info" style={{ fontSize: 10 }}>Có thử</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Right: Course detail actions */}
      {selCourse && (
        <div style={{ width: 260, borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700 }}>Chi tiết khóa học</p>
            <button onClick={() => setSelCourse(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>✕</button>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{selCourse.name}</p>
          {selCourse.tagline && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{selCourse.tagline}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, justifyContent: 'flex-start' }} onClick={() => { setShowEditCourse(true) }}>✏️ Sửa thông tin</button>
            <button className="btn btn-danger" style={{ fontSize: 12, justifyContent: 'flex-start' }} onClick={() => deleteCourse(selCourse.id)}>🗑 Xóa khóa học</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} onSuccess={load} />}
      {showAddSubject && <SubjectModal onClose={() => setShowAddSubject(false)} onSave={saveSubject} />}
      {showEditSubject && selSubject && <SubjectModal subject={selSubject} onClose={() => setShowEditSubject(false)} onSave={saveSubject} />}
      {showAddCourse && selProviderId && <CourseModal providerId={selProviderId} onClose={() => setShowAddCourse(false)} onSave={saveCourse} />}
      {showEditCourse && selCourse && <CourseModal course={selCourse} providerId={selCourse.providerId} onClose={() => setShowEditCourse(false)} onSave={saveCourse} />}

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ bottom: 20, right: 20 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
