'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, validateEmail, validatePassword } from '@/context/AuthContext'

// ── Field input with floating label ───────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, error, placeholder, autoFocus,
  rightSlot, onEnter,
}: {
  label: string; type?: string; value: string; placeholder?: string; autoFocus?: boolean
  onChange: (v: string) => void; error?: string | null; rightSlot?: React.ReactNode
  onEnter?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={type}
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          style={{
            borderColor: error ? 'var(--danger)' : undefined,
            paddingRight: rightSlot ? 46 : undefined,
          }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

// ── Eye button ────────────────────────────────────────────────────────────
function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 0, display: 'flex', alignItems: 'center' }}
    >
      {show ? '🙈' : '👁'}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const { login, register, theme, toggleTheme } = useAuth()

  const [tab, setTab]       = useState<'login' | 'register'>('login')
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [pass, setPass]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState('')

  // Live validation — only show after first interaction
  const [touched, setTouched] = useState({ email: false, pass: false, confirm: false })

  const emailErr   = touched.email   ? validateEmail(email)               : null
  const passErr    = touched.pass    ? validatePassword(pass.trim())       : null
  const confirmErr = touched.confirm && confirm ? (pass.trim() !== confirm.trim() ? 'Mật khẩu xác nhận không khớp' : null) : null

  const touch = (field: keyof typeof touched) =>
    setTouched(p => ({ ...p, [field]: true }))

  const submit = async () => {
    setError('')
    // Touch all to trigger validation display
    setTouched({ email: true, pass: true, confirm: tab === 'register' })

    const ev = validateEmail(email)
    if (ev) { setError(ev); return }
    const pv = validatePassword(pass.trim())
    if (pv) { setError(pv); return }
    if (tab === 'register') {
      if (!name.trim()) { setError('Vui lòng nhập họ và tên'); return }
      if (pass.trim() !== confirm.trim()) { setError('Mật khẩu xác nhận không khớp'); return }
    }

    setLoading(true)
    if (tab === 'login') {
      const res = await login(email, pass)
      if (!res.ok) { setError(res.msg); setLoading(false); return }
      router.push(res.role === 'admin' ? '/admin' : '/learn')
    } else {
      const res = await register(email, name, pass)
      if (!res.ok) { setError(res.msg); setLoading(false); return }
      router.push('/learn')
    }
    setLoading(false)
  }

  const switchTab = (t: 'login' | 'register') => {
    setTab(t); setError('')
    setTouched({ email: false, pass: false, confirm: false })
    setPass(''); setConfirm('')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{ position: 'fixed', top: 16, right: 16, background: 'var(--bg-card)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-full)', padding: '8px 14px', cursor: 'pointer', fontSize: 16, transition: 'all var(--transition)', zIndex: 10 }}
        title="Đổi giao diện"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="animate-up" style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 48, height: 48,
              background: 'var(--accent-shine)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            }}>🎓</div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
              Tuxstudy
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Nền tảng học tập online chất lượng cao
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: 32 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', padding: 3, marginBottom: 28, gap: 2 }}>
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 'var(--r-sm)',
                  border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  transition: 'all var(--transition)',
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text-secondary)',
                  boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'register' && (
              <Field
                label="Họ và tên"
                value={name}
                placeholder="Nguyễn Văn A"
                onChange={setName}
                onEnter={submit}
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              placeholder="example@gmail.com"
              onChange={v => { setEmail(v); touch('email') }}
              error={emailErr}
              onEnter={submit}
            />
            <Field
              label="Mật khẩu"
              type={showPass ? 'text' : 'password'}
              value={pass}
              placeholder={tab === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 6 ký tự'}
              onChange={v => { setPass(v); touch('pass') }}
              error={passErr}
              onEnter={submit}
              rightSlot={<EyeBtn show={showPass} onToggle={() => setShowPass(p => !p)} />}
            />
            {tab === 'register' && (
              <Field
                label="Xác nhận mật khẩu"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                placeholder="Nhập lại mật khẩu"
                onChange={v => { setConfirm(v); touch('confirm') }}
                error={confirmErr}
                onEnter={submit}
              />
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              marginTop: 14, padding: '11px 14px',
              background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--danger)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20, padding: '13px', fontSize: 15, borderRadius: 'var(--r-md)', fontWeight: 600 }}
            onClick={submit}
            disabled={loading}
          >
            {loading
              ? <span className="loading-ring" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>

          {/* Divider */}
          {tab === 'login' && (
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => switchTab('register')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Đăng ký ngay
              </button>
            </p>
          )}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Bằng cách đăng ký, bạn đồng ý với điều khoản sử dụng của Tuxstudy
        </p>
      </div>
    </div>
  )
}
