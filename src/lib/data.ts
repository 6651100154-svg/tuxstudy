import { supabase } from "./supabase"

// ── Types ───────────────────────────────────────────────────────────────
export type Subject = { id: string; name: string; icon: string; courses: Course[] }
export type Course  = { id: string; subjectId: string; teacherName: string; teacherAvatar: string; description: string; previewVideoId: string; chapters: Chapter[] }
export type Chapter = { id: string; courseId: string; title: string; order: number; lessons: Lesson[] }
export type Lesson  = { id: string; chapterId: string; title: string; order: number; isPreview: boolean; parts: Part[] }
export type Part    = { id: string; lessonId: string; title: string; order: number; videoUrl: string; videoBackup?: string; pdfUrl?: string }
export type Notification = { id: string; content: string; startDate: string; endDate: string; active: boolean }

// ── Default subjects ──────────────────────────────────────────────────────────
export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: "toan", name: "Toán", icon: "📐",
    courses: [
      {
        id: "toan-gva", subjectId: "toan",
        teacherName: "Thầy Nguyễn Văn A", teacherAvatar: "", previewVideoId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
        description: "Khóa Toán ĐGNL chuyên sâu, từ cơ bản đến nâng cao. Thầy giảng theo phương pháp tư duy, giúp học sinh nắm vững bản chất.",
        chapters: [
          {
            id: "ch1", courseId: "toan-gva", title: "Chương 1: Đại số", order: 1,
            lessons: [
              { id: "l1", chapterId: "ch1", title: "Bài 01 - Hàm số và đồ thị", order: 1, isPreview: true, parts: [{ id: "p1", lessonId: "l1", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", pdfUrl: "" }, { id: "p2", lessonId: "l1", title: "Phần 2 - Bài tập", order: 2, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
              { id: "l2", chapterId: "ch1", title: "Bài 02 - Phương trình bậc hai", order: 2, isPreview: false, parts: [{ id: "p3", lessonId: "l2", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
              { id: "l3", chapterId: "ch1", title: "Bài 03 - Bất phương trình", order: 3, isPreview: false, parts: [{ id: "p4", lessonId: "l3", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
            ]
          },
          {
            id: "ch2", courseId: "toan-gva", title: "Chương 2: Giải tích", order: 2,
            lessons: [
              { id: "l4", chapterId: "ch2", title: "Bài 04 - Giới hạn", order: 1, isPreview: false, parts: [{ id: "p5", lessonId: "l4", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
              { id: "l5", chapterId: "ch2", title: "Bài 05 - Đạo hàm", order: 2, isPreview: false, parts: [{ id: "p6", lessonId: "l5", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
            ]
          },
        ]
      },
      {
        id: "toan-gvb", subjectId: "toan",
        teacherName: "Cô Trần Thị B", teacherAvatar: "", previewVideoId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
        description: "Khóa Toán giải nhanh trắc nghiệm. Cô hệ thống công thức và kỹ thuật làm bài thi ĐGNL hiệu quả.",
        chapters: [{ id: "ch3", courseId: "toan-gvb", title: "Chương 1: Kỹ thuật trắc nghiệm", order: 1, lessons: [{ id: "l6", chapterId: "ch3", title: "Bài 01 - Phương pháp loại đáp án", order: 1, isPreview: true, parts: [{ id: "p7", lessonId: "l6", title: "Phần 1 - Demo kỹ thuật", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] }] }]
      },
    ]
  },
  {
    id: "van", name: "Văn", icon: "📝",
    courses: [{
      id: "van-gvc", subjectId: "van",
      teacherName: "Thầy Lê Văn C", teacherAvatar: "", previewVideoId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
      description: "Khóa Ngữ Văn ĐGNL, kỹ năng đọc hiểu, nghị luận xã hội và văn học.",
      chapters: [{ id: "ch4", courseId: "van-gvc", title: "Chương 1: Đọc hiểu", order: 1, lessons: [{ id: "l7", chapterId: "ch4", title: "Bài 01 - Kỹ năng đọc hiểu", order: 1, isPreview: true, parts: [{ id: "p8", lessonId: "l7", title: "Phần 1 - Phương pháp", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", pdfUrl: "" }] }] }]
    }]
  },
  {
    id: "ly", name: "Lý", icon: "⚡",
    courses: [{
      id: "ly-gvd", subjectId: "ly",
      teacherName: "Thầy Phạm Văn D", teacherAvatar: "", previewVideoId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
      description: "Vật lý ĐGNL từ cơ bản đến nâng cao, bài tập thực tế và phương pháp giải nhanh.",
      chapters: [{ id: "ch5", courseId: "ly-gvd", title: "Chương 1: Cơ học", order: 1, lessons: [{ id: "l8", chapterId: "ch5", title: "Bài 01 - Động học", order: 1, isPreview: true, parts: [{ id: "p9", lessonId: "l8", title: "Phần 1 - Lý thuyết", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] }] }]
    }]
  },
  {
    id: "sinh", name: "Sinh", icon: "🧬",
    courses: [{
      id: "sinh-gve", subjectId: "sinh",
      teacherName: "Cô Hoàng Thị E", teacherAvatar: "", previewVideoId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs",
      description: "Sinh học ĐGNL hệ thống từ tế bào đến sinh thái, hình ảnh trực quan và bài tập phân tích.",
      chapters: [{
        id: "ch6", courseId: "sinh-gve", title: "Chương 1: Sinh học tế bào", order: 1,
        lessons: [
          { id: "l9", chapterId: "ch6", title: "Bài 01 - Cấu trúc tế bào", order: 1, isPreview: true, parts: [{ id: "p10", lessonId: "l9", title: "Phần 1 - Tế bào nhân sơ", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs", pdfUrl: "" }, { id: "p11", lessonId: "l9", title: "Phần 2 - Tế bào nhân thực", order: 2, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
          { id: "l10", chapterId: "ch6", title: "Bài 02 - Trao đổi chất", order: 2, isPreview: false, parts: [{ id: "p12", lessonId: "l10", title: "Phần 1 - Đồng hóa", order: 1, videoUrl: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" }] },
        ]
      }]
    }]
  },
]

export const DEFAULT_NOTIFICATION: Notification = {
  id: "notif1", active: true,
  content: "🎉 Chào mừng khai giảng khóa ĐGNL 2026! Đăng ký trước 30/5 được giảm 20% học phí.",
  startDate: "2025-05-01", endDate: "2025-12-31",
}

// ── Supabase Fetchers ───────────────────────────────────────────────────────
export async function fetchSubjects(): Promise<Subject[]> {
  try {
    const { data, error } = await supabase.from('subjects').select('*, courses(*, chapters(*, lessons(*, parts(*))))')
    if (error || !data) return []
    
    return data.map(s => ({
       id: s.id,
       name: s.name,
       icon: s.icon,
       courses: (s.courses || []).map((c: any) => ({
          id: c.id,
          subjectId: c.subject_id,
          teacherName: c.teacher_name,
          teacherAvatar: c.teacher_avatar || "",
          description: c.description || "",
          previewVideoId: c.preview_video_id || "",
          chapters: (c.chapters || []).map((ch: any) => ({
             id: ch.id,
             courseId: ch.course_id,
             title: ch.title,
             order: ch.order,
             lessons: (ch.lessons || []).map((l: any) => ({
                id: l.id,
                chapterId: l.chapter_id,
                title: l.title,
                order: l.order,
                isPreview: l.is_preview,
                parts: (l.parts || []).map((p: any) => ({
                   id: p.id,
                   lessonId: p.lesson_id,
                   title: p.title,
                   order: p.order,
                   videoUrl: p.video_url,
                   videoBackup: p.video_backup || "",
                   pdfUrl: p.pdf_url || ""
                })).sort((a: any,b: any) => a.order - b.order)
             })).sort((a: any,b: any) => a.order - b.order)
          })).sort((a: any,b: any) => a.order - b.order)
       }))
    }))
  } catch (e) {
    console.error("fetchSubjects failed", e)
    return []
  }
}

export async function saveSubjects(subjects: Subject[]) {
  // TODO: Implement per-entity API calls for full CRUD sync
  // Currently the admin UI updates local state only — changes will be lost on refresh
  console.warn("[Tuxstudy] saveSubjects: Chức năng đồng bộ ngược chưa được triển khai. Thay đổi chỉ lưu tạm trong phiên.")
}

export async function fetchNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase.from('notifications').select('*')
    if (error || !data) return [DEFAULT_NOTIFICATION]
    return data.map(n => ({
      id: n.id, content: n.content, startDate: n.start_date, endDate: n.end_date, active: n.active
    }))
  } catch(e) {
    return [DEFAULT_NOTIFICATION]
  }
}

export async function saveNotifications(notifs: Notification[]) {
  // Stub for now
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getCourseById(subjects: Subject[], id: string): Course | undefined {
  for (const s of subjects) { const c = s.courses.find(c => c.id === id); if (c) return c }
}

export function getSubjectByCourse(subjects: Subject[], courseId: string): Subject | undefined {
  return subjects.find(s => s.courses.some(c => c.id === courseId))
}

export function getAllLessons(subjects: Subject[]) {
  return subjects.flatMap(s => s.courses.flatMap(c => c.chapters.flatMap(ch => ch.lessons)))
}

export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
