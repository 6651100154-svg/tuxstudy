import { NextRequest } from 'next/server'
import { requireApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (!auth.ok) return Response.json({ ok: false, error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const code = String(body.code || '').trim().toUpperCase()
  if (!code) return Response.json({ ok: false, error: 'Vui lòng nhập mã kích hoạt' }, { status: 400 })

  const { data: row, error } = await db
    .from('activation_codes')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !row) return Response.json({ ok: false, error: 'Mã không tồn tại trong hệ thống' }, { status: 404 })
  if (!row.is_active) return Response.json({ ok: false, error: 'Mã đã bị vô hiệu hóa' }, { status: 400 })
  if (row.used_by) return Response.json({ ok: false, error: 'Mã đã được sử dụng bởi tài khoản khác' }, { status: 400 })
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return Response.json({ ok: false, error: 'Mã đã hết hạn sử dụng' }, { status: 400 })
  }

  return Response.json({
    ok: true,
    data: {
      id: row.id,
      code: row.code,
      label: row.label,
      scope: row.scope,
      variant: row.variant,
      maxCourseSelect: row.max_course_select,
      maxSubjectSelect: row.max_subject_select,
      grantsAllCourses: row.grants_all_courses,
      expiresAt: row.expires_at,
    },
  })
}
