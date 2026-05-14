"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { fetchSubjects, getSubjectByCourse, type Subject, type Course, type Lesson, type Part } from "@/lib/data"
import { markLessonCompleted } from "@/lib/supabase"
import TopBar from "@/components/TopBar"
import NotificationPopup from "@/components/NotificationPopup"

// ── Video Player ───────────────────────────────────────────────────────────────
function VideoPlayer({ videoId, backupId }: { videoId: string; backupId?: string }) {
  const [failed, setFailed] = useState(false)
  const [usedBackup, setUsedBackup] = useState(false)
  useEffect(() => { setFailed(false); setUsedBackup(false) }, [videoId])

  const src = !failed
    ? `https://drive.google.com/file/d/${videoId}/preview`
    : backupId && !usedBackup ? `https://drive.google.com/file/d/${backupId}/preview` : null

  if (!src) return (
    <div style={{ aspectRatio: "16/9", background: "var(--bg-base)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid var(--border)" }}>
      <span style={{ fontSize: 36 }}>⚠️</span>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Không thể tải video</p>
    </div>
  )
  return (
    <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
      <iframe key={src} src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        allowFullScreen allow="autoplay" onError={() => { if (!failed) setFailed(true); else if (backupId && !usedBackup) setUsedBackup(true) }} />
    </div>
  )
}

