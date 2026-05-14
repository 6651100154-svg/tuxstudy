// ═══════════════════════════════════════════════════════════════
// TuxStudy v3 — Core Types
// Subject > Provider > Course > Module > Lesson > Asset
// ═══════════════════════════════════════════════════════════════

export type Role = 'admin' | 'student'
export type AssetType = 'video' | 'pdf' | 'ebook' | 'sheet' | 'other'
export type CodeScope = 'single_course' | 'single_subject' | 'three_subjects' | 'all_courses'
export type CodeVariant = 'general' | 'thpt' | 'exam' | 'vip'

// ── Content ──────────────────────────────────────────────────────────────
export interface Subject {
  id: string
  name: string
  icon: string
  color: string
  order: number
  providers: Provider[]
}

export interface Provider {
  id: string
  subjectId: string
  name: string
  avatar: string
  description: string
  order: number
  courses: Course[]
}

export interface Course {
  id: string
  providerId: string
  name: string
  coverImage: string
  description: string
  tagline: string
  previewVideoId: string
  isPublished: boolean
  isTrialEnabled: boolean
  order: number
  modules: Module[]
  // computed fields
  subjectId?: string
  subjectName?: string
  providerName?: string
  ratingsAvg?: number
  ratingsCount?: number
}

export interface Module {
  id: string
  courseId: string
  title: string
  order: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  order: number
  isTrial: boolean
  durationMin: number
  assets: Asset[]
}

export interface Asset {
  id: string
  lessonId: string
  type: AssetType
  title: string
  driveId: string
  url: string
  order: number
}

// ── User & Auth ───────────────────────────────────────────────────────────
export interface Account {
  id: string
  authId?: string
  email: string
  name: string
  role: Role
  avatar: string
  active: boolean
  createdAt: string
  enrollments: string[]       // course IDs
  totalStudySeconds?: number  // computed from watch_history
  completedLessons?: number   // computed from lesson_progress
}

// ── Progress ──────────────────────────────────────────────────────────────
export interface LessonProgress {
  lessonId: string
  completed: boolean
  completedAt?: string
}

export interface WatchEntry {
  assetId: string
  lessonId: string
  durationSec: number
  watchedAt: string
}

// ── Activation ────────────────────────────────────────────────────────────
export interface ActivationCode {
  id: string
  code: string
  templateKey: string
  label: string
  scope: CodeScope
  variant: CodeVariant
  maxCourseSelect: number
  maxSubjectSelect: number
  grantsAllCourses: boolean
  isActive: boolean
  usedBy?: string
  usedByName?: string
  usedAt?: string
  expiresAt?: string
  createdBy?: string
  createdAt: string
}

export interface ActivationRedemption {
  id: string
  activationCodeId: string
  accountId: string
  selectedCourseId?: string
  selectedSubjectIds: string[]
  grantedCourseIds: string[]
  createdAt: string
}

// ── Notifications ─────────────────────────────────────────────────────────
export interface Notification {
  id: string
  content: string
  startDate: string
  endDate: string
  active: boolean
  createdAt?: string
}

// ── Admin Dashboard Stats ─────────────────────────────────────────────────
export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalCourses: number
  totalEnrollments: number
  totalCodesCreated: number
  totalCodesUsed: number
  totalStudyHours: number
  topCourses: { courseId: string; courseName: string; enrollments: number }[]
  topStudents: { accountId: string; name: string; studyHours: number; completedLessons: number }[]
  enrollmentsBySubject: { subjectId: string; subjectName: string; count: number }[]
  recentActivity: { type: string; description: string; time: string }[]
}

// ── API Responses ─────────────────────────────────────────────────────────
export interface ApiOk<T = void> {
  ok: true
  data: T
}
export interface ApiErr {
  ok: false
  error: string
}
export type ApiResult<T = void> = ApiOk<T> | ApiErr

// ── Code Templates ────────────────────────────────────────────────────────
export interface CodeTemplate {
  key: string
  label: string
  description: string
  scope: CodeScope
  variant: CodeVariant
  quantity: number
  maxCourseSelect: number
  maxSubjectSelect: number
  grantsAllCourses: boolean
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    key: 'one_teacher',
    label: '1 Giáo viên',
    description: '20 code, mỗi code chọn 1 khóa cụ thể',
    scope: 'single_course',
    variant: 'general',
    quantity: 20,
    maxCourseSelect: 1,
    maxSubjectSelect: 0,
    grantsAllCourses: false,
  },
  {
    key: 'full_subject_thpt',
    label: 'Full 1 môn THPT',
    description: '10 code, mỗi code kích hoạt 1 môn THPT',
    scope: 'single_subject',
    variant: 'thpt',
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
  },
  {
    key: 'full_subject_exam',
    label: 'Full 1 môn kỳ thi ngoài',
    description: '10 code, mỗi code kích hoạt 1 môn kỳ thi ngoài',
    scope: 'single_subject',
    variant: 'exam',
    quantity: 10,
    maxCourseSelect: 0,
    maxSubjectSelect: 1,
    grantsAllCourses: false,
  },
  {
    key: 'full_3_subjects_thpt',
    label: 'Full 3 môn THPT',
    description: '5 code, mỗi code chọn đúng 3 môn THPT',
    scope: 'three_subjects',
    variant: 'thpt',
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
  },
  {
    key: 'full_3_subjects_exam',
    label: 'Full 3 môn kỳ thi ngoài',
    description: '5 code, mỗi code chọn đúng 3 môn kỳ thi ngoài',
    scope: 'three_subjects',
    variant: 'exam',
    quantity: 5,
    maxCourseSelect: 0,
    maxSubjectSelect: 3,
    grantsAllCourses: false,
  },
  {
    key: 'vip_all_in_one',
    label: 'VIP ALL IN ONE',
    description: '1 code, kích hoạt toàn bộ khóa học',
    scope: 'all_courses',
    variant: 'vip',
    quantity: 1,
    maxCourseSelect: 0,
    maxSubjectSelect: 0,
    grantsAllCourses: true,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatStudyTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}g ${m}p`
  return `${m} phút`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
}
