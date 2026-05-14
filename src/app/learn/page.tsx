'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { fetchSubjectsMeta, getAllCourses, fetchCourse, findSubjectByCourse } from '@/lib/data'
import { getLessonProgress, markLessonCompleted } from '@/lib/supabase'
import type { Subject, Course, Module, Lesson, Asset } from '@/lib/types'
import TopBar from '@/components/TopBar'
import NotificationPopup from '@/components/NotificationPopup'

// ── Asset Player ──────────────────────────────────────────────────────────
function AssetPlayer({ asset }: { asset: Asset }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [asset.id])

  if (asset.type === 'video') {
    const src = !failed ? `https://drive.google.com/file/d/${asset.driveId}/preview` : null
    if (!src) return (
      <div className="video-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-card)' }}>
        <span style={{ fontSize: 40 }}>⚠️</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Không thể tải video. Vui lòng thử lại.</p>
      </div>
    )
    return (
      <div className="video-wrapper">
        <iframe key={asset.id} src={src} allowFullScreen allow="autoplay" onError={() => setFailed(true)} />
      </div>
    )
  }

  if (asset.type === 'pdf') {
    const src = asset.url || (asset.driveId ? `https://drive.google.com/file/d/${asset.driveId}/preview` : '')
    return (
      <div style={{ width: '100%', height: 600, borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <iframe src={src} style={{ width: '100%', height: '100%', border: 'none' }} />
      </div>
    )
  }

  const href = asset.url || (asset.driveId ? `https://drive.google.com/file/d/${asset.driveId}/view` : '')
  const icon = asset.type === 'ebook' ? '📘' : asset.type === 'sheet' ? '📊' : '📄'
  return (
    <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>{asset.title}</p>
        <a href={href} target="_blank" rel="noreferrer">
          <button className="btn btn-primary" style={{ fontSize: 13 }}>Mở tài liệu ↗</button>
        </a>
      </div>
    </div>
  )
}

// ── Lesson sidebar item ───────────────────────────────────────────────────
function LessonItem({ lesson, isActive, isDone, isLocked, onClick }: {
  lesson: Lesson; isActive: boolean; isDone: boolean; isLocked: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={isLocked ? undefined : onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 12px',
        background: isActive ? 'var(--accent-dim)' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
        borderRadius: 'var(--r-sm)', cursor: isLocked ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all var(--transition)', opacity: isLocked ? 0.4 : 1, marginBottom: 2,
      }}
      onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span style={{ fontSize: 11, flexShrink: 0 }}>{isDone ? '✅' : isActive ? '🔵' : isLocked ? '🔒' : '⬜'}</span>
      <span style={{ fontSize: 13, lineHeight: 1.4, flex: 1, color: isActive ? 'var(--accent-light)' : 'var(--text-primary)' }}>
        {lesson.title}
      </span>
      {lesson.isTrial && !isLocked && (
        <span className="badge badge-success" style={{ fontSize: 10, padding: '1px 5px' }}>Thử</span>
      )}
    </button>
  )
}

