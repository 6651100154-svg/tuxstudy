import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Default subjects data ──────────────────────────────────────────────────────────
const DEFAULT_SUBJECTS = [
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

const DEFAULT_NOTIFICATION = {
  id: "notif1", active: true,
  content: "🎉 Chào mừng khai giảng khóa ĐGNL 2026! Đăng ký trước 30/5 được giảm 20% học phí.",
  startDate: "2025-05-01", endDate: "2025-12-31",
}

async function run() {
  console.log("Bắt đầu import dữ liệu Khóa học lên Supabase...")

  // 1. Subjects
  for (const s of DEFAULT_SUBJECTS) {
    const { error } = await supabase.from('subjects').upsert({ id: s.id, name: s.name, icon: s.icon })
    if (error) console.error("Lỗi insert subject:", error)
    else console.log(`+ Đã import môn: ${s.name}`)

    // 2. Courses
    for (const c of s.courses) {
      const { error: errC } = await supabase.from('courses').upsert({
        id: c.id,
        subject_id: s.id,
        teacher_name: c.teacherName,
        teacher_avatar: c.teacherAvatar,
        description: c.description,
        preview_video_id: c.previewVideoId
      })
      if (errC) console.error("Lỗi insert course:", errC)

      // 3. Chapters
      for (const ch of c.chapters) {
        const { error: errCh } = await supabase.from('chapters').upsert({
          id: ch.id,
          course_id: c.id,
          title: ch.title,
          order: ch.order
        })
        if (errCh) console.error("Lỗi insert chapter:", errCh)

        // 4. Lessons
        for (const l of ch.lessons) {
          const { error: errL } = await supabase.from('lessons').upsert({
            id: l.id,
            chapter_id: ch.id,
            title: l.title,
            order: l.order,
            is_preview: l.isPreview
          })
          if (errL) console.error("Lỗi insert lesson:", errL)

          // 5. Parts
          for (const p of l.parts) {
            const { error: errP } = await supabase.from('parts').upsert({
              id: p.id,
              lesson_id: l.id,
              title: p.title,
              order: p.order,
              video_url: p.videoUrl,
              video_backup: p.videoBackup || null,
              pdf_url: p.pdfUrl || null
            })
            if (errP) console.error("Lỗi insert part:", errP)
          }
        }
      }
    }
  }

  // Notification
  const { error: errN } = await supabase.from('notifications').upsert({
    id: DEFAULT_NOTIFICATION.id,
    content: DEFAULT_NOTIFICATION.content,
    start_date: DEFAULT_NOTIFICATION.startDate,
    end_date: DEFAULT_NOTIFICATION.endDate,
    active: DEFAULT_NOTIFICATION.active
  })
  if (errN) console.error("Lỗi insert notification:", errN)
  else console.log("+ Đã import thông báo hệ thống")

  console.log("✅ Import hoàn tất!")
}

run()
