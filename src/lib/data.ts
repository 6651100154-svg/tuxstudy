import { supabase } from './supabase'
import type { Subject, Provider, Course, Module, Lesson, Asset, Notification } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// Subject > Provider > Course > Module > Lesson > Asset
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchSubjects(): Promise<Subject[]> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, providers(*, courses(*, modules(*, lessons(*, assets(*)))))' )
      .order('order')
    if (error || !data) return []
    return data.map(mapSubject)
  } catch {
    return []
  }
}

export async function fetchSubjectsMeta(): Promise<Subject[]> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, providers(*, courses(*))')
      .order('order')
    if (error || !data) return []
    return data.map(s => ({
      id: s.id, name: s.name, icon: s.icon, color: s.color || '#6366f1', order: s.order,
      providers: (s.providers || []).map((p: any) => ({
        id: p.id, subjectId: s.id, name: p.name, avatar: p.avatar || '',
        description: p.description || '', order: p.order || 0,
        courses: (p.courses || []).sort((a: any, b: any) => a.order - b.order)
          .map((c: any) => mapCourseMeta(c, s.id, p.name)),
      })),
    }))
  } catch {
    return []
  }
}

export async function fetchCourse(courseId: string): Promise<Course | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, providers(*, subjects(*)), modules(*, lessons(*, assets(*)))')
      .eq('id', courseId)
      .single()
    if (error || !data) return null
    const provider = data.providers as any
    const subject  = provider?.subjects as any
    const course = mapCourseMeta(data, subject?.id, provider?.name)
    course.modules = (data.modules || []).sort((a: any, b: any) => a.order - b.order).map(mapModule)
    return course
  } catch {
    return null
  }
}

export async function fetchCourseRatings(courseId: string) {
  const { data } = await supabase
    .from('course_ratings')
    .select('*, accounts(name, avatar)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    return (data || []).map(mapNotif)
  } catch {
    return []
  }
}

// ── TSV Bulk Import helpers ───────────────────────────────────────────────

export interface TsvRow {
  index: string
  subjectRaw: string
  providerRaw: string
  filePath: string
  fileType: string
  driveId: string
}

export function parseTsvBulk(tsv: string): TsvRow[] {
  return tsv.trim().split('\n').filter(l => l.trim()).map(row => {
    const cols = row.split('\t')
    return {
      index:       cols[0]?.trim() || '',
      subjectRaw:  cols[1]?.trim() || '',
      providerRaw: cols[2]?.trim() || '',
      filePath:    cols[3]?.trim() || '',
      fileType:    cols[4]?.trim() || '',
      driveId:     cols[5]?.trim() || '',
    }
  })
}

export function parsePathSegments(filePath: string) {
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  const filename = parts[parts.length - 1] || ''
  const subjectIdx = parts.findIndex(p => /^\d{2}\./.test(p))
  if (subjectIdx === -1) return { course: '', module: '', lesson: filename, filename }
  const after = parts.slice(subjectIdx + 2)
  return {
    course:  after[0] || '',
    module:  after[1] || '',
    lesson:  after.length > 2 ? after[after.length - 2] : (after[1] || ''),
    filename,
  }
}

// ── Lookup helpers ────────────────────────────────────────────────────────

export function findCourse(subjects: Subject[], courseId: string): Course | undefined {
  for (const s of subjects)
    for (const p of s.providers)
      for (const c of p.courses)
        if (c.id === courseId) return c
  return undefined
}

export function findSubjectByCourse(subjects: Subject[], courseId: string): Subject | undefined {
  return subjects.find(s => s.providers.some(p => p.courses.some(c => c.id === courseId)))
}

export function findProviderByCourse(subjects: Subject[], courseId: string): Provider | undefined {
  for (const s of subjects)
    for (const p of s.providers)
      if (p.courses.some(c => c.id === courseId)) return p
  return undefined
}

export function getAllLessons(subjects: Subject[]): Lesson[] {
  return subjects.flatMap(s =>
    s.providers.flatMap(p =>
      p.courses.flatMap(c =>
        c.modules.flatMap(m => m.lessons)
      )
    )
  )
}

export function getAllCourses(subjects: Subject[]): Course[] {
  return subjects.flatMap(s => s.providers.flatMap(p => p.courses))
}

// ── Mappers ───────────────────────────────────────────────────────────────

function mapSubject(s: any): Subject {
  return {
    id: s.id, name: s.name, icon: s.icon, color: s.color || '#6366f1', order: s.order || 0,
    providers: (s.providers || []).sort((a: any, b: any) => a.order - b.order)
      .map((p: any) => mapProvider(p, s.id)),
  }
}

function mapProvider(p: any, subjectId: string): Provider {
  return {
    id: p.id, subjectId, name: p.name, avatar: p.avatar || '',
    description: p.description || '', order: p.order || 0,
    courses: (p.courses || []).sort((a: any, b: any) => a.order - b.order)
      .map((c: any) => mapCourse(c, subjectId, p.name)),
  }
}

function mapCourse(c: any, subjectId: string, providerName: string): Course {
  return {
    ...mapCourseMeta(c, subjectId, providerName),
    modules: (c.modules || []).sort((a: any, b: any) => a.order - b.order).map(mapModule),
  }
}

function mapCourseMeta(c: any, subjectId?: string, providerName?: string): Course {
  return {
    id: c.id, providerId: c.provider_id,
    name: c.name, coverImage: c.cover_image || '',
    description: c.description || '', tagline: c.tagline || '',
    previewVideoId: c.preview_video_id || '',
    isPublished: c.is_published ?? false,
    isTrialEnabled: c.is_trial_enabled ?? false,
    order: c.order || 0, modules: [], subjectId, providerName,
  }
}

function mapModule(m: any): Module {
  return {
    id: m.id, courseId: m.course_id, title: m.title, order: m.order || 0,
    lessons: (m.lessons || []).sort((a: any, b: any) => a.order - b.order).map(mapLesson),
  }
}

function mapLesson(l: any): Lesson {
  return {
    id: l.id, moduleId: l.module_id, title: l.title, order: l.order || 0,
    isTrial: l.is_trial ?? false, durationMin: l.duration_min || 0,
    assets: (l.assets || []).sort((a: any, b: any) => a.order - b.order).map(mapAsset),
  }
}

function mapAsset(a: any): Asset {
  return {
    id: a.id, lessonId: a.lesson_id, type: a.type || 'video',
    title: a.title, driveId: a.drive_id || '', url: a.url || '', order: a.order || 0,
  }
}

function mapNotif(n: any): Notification {
  return { id: n.id, content: n.content, startDate: n.start_date, endDate: n.end_date, active: n.active, createdAt: n.created_at }
}

// ── Re-exports ────────────────────────────────────────────────────────────
export type { Subject, Provider, Course, Module, Lesson, Asset, Notification }
export { uid } from './types'
