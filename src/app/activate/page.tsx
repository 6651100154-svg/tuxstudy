"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import TopBar from "@/components/TopBar"
import { useAuth } from "@/context/AuthContext"
import { fetchSubjects, type Subject } from "@/lib/data"
import { normalizeActivationCode } from "@/lib/activation-codes"
import { supabase } from "@/lib/supabase"

type ValidatedCode = {
  id: string
  code: string
  label: string
  templateKey: string
  scope: "single_course" | "single_subject" | "three_subjects" | "all_courses"
  variant: string
  maxCourseSelect: number
  maxSubjectSelect: number
  grantsAllCourses: boolean
  expiresAt: string | null
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers = new Headers(init?.headers || {})
  headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(path, { ...init, headers })
}

export default function ActivateCodePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [codeInput, setCodeInput] = useState("")
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"ok" | "err">("ok")
  const [validating, setValidating] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [grantedCourseNames, setGrantedCourseNames] = useState<string[]>([])

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }
    if (user.role !== "student") {
      router.push("/admin")
    }
  }, [user, router])

  const allCourses = useMemo(
    () =>
      subjects.flatMap((subject) =>
        subject.courses.map((course) => ({
          id: course.id,
          teacherName: course.teacherName,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectIcon: subject.icon,
          enrolled: user?.enrollments.includes(course.id) || false,
        }))
      ),
    [subjects, user]
  )

  const showMessage = (text: string, type: "ok" | "err" = "ok") => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(""), 4500)
  }

  const resetSelections = () => {
    setSelectedCourseId("")
    setSelectedSubjectIds([])
    setGrantedCourseNames([])
  }

  const validateCode = async () => {
    const normalized = normalizeActivationCode(codeInput)
    if (!normalized) {
      showMessage("Vui long nhap ma kich hoat", "err")
      return
    }

    setValidating(true)
    setValidatedCode(null)
    resetSelections()
    try {
      const res = await authFetch("/api/activation-codes/validate", {
        method: "POST",
        body: JSON.stringify({ code: normalized }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        showMessage(data.error || "Ma khong hop le", "err")
      } else {
        setValidatedCode(data.code)
        showMessage(`Ma hop le: ${data.code.label}`)
      }
    } catch (error) {
      showMessage(`Loi xac thuc ma: ${String(error)}`, "err")
    } finally {
      setValidating(false)
    }
  }

  const toggleSubject = (subjectId: string) => {
    if (!validatedCode) return
    const max = Math.max(1, validatedCode.maxSubjectSelect || 1)
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) return prev.filter((id) => id !== subjectId)
      if (prev.length >= max) return prev
      return [...prev, subjectId]
    })
  }

  const redeemCode = async () => {
    if (!validatedCode) return
    setRedeeming(true)
    try {
      const payload: Record<string, unknown> = {
        code: normalizeActivationCode(codeInput),
      }
      if (validatedCode.scope === "single_course") {
        payload.selectedCourseId = selectedCourseId
      }
      if (validatedCode.scope === "single_subject" || validatedCode.scope === "three_subjects") {
        payload.selectedSubjectIds = selectedSubjectIds
      }

      const res = await authFetch("/api/activation-codes/redeem", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        showMessage(data.error || "Kich hoat that bai", "err")
        return
      }

      setGrantedCourseNames(data.grantedCourseNames || [])
      if (Array.isArray(data.enrollments)) {
        updateProfile({ enrollments: data.enrollments })
      }
      setValidatedCode(null)
      setCodeInput("")
      resetSelections()
      showMessage(`Kich hoat thanh cong (${data.newlyActivatedCount || 0} khoa moi)`)
    } catch (error) {
      showMessage(`Loi kich hoat: ${String(error)}`, "err")
    } finally {
      setRedeeming(false)
    }
  }

  if (!user || user.role !== "student") return null

  const canRedeem =
    validatedCode &&
    (validatedCode.scope === "all_courses" ||
      (validatedCode.scope === "single_course" && Boolean(selectedCourseId)) ||
      (validatedCode.scope === "single_subject" && selectedSubjectIds.length === 1) ||
      (validatedCode.scope === "three_subjects" &&
        selectedSubjectIds.length === Math.max(1, validatedCode.maxSubjectSelect || 3)))

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar title="Kich hoat khoa hoc bang ma code" />
      <div style={{ flex: 1, padding: "28px 20px", maxWidth: 900, width: "100%", margin: "0 auto" }}>
        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Nhap ma kich hoat
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            Nhap ma code tu admin, sau do chon khoa hoc/mon hoc tuong ung de kich hoat.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              className="input"
              value={codeInput}
              placeholder="VD: GV-ABCD-EFGH"
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
            />
            <button className="btn btn-primary" onClick={validateCode} disabled={validating}>
              {validating ? "Dang kiem tra..." : "Kiem tra ma"}
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: messageType === "ok" ? "var(--success-dim)" : "var(--danger-dim)",
              color: messageType === "ok" ? "var(--success)" : "var(--danger)",
              fontSize: 13,
            }}
          >
            {message}
          </div>
        )}

        {validatedCode && (
          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Ma hop le</p>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{validatedCode.label}</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              Scope: {validatedCode.scope} {validatedCode.variant ? `| ${validatedCode.variant}` : ""}
            </p>

            {validatedCode.scope === "single_course" && (
              <div style={{ marginTop: 16 }}>
                <label className="label">Chon 1 khoa giao vien</label>
                <select className="input" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
                  <option value="">-- Chon khoa hoc --</option>
                  {allCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.subjectIcon} {course.subjectName} - {course.teacherName}
                      {course.enrolled ? " (da hoc)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {validatedCode.scope === "single_subject" && (
              <div style={{ marginTop: 16 }}>
                <label className="label">Chon 1 mon de kich hoat full</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      className="btn btn-ghost"
                      style={{
                        justifyContent: "flex-start",
                        borderColor: selectedSubjectIds.includes(subject.id) ? "var(--accent)" : undefined,
                        background: selectedSubjectIds.includes(subject.id) ? "var(--accent-dim)" : undefined,
                      }}
                      onClick={() => setSelectedSubjectIds([subject.id])}
                    >
                      {subject.icon} {subject.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {validatedCode.scope === "three_subjects" && (
              <div style={{ marginTop: 16 }}>
                <label className="label">
                  Chon {Math.max(1, validatedCode.maxSubjectSelect || 3)} mon
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      className="btn btn-ghost"
                      style={{
                        justifyContent: "flex-start",
                        borderColor: selectedSubjectIds.includes(subject.id) ? "var(--accent)" : undefined,
                        background: selectedSubjectIds.includes(subject.id) ? "var(--accent-dim)" : undefined,
                      }}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      {subject.icon} {subject.name}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Da chon: {selectedSubjectIds.length}/{Math.max(1, validatedCode.maxSubjectSelect || 3)}
                </p>
              </div>
            )}

            {validatedCode.scope === "all_courses" && (
              <p style={{ marginTop: 16, fontSize: 13, color: "var(--accent-light)" }}>
                Ma nay se kich hoat toan bo khoa hoc hien co.
              </p>
            )}

            <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={!canRedeem || redeeming} onClick={redeemCode}>
                {redeeming ? "Dang kich hoat..." : "Kich hoat ngay"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setValidatedCode(null)
                  resetSelections()
                }}
              >
                Huy
              </button>
            </div>
          </div>
        )}

        {grantedCourseNames.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Khoa hoc da kich hoat</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {grantedCourseNames.map((name) => (
                <span key={name} className="badge badge-success">
                  {name}
                </span>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => router.push("/learn")}>
              Ve trang hoc
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