// ── Lesson sidebar item ────────────────────────────────────────────────────────
function LessonItem({ lesson, isActive, isCompleted, isLocked, onClick }: {
  lesson: Lesson; isActive: boolean; isCompleted: boolean; isLocked: boolean; onClick: () => void
}) {
  return (
    <button onClick={isLocked ? undefined : onClick}
      style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: isActive ? "var(--accent-dim)" : "transparent", border: "none", borderRadius: "var(--radius-md)", cursor: isLocked ? "default" : "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background var(--transition)", opacity: isLocked ? 0.4 : 1, marginBottom: 2 }}
      onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)" }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{isCompleted ? "✅" : isActive ? "🔵" : isLocked ? "🔒" : "⬜"}</span>
      <span style={{ fontSize: 13, lineHeight: 1.4, color: isActive ? "var(--accent-light)" : "var(--text-primary)", flex: 1 }}>{lesson.title}</span>
      {lesson.isPreview && !isLocked && <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--success-dim)", color: "var(--success)", borderRadius: 99, flexShrink: 0 }}>Thử</span>}
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([])
  const [expandedChapters, setExpandedChapters] = useState<string[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [view, setView] = useState<"home" | "course" | "learn">("home")
  const [search, setSearch] = useState("")
  const [completed, setCompleted] = useState<string[]>([])

  // 1. Fetch Subjects on mount
  useEffect(() => {
    fetchSubjects().then(s => setSubjects(s))
    if (!user) { router.push("/"); return }
    // Load completed lessons from localStorage (fallback; ideally fetch from DB later)
    const prog = JSON.parse(localStorage.getItem(`edu_progress_${user.email}`) || "[]")
    setCompleted(prog)
  }, [user])

  if (!user) return null

  const progressKey = `edu_progress_${user.email}`
  const enrolledCourses = subjects.flatMap(s => s.courses.filter(c => user.enrollments.includes(c.id)))

  const markComplete = async (lessonId: string) => {
    if (!completed.includes(lessonId)) {
      // Save to Supabase
      const success = await markLessonCompleted(user.id, lessonId)
      if (success) {
        const next = [...completed, lessonId]
        setCompleted(next)
        // Also save to localStorage as fallback
        localStorage.setItem(progressKey, JSON.stringify(next))
      }
    }
  }

  const isLocked = (lesson: Lesson, course: Course) => !lesson.isPreview && !user.enrollments.includes(course.id)

  const openLesson = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course)
    setSelectedLesson(lesson)
    setSelectedPart(lesson.parts[0] || null)
    setExpandedChapters([lesson.chapterId])
    setView("learn")
  }

  const openCourse = (course: Course) => {
    setSelectedCourse(course)
    if (course.chapters[0]) setExpandedChapters([course.chapters[0].id])
    setView("course")
  }

  const getCourseProgress = (course: Course) => {
    const all = course.chapters.flatMap(ch => ch.lessons)
    const done = all.filter(l => completed.includes(l.id)).length
    return { done, total: all.length, pct: all.length ? Math.round(done / all.length * 100) : 0 }
  }

  const continueLesson = (() => {
    for (const c of enrolledCourses) {
      for (const ch of c.chapters) {
        for (const l of ch.lessons) { if (!completed.includes(l.id)) return { course: c, lesson: l } }
      }
    }
    return null
  })()

  // ── LEARN VIEW ──────────────────────────────────────────────────────────────
  if (view === "learn" && selectedCourse && selectedLesson && selectedPart) {
    const allLessons = selectedCourse.chapters.flatMap(ch => ch.lessons)
    const curIdx = allLessons.findIndex(l => l.id === selectedLesson.id)
    const prog = getCourseProgress(selectedCourse)
    const subj = getSubjectByCourse(subjects, selectedCourse.id)

    return (
      <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
        <NotificationPopup />
        <TopBar title={selectedLesson.title} />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Lesson sidebar */}
          <div className="sidebar-collapse" style={{ width: sidebarOpen ? 268 : 0, opacity: sidebarOpen ? 1 : 0, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: sidebarOpen ? "auto" : "hidden" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ width: "100%", fontSize: 13, marginBottom: 10 }} onClick={() => setView("course")}>← Quay lại</button>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{subj?.icon} {subj?.name}</p>
              <p style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedCourse.teacherName}</p>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                  <span>{prog.done}/{prog.total} bài</span><span>{prog.pct}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${prog.pct}%` }} /></div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
              {selectedCourse.chapters.map(ch => (
                <div key={ch.id} style={{ marginBottom: 6 }}>
                  <button onClick={() => setExpandedChapters(p => p.includes(ch.id) ? p.filter(x => x !== ch.id) : [...p, ch.id])}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "5px 4px", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{ch.title}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{expandedChapters.includes(ch.id) ? "▾" : "▸"}</span>
                  </button>
                  {expandedChapters.includes(ch.id) && ch.lessons.map(l => (
                    <LessonItem key={l.id} lesson={l} isActive={l.id === selectedLesson.id}
                      isCompleted={completed.includes(l.id)} isLocked={isLocked(l, selectedCourse)}
                      onClick={() => { setSelectedLesson(l); setSelectedPart(l.parts[0]) }} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-surface)", flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setSidebarOpen(p => !p)}>☰</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { if (curIdx > 0) { const p = allLessons[curIdx - 1]; setSelectedLesson(p); setSelectedPart(p.parts[0]) } }} disabled={curIdx === 0}>← Trước</button>
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={async () => { await markComplete(selectedLesson.id); if (curIdx < allLessons.length - 1) { const n = allLessons[curIdx + 1]; setSelectedLesson(n); setSelectedPart(n.parts[0]) } }}>
                {curIdx < allLessons.length - 1 ? "Tiếp theo →" : "Hoàn thành ✓"}
              </button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* Multi-part selector */}
              {selectedLesson.parts.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {selectedLesson.parts.map(p => (
                    <button key={p.id} onClick={() => setSelectedPart(p)}
                      className={`btn ${p.id === selectedPart.id ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 13 }}>
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
              <VideoPlayer videoId={selectedPart.videoUrl} backupId={selectedPart.videoBackup} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                <button className={`btn ${completed.includes(selectedLesson.id) ? "btn-success" : "btn-ghost"}`} style={{ fontSize: 13 }} onClick={() => markComplete(selectedLesson.id)}>
                  {completed.includes(selectedLesson.id) ? "✅ Đã xem" : "☑ Đánh dấu đã xem"}
                </button>
              </div>

              {selectedPart.pdfUrl && (
                <div style={{ marginTop: 20, padding: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <p className="section-title" style={{ marginBottom: 8 }}>Tài liệu</p>
                  <a href={selectedPart.pdfUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--accent-light)", textDecoration: "none" }}>
                    📄 Tải tài liệu bài học
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: video list */}
          {selectedLesson.parts.length > 1 && (
            <div style={{ width: 220, flexShrink: 0, background: "var(--bg-surface)", borderLeft: "1px solid var(--border)", padding: 14, overflowY: "auto" }}>
              <p className="section-title" style={{ marginBottom: 10 }}>Video trong bài</p>
              {selectedLesson.parts.map(p => (
                <button key={p.id} onClick={() => setSelectedPart(p)}
                  style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: p.id === selectedPart.id ? "var(--accent-dim)" : "transparent", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, transition: "background var(--transition)" }}>
                  <span style={{ fontSize: 12 }}>▶</span>
                  <span style={{ fontSize: 13, color: p.id === selectedPart.id ? "var(--accent-light)" : "var(--text-secondary)" }}>{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── COURSE VIEW ─────────────────────────────────────────────────────────────
  if (view === "course" && selectedCourse) {
    const isEnrolled = user.enrollments.includes(selectedCourse.id)
    const prog = getCourseProgress(selectedCourse)
    const subj = getSubjectByCourse(subjects, selectedCourse.id)
    const allLessons = selectedCourse.chapters.flatMap(ch => ch.lessons)

    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <NotificationPopup />
        <TopBar />
        <div style={{ flex: 1, padding: "32px 24px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
          <button className="btn btn-ghost" style={{ marginBottom: 24 }} onClick={() => setView("home")}>← Trang chủ</button>

          {/* Teacher card */}
          <div className="card" style={{ padding: 24, marginBottom: 28, display: "flex", gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: "var(--radius-lg)", background: "var(--accent-dim)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span className="badge badge-accent">{subj?.icon} {subj?.name}</span>
                {isEnrolled && <span className="badge badge-success">✓ Đã đăng ký</span>}
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedCourse.teacherName}</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{selectedCourse.description}</p>
              {isEnrolled && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>
                    <span>Tiến độ: {prog.done}/{prog.total} bài</span><span>{prog.pct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${prog.pct}%` }} /></div>
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                {isEnrolled ? (
                  <button className="btn btn-primary" style={{ padding: "10px 24px", fontSize: 15 }}
                    onClick={() => { const l = selectedCourse.chapters[0]?.lessons[0]; if (l) openLesson(selectedCourse, l) }}>
                    ▶ Học ngay
                  </button>
                ) : (
                  <div style={{ padding: "10px 16px", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: 14, color: "var(--text-secondary)", display: "inline-block" }}>
                    🔒 Liên hệ admin để đăng ký khóa học
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview video */}
          {selectedCourse.previewVideoId && (
            <div style={{ marginBottom: 28 }}>
              <p className="section-title" style={{ marginBottom: 10 }}>Video giới thiệu</p>
              <VideoPlayer videoId={selectedCourse.previewVideoId} />
            </div>
          )}

          {/* Lesson list */}
          <div>
            <p className="section-title" style={{ marginBottom: 14 }}>Nội dung khóa học ({allLessons.length} bài)</p>
            {selectedCourse.chapters.map(ch => (
              <div key={ch.id} style={{ marginBottom: 14 }}>
                <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{ch.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{ch.lessons.length} bài học</p>
                </div>
                {ch.lessons.map(l => (
                  <div key={l.id} onClick={() => !isLocked(l, selectedCourse) && openLesson(selectedCourse, l)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", marginBottom: 4, background: "var(--bg-card)", border: "1px solid var(--border)", cursor: isLocked(l, selectedCourse) ? "default" : "pointer", transition: "all var(--transition)" }}
                    onMouseEnter={e => { if (!isLocked(l, selectedCourse)) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)" }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
                  >
                    <span>{completed.includes(l.id) ? "✅" : isLocked(l, selectedCourse) ? "🔒" : "▶"}</span>
                    <span style={{ flex: 1, fontSize: 14, color: isLocked(l, selectedCourse) ? "var(--text-muted)" : "var(--text-primary)" }}>{l.title}</span>
                    {l.isPreview && <span className="badge badge-success" style={{ fontSize: 10 }}>Xem thử</span>}
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.parts.length} video</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── HOME VIEW ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <NotificationPopup />

      {/* Left sidebar */}
      <div className="sidebar-collapse" style={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: sidebarOpen ? "auto" : "hidden" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, background: "var(--accent)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎓</div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>Tuxstudy</span>
          </div>
          <input className="input" style={{ fontSize: 13 }} placeholder="🔍 Tìm giáo viên..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {subjects.map(subj => {
            const filtered = subj.courses.filter(c => !search || c.teacherName.toLowerCase().includes(search.toLowerCase()))
            if (search && filtered.length === 0) return null
            const isExp = expandedSubjects.includes(subj.id) || search.length > 0
            const hasEnrolled = user.enrollments.some(eid => subj.courses.some(c => c.id === eid))
            return (
              <div key={subj.id} style={{ marginBottom: 3 }}>
                <button onClick={() => setExpandedSubjects(p => isExp ? p.filter(x => x !== subj.id) : [...p, subj.id])}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", borderRadius: "var(--radius-md)", transition: "background var(--transition)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{subj.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{subj.name}</span>
                    {hasEnrolled && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />}
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{isExp ? "▾" : "▸"}</span>
                </button>

                {isExp && (
                  <div style={{ paddingLeft: 12 }} className="animate-in">
                    {filtered.map(c => (
                      <button key={c.id} onClick={() => openCourse(c)}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 2, transition: "all var(--transition)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)" }}>
                        <span style={{ fontSize: 11 }}>{user.enrollments.includes(c.id) ? "✅" : "—"}</span>
                        {c.teacherName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <button className="btn btn-ghost" style={{ padding: "7px 10px" }} onClick={() => setSidebarOpen(p => !p)}>☰</button>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Chào mừng trở lại 👋</p>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{user.name}</h1>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <button className="btn btn-ghost" onClick={() => router.push("/activate")}>🎟️ Nhập code</button>
            </div>
          </div>

          {/* Continue learning */}
          {continueLesson && (
            <div style={{ marginBottom: 28, padding: 20, background: "var(--accent-dim)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p className="section-title" style={{ color: "var(--accent-light)", marginBottom: 4 }}>Tiếp tục học</p>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{continueLesson.course.teacherName}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{continueLesson.lesson.title}</p>
              </div>
              <button className="btn btn-primary" onClick={() => openLesson(continueLesson.course, continueLesson.lesson)}>▶ Tiếp tục</button>
            </div>
          )}

          {/* Enrolled courses */}
          {enrolledCourses.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p className="section-title" style={{ marginBottom: 14 }}>Khóa học của tôi ({enrolledCourses.length})</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {enrolledCourses.map(c => {
                  const s = getSubjectByCourse(subjects, c.id)
                  const p = getCourseProgress(c)
                  return (
                    <div key={c.id} className="card card-hover" style={{ padding: 18 }} onClick={() => openCourse(c)}>
                      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                        <div style={{ width: 42, height: 42, background: "var(--bg-active)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s?.icon}</div>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{s?.name}</p>
                          <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.teacherName}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>
                        <span>{p.done}/{p.total} bài</span><span>{p.pct}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${p.pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All subjects */}
          <p className="section-title" style={{ marginBottom: 14 }}>Tất cả môn học</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {subjects.map(s => (
              <div key={s.id} className="card card-hover" style={{ padding: 16 }}
                onClick={() => setExpandedSubjects(p => p.includes(s.id) ? p : [...p, s.id])}>
                <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>{s.icon}</span>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.courses.length} giáo viên</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
