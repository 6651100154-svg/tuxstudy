'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { fetchSubjectsMeta, getAllCourses } from '@/lib/data'
import { getLessonProgress, getTotalStudySeconds, supabase } from '@/lib/supabase'
import type { Subject, Course } from '@/lib/types'
import { formatStudyTime, formatDate, initials } from '@/lib/types'
import TopBar from '@/components/TopBar'
import NotificationPopup from '@/components/NotificationPopup'

// ── Activation Code Popup ─────────────────────────────────────────────────
function ActivatePopup({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth()
  const [step, setStep] = useState<'input' | 'select' | 'done'>('input')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeInfo, setCodeInfo] = useState<any>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  useEffect(() => {
    fetchSubjectsMeta().then(setSubjects)
  }, [])

  const allCourses = getAllCourses(subjects)

  const validateCode = async () => {
    const cleaned = code.trim().toUpperCase()
    if (!cleaned) { setError('Vui lòng nhập mã kích hoạt'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/activation-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Mã không hợp lệ'); setLoading(false); return }
      setCodeInfo(data.data)
      setStep('select')
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại')
    }
    setLoading(false)
  }

  const redeemCode = async () => {
    if (!user || !codeInfo) return
    setLoading(true); setError('')

    // Validate selection
    if (codeInfo.scope === 'single_course' && !selectedCourseId) {
      setError('Vui lòng chọn khóa học'); setLoading(false); return
    }
    if ((codeInfo.scope === 'single_subject') && selectedSubjectIds.length === 0) {
      setError('Vui lòng chọn môn học'); setLoading(false); return
    }
    if (codeInfo.scope === 'three_subjects' && selectedSubjectIds.length !== 3) {
      setError('Vui lòng chọn đúng 3 môn học'); setLoading(false); return
    }

    try {
      const res = await fetch('/api/activation-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          selectedCourseId: selectedCourseId || undefined,
          selectedSubjectIds,
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Lỗi kích hoạt'); setLoading(false); return }
      setStep('done')
      setTimeout(() => { onSuccess(); onClose() }, 2000)
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại')
    }
    setLoading(false)
  }

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (codeInfo?.maxSubjectSelect > 0 && prev.length >= codeInfo.maxSubjectSelect) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal animate-up" style={{ padding: 28, maxWidth: 500 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
            {step === 'done' ? '🎉 Kích hoạt thành công!' : '🔑 Nhập mã kích hoạt'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Tài khoản đã được cập nhật!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Khóa học đã sẵn sàng trong mục Học liệu.</p>
          </div>
        )}

        {step === 'input' && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Nhập mã kích hoạt để mở khóa khóa học. Mã có dạng: <code style={{ background: 'var(--bg-active)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>GV-XXXX-XXXX</code>
            </p>
            <label className="label">Mã kích hoạt</label>
            <input
              className="input"
              placeholder="Dán hoặc nhập mã kích hoạt"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && validateCode()}
              style={{ letterSpacing: '0.1em', fontSize: 15, textTransform: 'uppercase', marginBottom: 16 }}
            />
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }} onClick={validateCode} disabled={loading}>
              {loading ? <span className="loading-ring" style={{ width: 16, height: 16 }} /> : 'Xác nhận mã →'}
            </button>
          </>
        )}

        {step === 'select' && codeInfo && (
          <>
            <div style={{ padding: '14px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{codeInfo.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getCodeDescription(codeInfo)}</p>
            </div>

            {/* single_course: chọn 1 khóa */}
            {codeInfo.scope === 'single_course' && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Chọn khóa học bạn muốn kích hoạt:</p>
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allCourses.map(course => (
                    <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: selectedCourseId === course.id ? 'var(--accent-dim)' : 'var(--bg-input)', border: `1px solid ${selectedCourseId === course.id ? 'rgba(99,102,241,0.3)' : 'var(--glass-border)'}`, borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all var(--transition)' }}>
                      <input type="radio" name="course" value={course.id} checked={selectedCourseId === course.id} onChange={() => setSelectedCourseId(course.id)} style={{ accentColor: 'var(--accent)' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</p>
                        {course.providerName && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{course.providerName}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* single_subject or three_subjects: chọn môn */}
            {(codeInfo.scope === 'single_subject' || codeInfo.scope === 'three_subjects') && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  Chọn {codeInfo.scope === 'three_subjects' ? 'đúng 3 môn' : '1 môn'} học muốn kích hoạt:
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({selectedSubjectIds.length}/{codeInfo.maxSubjectSelect || 1})</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                  {subjects.map(s => {
                    const sel = selectedSubjectIds.includes(s.id)
                    return (
                      <button key={s.id} onClick={() => toggleSubject(s.id)} style={{
                        padding: '10px 12px', background: sel ? 'var(--accent-dim)' : 'var(--bg-input)',
                        border: `1px solid ${sel ? 'rgba(99,102,241,0.3)' : 'var(--glass-border)'}`,
                        borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: sel ? 600 : 400 }}>{s.name}</span>
                        {sel && <span style={{ marginLeft: 'auto', color: 'var(--accent-light)', fontSize: 14 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* all_courses: không cần chọn */}
            {codeInfo.scope === 'all_courses' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 10 }}>🌟</p>
                <p style={{ fontWeight: 600 }}>Gói VIP ALL IN ONE</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Kích hoạt toàn bộ khóa học ngay khi xác nhận</p>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-dim)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger)', marginTop: 12 }}>⚠ {error}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setStep('input'); setError('') }}>← Nhập lại</button>
              <button className="btn btn-primary" style={{ flex: 2, padding: '12px' }} onClick={redeemCode} disabled={loading}>
                {loading ? <span className="loading-ring" style={{ width: 16, height: 16 }} /> : '🎉 Kích hoạt ngay'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function getCodeDescription(info: any): string {
  if (info.grantsAllCourses) return 'Mở khóa toàn bộ khóa học trong hệ thống'
  if (info.scope === 'single_course') return 'Mở khóa 1 khóa học theo lựa chọn'
  if (info.scope === 'single_subject') return 'Mở khóa tất cả khóa trong 1 môn'
  if (info.scope === 'three_subjects') return 'Mở khóa tất cả khóa trong 3 môn học'
  return info.label
}

// ── Change Password Modal ─────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    if (!newPass.trim()) { setError('Vui lòng nhập mật khẩu mới'); return }
    if (newPass.trim().length < 6) { setError('Mật khẩu mới tối thiểu 6 ký tự'); return }
    if (newPass.trim() !== confirm.trim()) { setError('Mật khẩu xác nhận không khớp'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password: newPass.trim() })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal animate-up" style={{ padding: 28, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Đổi mật khẩu</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>✕</button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 40 }}>✅</p>
            <p style={{ fontWeight: 600, marginTop: 10 }}>Đổi mật khẩu thành công!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Mật khẩu mới</label>
              <input className="input" type="password" placeholder="Tối thiểu 6 ký tự" value={newPass} onChange={e => setNewPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            <div>
              <label className="label">Xác nhận mật khẩu mới</label>
              <input className="input" type="password" placeholder="Nhập lại mật khẩu mới" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>⚠ {error}</p>}
            <button className="btn btn-primary" style={{ padding: '12px' }} onClick={submit} disabled={loading}>
              {loading ? <span className="loading-ring" style={{ width: 16, height: 16 }} /> : 'Đổi mật khẩu'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Account Page ─────────────────────────────────────────────────────
export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, logout, updateProfile, refreshUser } = useAuth()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [completedIds, setCompleted] = useState<string[]>([])
  const [studySeconds, setStudySeconds] = useState(0)
  const [showActivate, setShowActivate] = useState(searchParams?.get('tab') === 'activate')
  const [showChangePass, setShowChangePass] = useState(false)
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (!user) { router.push('/'); return }
    setNameInput(user.name)
    fetchSubjectsMeta().then(setSubjects)
    getLessonProgress(user.id).then(setCompleted)
    getTotalStudySeconds(user.id).then(setStudySeconds)
  }, [user])

  if (!user) return null

  const enrolledCourses = subjects.flatMap(s =>
    s.providers.flatMap(p =>
      p.courses.filter(c => user.enrollments.includes(c.id)).map(c => ({ ...c, subject: s }))
    )
  )

  const saveName = async () => {
    if (!nameInput.trim() || nameInput === user.name) { setEditName(false); return }
    const { error } = await supabase.from('accounts').update({ name: nameInput.trim() }).eq('id', user.id)
    if (!error) { updateProfile({ name: nameInput.trim() }); setEditName(false) }
  }

  const handleLogout = async () => { await logout(); router.push('/') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NotificationPopup />
      <TopBar />

      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 800, margin: '0 auto', width: '100%' }}>

        {/* Profile card */}
        <div className="glass animate-up" style={{ padding: 28, borderRadius: 'var(--r-2xl)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div className="avatar" style={{ width: 72, height: 72, fontSize: 26, flexShrink: 0 }}>
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : initials(user.name)
              }
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {editName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
                    style={{ fontSize: 18, fontWeight: 700 }}
                    autoFocus
                  />
                  <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={saveName}>Lưu</button>
                  <button className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setEditName(false)}>Hủy</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{user.name}</h1>
                  <button onClick={() => setEditName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>✏️</button>
                </div>
              )}
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 3 }}>{user.email}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {user.role === 'admin' && <span className="badge badge-accent">Admin</span>}
                <span className="badge badge-neutral">Thành viên từ {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
            <div className="stat-card">
              <p className="stat-value">{enrolledCourses.length}</p>
              <p className="stat-label">Khóa học</p>
            </div>
            <div className="stat-card">
              <p className="stat-value">{completedIds.length}</p>
              <p className="stat-label">Bài đã học</p>
            </div>
            <div className="stat-card">
              <p className="stat-value">{formatStudyTime(studySeconds)}</p>
              <p className="stat-label">Thời gian học</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="glass animate-up" style={{ padding: 20, borderRadius: 'var(--r-xl)', marginBottom: 20 }}>
          <p className="section-title" style={{ marginBottom: 12 }}>Cài đặt tài khoản</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="nav-item"
              style={{ justifyContent: 'space-between', borderRadius: 'var(--r-md)', padding: '12px 14px' }}
              onClick={() => setShowActivate(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔑</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Kích hoạt mã học</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhập mã để mở khóa khóa học</p>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            </button>

            <button
              className="nav-item"
              style={{ justifyContent: 'space-between', borderRadius: 'var(--r-md)', padding: '12px 14px' }}
              onClick={() => setShowChangePass(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔐</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Đổi mật khẩu</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cập nhật mật khẩu đăng nhập</p>
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            </button>

            {user.role === 'admin' && (
              <button
                className="nav-item"
                style={{ justifyContent: 'space-between', borderRadius: 'var(--r-md)', padding: '12px 14px' }}
                onClick={() => router.push('/admin')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⚙️</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Trang quản trị</p>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
              </button>
            )}

            <button
              className="nav-item"
              style={{ justifyContent: 'space-between', borderRadius: 'var(--r-md)', padding: '12px 14px', color: 'var(--danger)' }}
              onClick={handleLogout}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🚪</span>
                <p style={{ fontSize: 14, fontWeight: 500 }}>Đăng xuất</p>
              </div>
            </button>
          </div>
        </div>

        {/* Enrolled courses */}
        {enrolledCourses.length > 0 && (
          <div className="glass animate-up" style={{ padding: 20, borderRadius: 'var(--r-xl)' }}>
            <p className="section-title" style={{ marginBottom: 12 }}>Khóa học đã kích hoạt ({enrolledCourses.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrolledCourses.map(({ subject, ...course }) => (
                <button
                  key={course.id}
                  className="card-hover"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                  onClick={() => router.push('/learn')}
                >
                  <div style={{ width: 40, height: 40, background: `${subject?.color || '#6366f1'}22`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {subject?.icon || '📚'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{course.name}</p>
                    {course.providerName && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{course.providerName}</p>}
                  </div>
                  <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Đã kích hoạt</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showActivate && (
        <ActivatePopup
          onClose={() => setShowActivate(false)}
          onSuccess={() => { refreshUser() }}
        />
      )}
      {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
    </div>
  )
}
