"use client"
import { useEffect, useMemo, useState } from "react"
import { ACTIVATION_TEMPLATES, type ActivationScope } from "@/lib/activation-codes"
import { supabase } from "@/lib/supabase"

type ActivationCodeRow = {
  id: string
  code: string
  label: string
  template_key: string
  scope: ActivationScope
  variant: string
  is_active: boolean
  used_by: string | null
  used_at: string | null
  created_at: string
  expires_at: string | null
  created_by_name?: string
  created_by_email?: string
  used_by_name?: string
  used_by_email?: string
}

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers = new Headers(init?.headers || {})
  headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(url, { ...init, headers })
}

function formatScope(scope: ActivationScope): string {
  if (scope === "single_course") return "1 giao vien"
  if (scope === "single_subject") return "1 mon"
  if (scope === "three_subjects") return "3 mon"
  return "ALL"
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<ActivationCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState<"ok" | "err">("ok")
  const [workingTemplate, setWorkingTemplate] = useState("")
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({})

  const showMsg = (text: string, type: "ok" | "err" = "ok") => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(""), 4000)
  }

  const loadCodes = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth("/api/activation-codes", { method: "GET" })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.error || "Khong tai duoc danh sach code", "err")
        setLoading(false)
        return
      }
      setCodes(data.codes || [])
    } catch (error) {
      showMsg(`Loi tai danh sach code: ${String(error)}`, "err")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [])

  const createBatch = async (templateKey: string) => {
    const template = ACTIVATION_TEMPLATES.find((item) => item.key === templateKey)
    if (!template) return
    setWorkingTemplate(templateKey)
    try {
      const quantity = quantityOverrides[templateKey] || template.quantity
      const res = await fetchWithAuth("/api/activation-codes", {
        method: "POST",
        body: JSON.stringify({
          templateKey,
          quantity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.error || "Tao batch code that bai", "err")
      } else {
        showMsg(`Da tao ${data.count || 0} code cho goi "${template.label}"`)
        await loadCodes()
      }
    } catch (error) {
      showMsg(`Loi tao code: ${String(error)}`, "err")
    } finally {
      setWorkingTemplate("")
    }
  }

  const toggleCode = async (row: ActivationCodeRow) => {
    try {
      const res = await fetchWithAuth("/api/activation-codes", {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, isActive: !row.is_active }),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.error || "Cap nhat code that bai", "err")
        return
      }
      setCodes((prev) => prev.map((item) => (item.id === row.id ? data.code : item)))
      showMsg(`Da ${row.is_active ? "tat" : "bat"} code ${row.code}`)
    } catch (error) {
      showMsg(`Loi cap nhat code: ${String(error)}`, "err")
    }
  }

  const stats = useMemo(() => {
    const total = codes.length
    const active = codes.filter((code) => code.is_active).length
    const used = codes.filter((code) => Boolean(code.used_by)).length
    const available = codes.filter((code) => code.is_active && !code.used_by).length
    return { total, active, used, available }
  }, [codes])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Quan ly ma kich hoat</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Tao ma theo goi va theo doi tinh trang su dung
          </p>
        </div>
        <button className="btn btn-ghost" onClick={loadCodes} disabled={loading}>
          Lam moi
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <p className="section-title">Tong code</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="section-title">Dang bat</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: "var(--success)" }}>{stats.active}</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="section-title">Da su dung</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: "var(--warning)" }}>{stats.used}</p>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <p className="section-title">San sang kich hoat</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-light)" }}>{stats.available}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Tao nhanh theo goi</p>
        <div style={{ display: "grid", gap: 10 }}>
          {ACTIVATION_TEMPLATES.map((tpl) => (
            <div key={tpl.key} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{tpl.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Scope: {formatScope(tpl.scope)} | Mac dinh: {tpl.quantity} code
                </p>
              </div>

              <input
                className="input"
                style={{ width: 90, textAlign: "center", padding: "8px 10px" }}
                type="number"
                min={1}
                max={500}
                value={quantityOverrides[tpl.key] || tpl.quantity}
                onChange={(event) =>
                  setQuantityOverrides((prev) => ({
                    ...prev,
                    [tpl.key]: Math.max(1, Number(event.target.value || tpl.quantity)),
                  }))
                }
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>code</span>
              <button
                className="btn btn-primary"
                onClick={() => createBatch(tpl.key)}
                disabled={workingTemplate === tpl.key}
              >
                {workingTemplate === tpl.key ? "Dang tao..." : "Tao"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            background: msgType === "ok" ? "var(--success-dim)" : "var(--danger-dim)",
            color: msgType === "ok" ? "var(--success)" : "var(--danger)",
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Dang tai danh sach code...</div>
        ) : codes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Chua co code nao</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
                {["Code", "Goi", "Scope", "Trang thai", "Da dung boi", "Ngay tao", ""].map((header) => (
                  <th
                    key={header}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid var(--border)", opacity: row.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>{row.code}</p>
                    {row.expires_at && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Het han: {new Date(row.expires_at).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 13 }}>{row.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.template_key}</p>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {formatScope(row.scope)}
                    {row.variant ? ` (${row.variant})` : ""}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {row.used_by ? (
                      <span className="badge badge-warning">Da dung</span>
                    ) : row.is_active ? (
                      <span className="badge badge-success">San sang</span>
                    ) : (
                      <span className="badge badge-danger">Da tat</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {row.used_by ? (
                      <div>
                        <p style={{ fontSize: 12 }}>{row.used_by_name || row.used_by_email || row.used_by}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {row.used_at ? new Date(row.used_at).toLocaleString() : ""}
                        </p>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chua dung</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => toggleCode(row)}>
                      {row.is_active ? "Tat" : "Bat"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

