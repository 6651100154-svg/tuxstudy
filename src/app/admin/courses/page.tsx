"use client"
import { useState, useEffect } from "react"
import { fetchSubjects, saveSubjects, uid, type Subject, type Course, type Chapter, type Lesson, type Part } from "@/lib/data"

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ padding: 28, maxWidth: wide ? 640 : 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Part row inside lesson modal ──────────────────────────────────────────────
function PartRow({ part, idx, onChange, onRemove }: {
  part: Partial<Part>; idx: number;
  onChange: (f: string, v: string) => void; onRemove: () => void
}) {
  return (
    <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Phần {idx + 1}</span>
        {idx > 0 && <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: 11 }} onClick={onRemove}>Xóa</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <label className="label">Tên phần</label>
          <input className="input" placeholder="VD: Phần 1 - Lý thuyết" value={part.title || ""} onChange={e => onChange("title", e.target.value)} />
        </div>
        <div>
          <label className="label">Google Drive File ID (Video chính) *</label>
          <input className="input" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" value={part.videoUrl || ""} onChange={e => onChange("videoUrl", e.target.value)} />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            Lấy từ: drive.google.com/file/d/<strong>ID_Ở_ĐÂY</strong>/view
          </p>
        </div>
        <div>
          <label className="label">File ID Video dự phòng (tùy chọn)</label>
          <input className="input" placeholder="ID backup nếu link chính lỗi" value={part.videoBackup || ""} onChange={e => onChange("videoBackup", e.target.value)} />
        </div>
        <div>
          <label className="label">Link PDF (tùy chọn)</label>
          <input className="input" placeholder="Link Google Drive PDF hoặc File ID" value={part.pdfUrl || ""} onChange={e => onChange("pdfUrl", e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCoursesPage() {
  const [subjects, setSubjectsState] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse]       = useState<Course | null>(null)

  // Modals
  const [showAddSubject,  setShowAddSubject]  = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [editingLesson,   setEditingLesson]   = useState<Lesson | null>(null)
  const [editingChapter,  setEditingChapter]  = useState<Chapter | null>(null)
  const [editingTeacher,  setEditingTeacher]  = useState(false)

  // Forms
  const [newSubjectName,  setNewSubjectName]  = useState("")
  const [newSubjectIcon,  setNewSubjectIcon]  = useState("📖")
  const [chapterForm,     setChapterForm]     = useState({ title: "", courseId: "" })
  const [teacherForm, setTeacherForm] = useState({ name: "", description: "", previewVideoId: "" })
  const [lessonForm,  setLessonForm]  = useState({
    title: "", chapterId: "", isPreview: false,
    parts: [{ id: uid(), title: "Phần 1", videoUrl: "", videoBackup: "", pdfUrl: "" }] as Partial<Part>[]
  })

  useEffect(() => {
    fetchSubjects().then(s => {
      setSubjectsState(s)
      if (s.length > 0) setSelectedSubjectId(s[0].id)
    })
  }, [])

  const persist = (s: Subject[]) => { setSubjectsState(s); saveSubjects(s) }

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)

  // Sync selectedCourse khi subjects thay đổi
  useEffect(() => {
    if (selectedCourse) {
      const fresh = subjects.flatMap(s => s.courses).find(c => c.id === selectedCourse.id)
      if (fresh) setSelectedCourse(fresh)
    }
  }, [subjects])

  // ── Subject ───────────────────────────────────────────────────────────────
  const addSubject = () => {
    if (!newSubjectName.trim()) return
    const id = `subj-${uid()}`
    const updated = [...subjects, { id, name: newSubjectName.trim(), icon: newSubjectIcon, courses: [] }]
    persist(updated)
    setSelectedSubjectId(id)
    setNewSubjectName(""); setNewSubjectIcon("📖")
    setShowAddSubject(false)
  }

  const deleteSubject = (id: string) => {
    if (!confirm("Xóa môn học này? Toàn bộ khóa học và bài học sẽ bị xóa!")) return
    const updated = subjects.filter(s => s.id !== id)
    persist(updated)
    if (selectedSubjectId === id) { setSelectedSubjectId(updated[0]?.id || null); setSelectedCourse(null) }
  }

  // ── Teacher / Course ──────────────────────────────────────────────────────
  const openAddTeacher = () => { setEditingTeacher(false); setTeacherForm({ name: "", description: "", previewVideoId: "" }); setShowTeacherModal(true) }
  const openEditTeacher = (c: Course) => { setEditingTeacher(true); setTeacherForm({ name: c.teacherName, description: c.description, previewVideoId: c.previewVideoId }); setShowTeacherModal(true) }

  const saveTeacher = () => {
    if (!teacherForm.name.trim() || !selectedSubjectId) return
    // Close modal immediately to prevent double-click
    setShowTeacherModal(false)
    if (editingTeacher && selectedCourse) {
      // Update
      const updated = subjects.map(s => ({
        ...s, courses: s.courses.map(c => c.id !== selectedCourse.id ? c : { ...c, teacherName: teacherForm.name, description: teacherForm.description, previewVideoId: teacherForm.previewVideoId })
      }))
      persist(updated)
    } else {
      // Add
      const id = `course-${uid()}`
      const newCourse: Course = {
        id, subjectId: selectedSubjectId,
        teacherName: teacherForm.name.trim(),
        teacherAvatar: "", description: teacherForm.description,
        previewVideoId: teacherForm.previewVideoId,
        chapters: [{ id: `ch-${uid()}`, courseId: id, title: "Chương 1", order: 1, lessons: [] }]
      }
      const updated = subjects.map(s => s.id !== selectedSubjectId ? s : { ...s, courses: [...s.courses, newCourse] })
      persist(updated)
      setSelectedCourse(newCourse)
    }
  }

  const deleteTeacher = (courseId: string) => {
    if (!confirm("Xóa giáo viên và toàn bộ bài học?")) return
    const updated = subjects.map(s => ({ ...s, courses: s.courses.filter(c => c.id !== courseId) }))
    persist(updated)
    if (selectedCourse?.id === courseId) setSelectedCourse(null)
  }

  // ── Chapter ───────────────────────────────────────────────────────────────
  const openAddChapter = () => {
    if (!selectedCourse) return
    setEditingChapter(null)
    setChapterForm({ title: "", courseId: selectedCourse.id })
    setShowChapterModal(true)
  }

  const openEditChapter = (ch: Chapter) => {
    setEditingChapter(ch)
    setChapterForm({ title: ch.title, courseId: ch.courseId })
    setShowChapterModal(true)
  }

  const saveChapter = () => {
    if (!chapterForm.title.trim() || !selectedCourse) return
    // Close modal immediately to prevent double-click
    setShowChapterModal(false)
    if (editingChapter) {
      // Edit
      const updated = subjects.map(s => ({
        ...s, courses: s.courses.map(c => c.id !== selectedCourse.id ? c : {
          ...c, chapters: c.chapters.map(ch => ch.id !== editingChapter.id ? ch : { ...ch, title: chapterForm.title.trim() })
        })
      }))
      persist(updated)
    } else {
      // Add
      const newCh: Chapter = { id: `ch-${uid()}`, courseId: selectedCourse.id, title: chapterForm.title.trim(), order: selectedCourse.chapters.length + 1, lessons: [] }
      const updated = subjects.map(s => ({
        ...s, courses: s.courses.map(c => c.id !== selectedCourse.id ? c : { ...c, chapters: [...c.chapters, newCh] })
      }))
      persist(updated)
    }
  }

  const deleteChapter = (chId: string) => {
    if (!selectedCourse) return
    const ch = selectedCourse.chapters.find(c => c.id === chId)
    if (ch && ch.lessons.length > 0 && !confirm(`Chương "${ch.title}" có ${ch.lessons.length} bài. Xóa hết?`)) return
    const updated = subjects.map(s => ({
      ...s, courses: s.courses.map(c => c.id !== selectedCourse.id ? c : { ...c, chapters: c.chapters.filter(ch => ch.id !== chId) })
    }))
    persist(updated)
  }

  // ── Lesson ────────────────────────────────────────────────────────────────
  const openAddLesson = (chapterId: string) => {
    setEditingLesson(null)
    setLessonForm({ title: "", chapterId, isPreview: false, parts: [{ id: uid(), title: "Phần 1", videoUrl: "", videoBackup: "", pdfUrl: "" }] })
    setShowLessonModal(true)
  }

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    const ch = selectedCourse?.chapters.find(ch => ch.lessons.some(l => l.id === lesson.id))
    setLessonForm({ title: lesson.title, chapterId: ch?.id || "", isPreview: lesson.isPreview, parts: lesson.parts.map(p => ({ ...p })) })
    setShowLessonModal(true)
  }

  const saveLesson = () => {
    if (!lessonForm.title.trim() || !selectedCourse) return
    // Close modal immediately to prevent double-click
    setShowLessonModal(false)
    const updated = subjects.map(s => ({
      ...s, courses: s.courses.map(c => {
        if (c.id !== selectedCourse.id) return c
        return {
          ...c, chapters: c.chapters.map(ch => {
            if (editingLesson) {
              // Lesson might move to another chapter
              const hadLesson = ch.lessons.some(l => l.id === editingLesson.id)
              const isTarget  = ch.id === lessonForm.chapterId
              if (hadLesson && !isTarget) return { ...ch, lessons: ch.lessons.filter(l => l.id !== editingLesson.id) }
              if (isTarget && !hadLesson) return { ...ch, lessons: [...ch.lessons, { ...editingLesson, ...lessonForm, parts: lessonForm.parts as Part[] }] }
              if (hadLesson && isTarget) return { ...ch, lessons: ch.lessons.map(l => l.id !== editingLesson.id ? l : { ...l, title: lessonForm.title, isPreview: lessonForm.isPreview, parts: lessonForm.parts as Part[] }) }
              return ch
            } else {
              if (ch.id !== lessonForm.chapterId) return ch
              const newL: Lesson = { id: `l-${uid()}`, chapterId: ch.id, title: lessonForm.title, order: ch.lessons.length + 1, isPreview: lessonForm.isPreview, parts: lessonForm.parts as Part[] }
              return { ...ch, lessons: [...ch.lessons, newL] }
            }
          })
        }
      })
    }))
    persist(updated)
  }

  const deleteLesson = (lessonId: string) => {
    if (!selectedCourse || !confirm("Xóa bài học này?")) return
    const updated = subjects.map(s => ({
      ...s, courses: s.courses.map(c => c.id !== selectedCourse.id ? c : {
        ...c, chapters: c.chapters.map(ch => ({ ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) }))
      })
    }))
    persist(updated)
  }

  const updatePart = (idx: number, field: string, val: string) => {
    setLessonForm(f => ({ ...f, parts: f.parts.map((p, i) => i === idx ? { ...p, [field]: val } : p) }))
  }
  const addPart = () => setLessonForm(f => ({ ...f, parts: [...f.parts, { id: uid(), title: `Phần ${f.parts.length + 1}`, videoUrl: "", videoBackup: "", pdfUrl: "" }] }))
  const removePart = (idx: number) => setLessonForm(f => ({ ...f, parts: f.parts.filter((_, i) => i !== idx) }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* LEFT: Subjects + Teachers */}
      <div style={{ width: 250, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>Môn & GV</h2>
          <button className="btn btn-primary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setShowAddSubject(true)}>+ Môn</button>
        </div>

        <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
          {subjects.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📚</span>
              Chưa có môn học nào.<br />Bấm "+ Môn" để bắt đầu.
            </div>
          )}

          {subjects.map(subj => (
            <div key={subj.id} style={{ marginBottom: 4 }}>
              {/* Subject row */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 6px", borderRadius: "var(--radius-md)", background: selectedSubjectId === subj.id ? "var(--accent-dim)" : "transparent", cursor: "pointer", transition: "background var(--transition)" }}
                onClick={() => { setSelectedSubjectId(subj.id); setSelectedCourse(null) }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: selectedSubjectId === subj.id ? "var(--accent-light)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{subj.icon}</span>{subj.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}>{subj.courses.length}</span>
                <button onClick={e => { e.stopPropagation(); deleteSubject(subj.id) }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "2px 4px", borderRadius: 4, opacity: 0.6 }} title="Xóa môn">🗑</button>
              </div>

              {/* Courses under selected subject */}
              {selectedSubjectId === subj.id && (
                <div style={{ paddingLeft: 12, paddingTop: 2 }} className="animate-in">
                  {subj.courses.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 8px" }}>Chưa có giáo viên</p>
                  )}
                  {subj.courses.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
                      <button onClick={() => setSelectedCourse(c)}
                        style={{ flex: 1, textAlign: "left", background: selectedCourse?.id === c.id ? "var(--bg-active)" : "none", border: "none", cursor: "pointer", padding: "7px 8px", borderRadius: "var(--radius-md)", fontSize: 13, color: selectedCourse?.id === c.id ? "var(--text-primary)" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, transition: "all var(--transition)" }}>
                        <span style={{ fontSize: 11 }}>👤</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.teacherName}</span>
                      </button>
                      <button onClick={() => deleteTeacher(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, padding: "2px 4px", opacity: 0.6 }} title="Xóa GV">🗑</button>
                    </div>
                  ))}
                  <button className="btn btn-ghost" style={{ width: "100%", fontSize: 12, justifyContent: "center", padding: "6px", marginTop: 4 }} onClick={openAddTeacher}>
                    + Thêm giáo viên
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Course detail */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selectedCourse ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            <span style={{ fontSize: 52, marginBottom: 14 }}>👈</span>
            <p style={{ fontSize: 14 }}>Chọn một giáo viên để quản lý bài học</p>
            {selectedSubject && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAddTeacher}>+ Thêm giáo viên cho {selectedSubject.name}</button>
            )}
          </div>
        ) : (
          <div style={{ padding: 24 }}>

            {/* Teacher info header */}
            <div className="card" style={{ padding: 20, marginBottom: 22, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 56, height: 56, borderRadius: "var(--radius-lg)", background: "var(--accent-dim)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>{selectedCourse.teacherName}</h2>
                  <span className="badge badge-accent">{selectedSubject?.icon} {selectedSubject?.name}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>{selectedCourse.description || "Chưa có mô tả"}</p>
                {selectedCourse.previewVideoId && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Preview ID: <code style={{ color: "var(--accent-light)", background: "var(--bg-base)", padding: "1px 5px", borderRadius: 4 }}>{selectedCourse.previewVideoId}</code></p>
                )}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 13, flexShrink: 0 }} onClick={() => openEditTeacher(selectedCourse)}>✏️ Sửa</button>
            </div>

            {/* Chapter actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {selectedCourse.chapters.reduce((a, ch) => a + ch.lessons.length, 0)} bài học • {selectedCourse.chapters.length} chương
              </p>
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={openAddChapter}>+ Thêm chương</button>
            </div>

            {/* Chapters & Lessons */}
            {selectedCourse.chapters.length === 0 ? (
              <div className="card" style={{ padding: 36, textAlign: "center" }}>
                <span style={{ fontSize: 40, display: "block", marginBottom: 10 }}>📂</span>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có chương nào.</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openAddChapter}>+ Thêm chương đầu tiên</button>
              </div>
            ) : (
              selectedCourse.chapters.map(ch => (
                <div key={ch.id} className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
                  {/* Chapter header */}
                  <div style={{ padding: "12px 16px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15 }}>📂</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{ch.title}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{ch.lessons.length} bài</span>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => openEditChapter(ch)}>✏️</button>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => deleteChapter(ch.id)}>🗑</button>
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => openAddLesson(ch.id)}>+ Bài</button>
                  </div>

                  {/* Lessons */}
                  {ch.lessons.length === 0 ? (
                    <div style={{ padding: "18px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      Chưa có bài học — <button onClick={() => openAddLesson(ch.id)} style={{ background: "none", border: "none", color: "var(--accent-light)", cursor: "pointer", fontSize: 13 }}>Thêm bài đầu tiên</button>
                    </div>
                  ) : (
                    ch.lessons.map((lesson, li) => (
                      <div key={lesson.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: li === 0 ? "none" : "1px solid var(--border)", transition: "background var(--transition)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{lesson.isPreview ? "👁" : "🎬"}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>{lesson.title}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                            {lesson.parts.length} phần học
                            {lesson.parts.some(p => p.pdfUrl) ? ` • ${lesson.parts.filter(p => p.pdfUrl).length} PDF` : ""}
                            {lesson.isPreview ? " • 👁 Xem thử" : ""}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => openEditLesson(lesson)}>✏️ Sửa</button>
                          <button className="btn btn-danger" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => deleteLesson(lesson.id)}>🗑</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Add Subject ─────────────────────────────────────────────── */}
      {showAddSubject && (
        <Modal title="Thêm môn học mới" onClose={() => setShowAddSubject(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Tên môn học *</label>
              <input className="input" placeholder="VD: Hóa học" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()} autoFocus />
            </div>
            <div>
              <label className="label">Icon (emoji)</label>
              <input className="input" placeholder="📖" value={newSubjectIcon} onChange={e => setNewSubjectIcon(e.target.value)} style={{ fontSize: 20 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {["📐","📝","⚡","⚗️","🧬","📜","🌍","🔢","🎵","💻"].map(ic => (
                  <button key={ic} onClick={() => setNewSubjectIcon(ic)} style={{ width: 34, height: 34, fontSize: 18, cursor: "pointer", borderRadius: "var(--radius-sm)", border: `2px solid ${newSubjectIcon === ic ? "var(--accent)" : "var(--border)"}`, background: newSubjectIcon === ic ? "var(--accent-dim)" : "var(--bg-base)" }}>{ic}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setShowAddSubject(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={addSubject}>Thêm môn</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Teacher ─────────────────────────────────────────────────── */}
      {showTeacherModal && (
        <Modal title={editingTeacher ? "Chỉnh sửa giáo viên" : `Thêm giáo viên cho ${selectedSubject?.name}`} onClose={() => setShowTeacherModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Tên giáo viên *</label>
              <input className="input" placeholder="VD: Thầy Nguyễn Văn A" value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Mô tả khóa học</label>
              <textarea className="input" rows={3} placeholder="Mô tả ngắn về khóa học và phương pháp giảng dạy..." value={teacherForm.description} onChange={e => setTeacherForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">File ID Video giới thiệu (Google Drive)</label>
              <input className="input" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" value={teacherForm.previewVideoId} onChange={e => setTeacherForm(f => ({ ...f, previewVideoId: e.target.value }))} />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>drive.google.com/file/d/<strong>ID</strong>/view</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setShowTeacherModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveTeacher}>{editingTeacher ? "Lưu thay đổi" : "Thêm giáo viên"}</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Chapter ─────────────────────────────────────────────────── */}
      {showChapterModal && (
        <Modal title={editingChapter ? "Chỉnh sửa chương" : "Thêm chương mới"} onClose={() => setShowChapterModal(false)}>
          <div>
            <label className="label">Tên chương *</label>
            <input className="input" placeholder="VD: Chương 1: Đại số" value={chapterForm.title} onChange={e => setChapterForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && saveChapter()} autoFocus />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setShowChapterModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveChapter}>{editingChapter ? "Lưu" : "Thêm chương"}</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Lesson ──────────────────────────────────────────────────── */}
      {showLessonModal && (
        <Modal title={editingLesson ? "Chỉnh sửa bài học" : "Thêm bài học mới"} onClose={() => setShowLessonModal(false)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="label">Tên bài học *</label>
                <input className="input" placeholder="VD: Bài 01 - Hàm số" value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="label">Thuộc chương</label>
                <select className="input" value={lessonForm.chapterId} onChange={e => setLessonForm(f => ({ ...f, chapterId: e.target.value }))}>
                  {selectedCourse?.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={lessonForm.isPreview} onChange={e => setLessonForm(f => ({ ...f, isPreview: e.target.checked }))} />
              👁 Cho xem thử (không cần đăng ký khóa)
            </label>

            <hr className="divider" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>📹 Phần học ({lessonForm.parts.length})</p>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={addPart}>+ Thêm phần</button>
            </div>

            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {lessonForm.parts.map((p, i) => (
                <PartRow key={i} part={p} idx={i}
                  onChange={(f, v) => updatePart(i, f, v)}
                  onRemove={() => removePart(i)} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => setShowLessonModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveLesson}>{editingLesson ? "Lưu thay đổi" : "Thêm bài học"}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
