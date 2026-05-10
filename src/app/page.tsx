"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function LoginPage() {
  const router = useRouter()
  const { login, register, theme, toggleTheme } = useAuth()
  const [tab, setTab]         = useState<"login" | "register">("login")
  const [email, setEmail]     = useState("")
  const [name, setName]       = useState("")
  const [password, setPass]   = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(""); setLoading(true)
    await new Promise(r => setTimeout(r, 400))

    if (tab === "login") {
      const res = await login(email.trim(), password)
      if (!res.ok) { setError(res.msg); setLoading(false); return }
      router.push(res.role === "admin" ? "/admin" : "/learn")
    } else {
      if (!name.trim()) { setError("Vui lòng nhập tên"); setLoading(false); return }
      if (password !== confirm) { setError("Mật khẩu xác nhận không khớp"); setLoading(false); return }
      const res = await register(email.trim(), name.trim(), password)
      if (!res.ok) { setError(res.msg); setLoading(false); return }
      router.push("/learn")
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>

      {/* Theme toggle top-right */}
      <button
        onClick={toggleTheme}
        style={{ position: "fixed", top: 16, right: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 12px", cursor: "pointer", fontSize: 18, transition: "all var(--transition)" }}
        title="Đổi giao diện"
      >{theme === "dark" ? "☀️" : "🌙"}</button>

      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: "var(--accent-glow)", borderRadius: "50%", filter: "blur(80px)", opacity: 0.5 }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, background: "var(--accent)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎓</div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>Tuxstudy</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nền tảng học tập online cho mọi người</p>
        </div>

        {/* Card */}
        <div className="card animate-up" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "var(--bg-base)", borderRadius: "var(--radius-md)", padding: 3, marginBottom: 28 }}>
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError("") }}
                style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all var(--transition)", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--text-secondary)" }}
              >{t === "login" ? "Đăng nhập" : "Đăng ký"}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "register" && (
              <div>
                <label className="label">Họ và tên</label>
                <input className="input" placeholder="Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="example@gmail.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            </div>
            <div>
              <label className="label">Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPass ? "text" : "password"} placeholder={tab === "login" ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"} value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ paddingRight: 42 }} />
                <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>{showPass ? "🙈" : "👁"}</button>
              </div>
            </div>
            {tab === "register" && (
              <div>
                <label className="label">Xác nhận mật khẩu</label>
                <input className="input" type={showPass ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--danger-dim)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--danger)" }}>
              ⚠ {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "12px", fontSize: 15 }} onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </div>
      </div>
    </div>
  )
}