// ── Course Template ───────────────────────────────────────────────────────
function CourseTemplate({ course, subject, enrollments, onEnroll, onLearn, onBack }: {
  course: Course; subject?: Subject; enrollments: string[]
  onEnroll: () => void; onLearn: (lesson: Lesson) => void; onBack: () => void
}) {
  const isEnrolled = enrollments.includes(course.id)
  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div className="animate-up" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <button className="btn btn-ghost" style={{ marginBottom: 20, fontSize: 13 }} onClick={onBack}>← Quay lại</button>

      <div className="glass" style={{ borderRadius: 'var(--r-2xl)', overflow: 'hidden', marginBottom: 20 }}>
        {/* Cover */}
        <div style={{
          width: '100%', aspectRatio: '2.5/1', minHeight: 160,
          background: course.coverImage ? `url(${course.coverImage}) center/cover` : `linear-gradient(135deg, ${subject?.color || '#6366f1'}44, rgba(139,92,246,0.3))`,
          display: 'flex', alignItems: 'flex-end', padding: 24, position: 'relative',
        }}>
          {!course.coverImage && (
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 72, opacity: 0.25 }}>
              {subject?.icon || '📚'}
            </span>
          )}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {subject && <span className="badge badge-neutral">{subject.icon} {subject.name}</span>}
            {course.isTrialEnabled && <span className="badge badge-success">Có học thử</span>}
            {isEnrolled && <span className="badge badge-accent">✓ Đã kích hoạt</span>}
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {course.name}
          </h1>
          {course.providerName && (
            <p style={{ fontSize: 14, color: 'var(--accent-light)', marginBottom: 12, fontWeight: 500 }}>👨‍🏫 {course.providerName}</p>
          )}
          {course.tagline && <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 12 }}>{course.tagline}</p>}
          {course.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{course.description}</p>}

          <div style={{ display: 'flex', gap: 24, marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{course.modules.length}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chuyên đề</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{totalLessons}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bài học</p>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {isEnrolled ? (
              <button className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px', fontWeight: 600 }}
                onClick={() => { const l = course.modules[0]?.lessons[0]; if (l) onLearn(l) }}>
                ▶ Học ngay
              </button>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 15, padding: '12px 28px', fontWeight: 600 }} onClick={onEnroll}>
                🔑 Kích hoạt ngay
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-xl)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nội dung khóa học</h2>
        {course.modules.map(mod => (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              {mod.title}
            </p>
            {mod.lessons.map((lesson, li) => {
              const isTrialLesson = lesson.isTrial && course.isTrialEnabled
              const isLocked = !isEnrolled && !isTrialLesson
              return (
                <div key={lesson.id} className="timeline-item" style={{ position: 'relative' }}>
                  {li < mod.lessons.length - 1 && <div className="timeline-line" />}
                  <div className={`timeline-dot ${isTrialLesson ? 'trial' : isDone(lesson.id) ? 'done' : ''}`}
                    style={{ cursor: isLocked ? 'default' : 'pointer' }}
                    onClick={() => !isLocked && onLearn(lesson)}
                  >
                    {isLocked ? '🔒' : (li + 1)}
                  </div>
                  <div style={{ flex: 1, paddingTop: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: isLocked ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 3 }}>
                      {lesson.title}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {isTrialLesson && <span className="badge badge-success" style={{ fontSize: 10 }}>Học thử</span>}
                      {lesson.assets.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {lesson.assets.filter(a => a.type === 'video').length > 0 && '🎬 '}
                          {lesson.assets.filter(a => a.type === 'pdf').length > 0 && '📄 '}
                          {lesson.assets.length} tài nguyên
                        </span>
                      )}
                      {!isLocked && (
                        <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => onLearn(lesson)}>
                          {isEnrolled ? 'Xem →' : 'Học thử →'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  function isDone(lessonId: string) { return false } // will use completedIds from parent
}

// ── Learn View ────────────────────────────────────────────────────────────
function LearnView({ course, subject, lesson: initLesson, completedIds, onComplete, onBack }: {
  course: Course; subject?: Subject; lesson: Lesson; completedIds: string[]
  onComplete: (id: string) => void; onBack: () => void
}) {
  const [curLesson, setCurLesson] = useState(initLesson)
  const [curAsset, setCurAsset]   = useState(initLesson.assets[0] || null)
  const [expanded, setExpanded]   = useState([course.modules[0]?.id || ''])
  const [sidebar, setSidebar]     = useState(true)

  const allLessons = course.modules.flatMap(m => m.lessons)
  const idx = allLessons.findIndex(l => l.id === curLesson.id)
  const total = allLessons.length
  const done = completedIds.length
  const pct = total ? Math.round(done / total * 100) : 0

  const goTo = (l: Lesson) => {
    setCurLesson(l)
    setCurAsset(l.assets[0] || null)
    setExpanded(p => p.includes(l.moduleId) ? p : [...p, l.moduleId])
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="sidebar sidebar-collapse scroll-thin" style={{ width: sidebar ? 268 : 0, opacity: sidebar ? 1 : 0, overflow: sidebar ? 'hidden auto' : 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12, marginBottom: 10, justifyContent: 'flex-start' }} onClick={onBack}>← Quay lại</button>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subject?.icon} {subject?.name}</p>
          <p style={{ fontSize: 13, fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>{course.name}</p>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>{done}/{total}</span><span>{pct}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {course.modules.map(mod => (
            <div key={mod.id} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setExpanded(p => p.includes(mod.id) ? p.filter(x => x !== mod.id) : [...p, mod.id])}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '5px 6px', marginBottom: 2 }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{mod.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{expanded.includes(mod.id) ? '▾' : '▸'}</span>
              </button>
              {expanded.includes(mod.id) && mod.lessons.map(l => (
                <LessonItem key={l.id} lesson={l} isActive={l.id === curLesson.id}
                  isDone={completedIds.includes(l.id)} isLocked={false} onClick={() => goTo(l)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setSidebar(p => !p)}>☰</button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curLesson.title}</span>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { if (idx > 0) goTo(allLessons[idx - 1]) }} disabled={idx === 0}>← Trước</button>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { onComplete(curLesson.id); if (idx < total - 1) goTo(allLessons[idx + 1]) }}>
            {idx < total - 1 ? 'Tiếp →' : '✓ Hoàn thành'}
          </button>
        </div>

        <div style={{ padding: 24, flex: 1 }}>
          {curLesson.assets.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {curLesson.assets.map(a => (
                <button key={a.id} className={`btn ${a.id === curAsset?.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }} onClick={() => setCurAsset(a)}>
                  {a.type === 'video' ? '🎬' : a.type === 'pdf' ? '📄' : '📊'} {a.title}
                </button>
              ))}
            </div>
          )}
          {curAsset && <AssetPlayer asset={curAsset} />}
          <div style={{ marginTop: 14 }}>
            <button className={`btn ${completedIds.includes(curLesson.id) ? 'btn-success' : 'btn-ghost'}`} style={{ fontSize: 13 }} onClick={() => onComplete(curLesson.id)}>
              {completedIds.includes(curLesson.id) ? '✅ Đã hoàn thành' : '☑ Đánh dấu hoàn thành'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [completedIds, setCompleted] = useState<string[]>([])
  const [view, setView] = useState<'home' | 'template' | 'learn'>('home')
  const [selCourse, setSelCourse] = useState<Course | null>(null)
  const [selSubject, setSelSubject] = useState<Subject | undefined>()
  const [selLesson, setSelLesson] = useState<Lesson | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    fetchSubjectsMeta().then(setSubjects)
    getLessonProgress(user.id).then(setCompleted)
  }, [user])

  if (!user) return null

  const enrolledIds = user.enrollments

  const openTemplate = async (courseId: string, subject?: Subject) => {
    setLoadingCourse(true)
    setView('template')
    const full = await fetchCourse(courseId)
    if (full) { setSelCourse(full); setSelSubject(subject) }
    setLoadingCourse(false)
  }

  const openLearn = (lesson: Lesson) => { setSelLesson(lesson); setView('learn') }

  const markDone = async (lessonId: string) => {
    if (completedIds.includes(lessonId)) return
    const ok = await markLessonCompleted(user.id, lessonId)
    if (ok) setCompleted(p => [...p, lessonId])
  }

  const enrolledCourses = subjects.flatMap(s =>
    s.providers.flatMap(p =>
      p.courses.filter(c => enrolledIds.includes(c.id)).map(c => ({ ...c, subject: s, providerName: p.name }))
    )
  )

  const filtered = search
    ? subjects.map(s => ({
        ...s,
        providers: s.providers.map(p => ({
          ...p,
          courses: p.courses.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            s.name.toLowerCase().includes(search.toLowerCase())
          ),
        })).filter(p => p.courses.length > 0),
      })).filter(s => s.providers.length > 0)
    : subjects

  // ── Learn View ────────────────────────────────────────────────────────────
  if (view === 'learn' && selCourse && selLesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <NotificationPopup />
        <TopBar title={selCourse.name} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <LearnView course={selCourse} subject={selSubject} lesson={selLesson}
            completedIds={completedIds} onComplete={markDone} onBack={() => setView('template')} />
        </div>
      </div>
    )
  }

  // ── Template View ─────────────────────────────────────────────────────────
  if (view === 'template' && selCourse) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <NotificationPopup />
        <TopBar />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingCourse ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div className="loading-ring" />
            </div>
          ) : (
            <CourseTemplate
              course={selCourse} subject={selSubject} enrollments={enrolledIds}
              onEnroll={() => router.push('/account')}
              onLearn={openLearn} onBack={() => setView('home')}
            />
          )}
        </div>
      </div>
    )
  }

  // ── Home View ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <NotificationPopup />
      <TopBar
        rightSlot={
          <div className="search-box" style={{ width: 220 }}>
            <span className="search-icon">🔍</span>
            <input className="input" placeholder="Tìm khóa học..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 'var(--r-full)', fontSize: 13 }} />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

        {/* Continue */}
        {enrolledCourses.length > 0 && !search && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.02em' }}>Tiếp tục học</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {enrolledCourses.slice(0, 4).map(({ subject, ...course }) => {
                const allL = course.modules.reduce((acc: Lesson[], m: Module) => [...acc, ...m.lessons], [])
                const doneL = completedIds.filter(id => allL.some(l => l.id === id)).length
                const pct = allL.length ? Math.round(doneL / allL.length * 100) : 0
                return (
                  <div key={course.id} className="course-card" onClick={() => openTemplate(course.id, subject)}>
                    <div className="course-card-cover" style={{ background: `${subject?.color || '#6366f1'}22` }}>
                      <span style={{ zIndex: 2, fontSize: 40 }}>{subject?.icon || '📚'}</span>
                    </div>
                    <div style={{ padding: '14px 16px', position: 'relative', zIndex: 2 }}>
                      <p style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 500, marginBottom: 4 }}>{course.providerName}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 10, letterSpacing: '-0.01em' }}>{course.name}</p>
                      <div className="progress-bar" style={{ marginBottom: 6 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doneL}/{allL.length} bài · {pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All subjects */}
        {filtered.map(subject => (
          <div key={subject.id} style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>{subject.icon}</span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{subject.name}</h2>
              <span className="badge badge-neutral">{subject.providers.reduce((s, p) => s + p.courses.length, 0)} khóa</span>
            </div>
            {subject.providers.map(provider => (
              <div key={provider.id} style={{ marginBottom: 20 }}>
                {subject.providers.length > 1 && (
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 4 }}>{provider.name}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
                  {provider.courses.map(course => {
                    const isEnrolled = enrolledIds.includes(course.id)
                    return (
                      <div key={course.id} className="course-card" onClick={() => openTemplate(course.id, subject)}>
                        <div className="course-card-cover" style={{ background: `${subject.color}22`, minHeight: 120 }}>
                          <span style={{ zIndex: 2, fontSize: 36 }}>{subject.icon}</span>
                        </div>
                        <div style={{ padding: '12px 14px', position: 'relative', zIndex: 2 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 6, letterSpacing: '-0.01em' }}>{course.name}</p>
                          {course.tagline && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{course.tagline}</p>}
                          <div>
                            {isEnrolled
                              ? <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Đã kích hoạt</span>
                              : course.isTrialEnabled
                                ? <span className="badge badge-info" style={{ fontSize: 10 }}>Có học thử</span>
                                : <span className="badge badge-neutral" style={{ fontSize: 10 }}>Chưa kích hoạt</span>
                            }
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filtered.length === 0 && search && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 48 }}>🔍</span>
            <p style={{ marginTop: 12 }}>Không tìm thấy kết quả cho &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  )
}
