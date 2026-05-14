import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })

  try {
    // Run all queries in parallel for speed
    const [
      accountsRes,
      coursesRes,
      enrollmentsRes,
      codesRes,
      watchRes,
      progressRes,
      topStudentsWatchRes,
      topCoursesRes,
      subjectDistRes,
      recentCodesRes,
    ] = await Promise.all([
      db.from('accounts').select('id, name, email, active, created_at'),
      db.from('courses').select('id, name, providers(name)'),
      db.from('enrollments').select('account_id, course_id'),
      db.from('activation_codes').select('id, is_active, used_by, used_at'),
      db.from('watch_history').select('account_id, duration_sec'),
      db.from('lesson_progress').select('account_id, lesson_id').eq('completed', true),
      // Top 10 students by study time
      db.from('watch_history').select('account_id, duration_sec'),
      // Top 10 courses by enrollments
      db.from('enrollments').select('course_id'),
      // Enrollments by subject
      db.from('enrollments')
        .select('courses(id, providers(subjects(id, name, icon)))'),
      // Recent redeemed codes
      db.from('activation_codes')
        .select('code, used_at, accounts!used_by(name)')
        .not('used_by', 'is', null)
        .order('used_at', { ascending: false })
        .limit(8),
    ])

    const accounts = accountsRes.data || []
    const courses = coursesRes.data || []
    const enrollments = enrollmentsRes.data || []
    const codes = codesRes.data || []
    const watchRows = watchRes.data || []
    const progressRows = progressRes.data || []

    const totalStudents = accounts.length
    const activeStudents = accounts.filter(a => a.active).length
    const totalCourses = courses.length
    const totalEnrollments = enrollments.length
    const totalCodesCreated = codes.length
    const totalCodesUsed = codes.filter(c => c.used_by).length

    // Total study seconds across all users
    const totalStudyHoursAll = watchRows.reduce((s: number, r: any) => s + (r.duration_sec || 0), 0)

    // Per-account study seconds
    const studyByAccount: Record<string, number> = {}
    for (const r of watchRows) {
      studyByAccount[r.account_id] = (studyByAccount[r.account_id] || 0) + (r.duration_sec || 0)
    }

    // Per-account completed lessons
    const lessonsByAccount: Record<string, number> = {}
    for (const r of progressRows) {
      lessonsByAccount[r.account_id] = (lessonsByAccount[r.account_id] || 0) + 1
    }

    // Per-account enrollments
    const enrollsByAccount: Record<string, number> = {}
    for (const e of enrollments) {
      enrollsByAccount[e.account_id] = (enrollsByAccount[e.account_id] || 0) + 1
    }

    // Top 10 students by study time
    const topStudents = accounts
      .map(a => ({
        id: a.id, name: a.name, email: a.email,
        studySec: studyByAccount[a.id] || 0,
        completedLessons: lessonsByAccount[a.id] || 0,
        enrollments: enrollsByAccount[a.id] || 0,
      }))
      .sort((a, b) => b.studySec - a.studySec)
      .slice(0, 10)

    // Top courses by enrollment
    const courseEnrollCount: Record<string, number> = {}
    for (const e of enrollments) {
      courseEnrollCount[e.course_id] = (courseEnrollCount[e.course_id] || 0) + 1
    }
    const topCourses = courses
      .map((c: any) => ({
        id: c.id, name: c.name,
        providerName: (c.providers as any)?.name || '',
        enrollCount: courseEnrollCount[c.id] || 0,
      }))
      .sort((a, b) => b.enrollCount - a.enrollCount)
      .slice(0, 10)

    // Subject distribution
    const subjectCounts: Record<string, { name: string; icon: string; count: number }> = {}
    for (const e of (subjectDistRes.data || [])) {
      const course = (e as any).courses
      const provider = course?.providers
      const subject = provider?.subjects
      if (subject?.id) {
        if (!subjectCounts[subject.id]) subjectCounts[subject.id] = { name: subject.name, icon: subject.icon || '📖', count: 0 }
        subjectCounts[subject.id].count++
      }
    }
    const subjectDist = Object.values(subjectCounts).sort((a, b) => b.count - a.count)

    // Recent codes
    const recentCodes = (recentCodesRes.data || []).map((c: any) => ({
      code: c.code,
      usedByName: (c.accounts as any)?.name || '',
      usedAt: c.used_at,
    }))

    return NextResponse.json({
      ok: true,
      data: {
        totalStudents, activeStudents, totalCourses, totalEnrollments,
        totalCodesCreated, totalCodesUsed, totalStudyHoursAll,
        topStudents, topCourses, subjectDist, recentCodes,
      }
    })
  } catch (e) {
    console.error('Dashboard API error:', e)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
