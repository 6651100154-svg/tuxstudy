import { NextRequest } from 'next/server'
import { requireApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'

function uniq(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (!auth.ok) return Response.json({ ok: false, error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const code = String(body.code || '').trim().toUpperCase()
  if (!code) return Response.json({ ok: false, error: 'Mã không được để trống' }, { status: 400 })

  const selectedCourseId    = String(body.selectedCourseId || '').trim()
  const selectedSubjectIds  = uniq(Array.isArray(body.selectedSubjectIds) ? body.selectedSubjectIds.map(String) : [])
  const accountId = auth.account?.id!

  // 1. Fetch code row
  const { data: codeRow, error: codeErr } = await db
    .from('activation_codes')
    .select('*')
    .eq('code', code)
    .single()

  if (codeErr || !codeRow) return Response.json({ ok: false, error: 'Mã không tồn tại' }, { status: 404 })
  if (!codeRow.is_active) return Response.json({ ok: false, error: 'Mã đã bị vô hiệu hóa' }, { status: 400 })
  if (codeRow.used_by) return Response.json({ ok: false, error: 'Mã đã được dùng bởi tài khoản khác' }, { status: 409 })
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return Response.json({ ok: false, error: 'Mã đã hết hạn' }, { status: 400 })
  }

  // 2. Load all courses WITH subject info (through providers)
  const { data: courses, error: coursesErr } = await db
    .from('courses')
    .select('id, name, provider_id, providers(subject_id)')
  if (coursesErr || !courses) return Response.json({ ok: false, error: 'Không thể tải danh sách khóa học' }, { status: 500 })

  // 3. Determine which courses to grant
  let grantedCourseIds: string[] = []

  if (codeRow.grants_all_courses) {
    grantedCourseIds = courses.map(c => c.id)
  } else if (codeRow.scope === 'single_course') {
    if (!selectedCourseId) return Response.json({ ok: false, error: 'Vui lòng chọn khóa học' }, { status: 400 })
    if (!courses.find(c => c.id === selectedCourseId)) return Response.json({ ok: false, error: 'Khóa học không hợp lệ' }, { status: 400 })
    grantedCourseIds = [selectedCourseId]
  } else if (codeRow.scope === 'single_subject') {
    if (selectedSubjectIds.length !== 1) return Response.json({ ok: false, error: 'Vui lòng chọn đúng 1 môn học' }, { status: 400 })
    grantedCourseIds = courses.filter(c => (c.providers as any)?.subject_id === selectedSubjectIds[0]).map(c => c.id)
  } else if (codeRow.scope === 'three_subjects') {
    const required = Number(codeRow.max_subject_select || 3)
    if (uniq(selectedSubjectIds).length !== required) {
      return Response.json({ ok: false, error: `Vui lòng chọn đúng ${required} môn học` }, { status: 400 })
    }
    grantedCourseIds = courses.filter(c => selectedSubjectIds.includes((c.providers as any)?.subject_id)).map(c => c.id)
  } else {
    return Response.json({ ok: false, error: 'Loại mã không hỗ trợ' }, { status: 400 })
  }

  grantedCourseIds = uniq(grantedCourseIds)
  if (grantedCourseIds.length === 0) return Response.json({ ok: false, error: 'Không tìm thấy khóa học phù hợp' }, { status: 400 })

  // 4. Atomic claim — only succeeds if code is still unused right now
  const now = new Date().toISOString()
  const { data: claimed, error: claimErr } = await db
    .from('activation_codes')
    .update({ used_by: accountId, used_at: now, updated_at: now })
    .eq('id', codeRow.id)
    .eq('is_active', true)
    .is('used_by', null)
    .select('*')
    .single()

  if (claimErr || !claimed) {
    return Response.json({ ok: false, error: 'Mã vừa được dùng bởi người khác. Vui lòng dùng mã khác.' }, { status: 409 })
  }

  // 5. Upsert enrollments (skip already-enrolled)
  const { data: existing } = await db.from('enrollments').select('course_id').eq('account_id', accountId)
  const existingSet = new Set((existing || []).map(r => r.course_id))
  const newCourseIds = grantedCourseIds.filter(id => !existingSet.has(id))

  if (newCourseIds.length > 0) {
    const { error: enrollErr } = await db.from('enrollments').insert(
      newCourseIds.map(courseId => ({ account_id: accountId, course_id: courseId }))
    )
    if (enrollErr) {
      // Code was claimed but enrollment failed — log and return error
      console.error('Enrollment failed after code claim:', enrollErr)
      return Response.json({ ok: false, error: `Mã đã được ghi nhận nhưng chưa kích hoạt khóa học: ${enrollErr.message}` }, { status: 500 })
    }
  }

  // 6. Record redemption
  await db.from('activation_redemptions').insert({
    activation_code_id: codeRow.id,
    account_id: accountId,
    selected_course_id: selectedCourseId || null,
    selected_subject_ids: selectedSubjectIds,
    granted_course_ids: grantedCourseIds,
  })

  return Response.json({
    ok: true,
    message: 'Kích hoạt thành công!',
    grantedCourseIds,
    newlyActivatedCount: newCourseIds.length,
  })
}
