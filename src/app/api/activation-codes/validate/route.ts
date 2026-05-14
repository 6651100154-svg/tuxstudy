import { NextRequest } from "next/server"
import { normalizeActivationCode } from "@/lib/activation-codes"
import { requireApiAuth, supabaseServiceRole } from "@/lib/server-auth"

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const code = normalizeActivationCode(String(body.code || ""))
  if (!code) return Response.json({ error: "Code is required" }, { status: 400 })

  const { data: row, error } = await supabaseServiceRole
    .from("activation_codes")
    .select("*")
    .eq("code", code)
    .single()

  if (error || !row) {
    return Response.json({ ok: false, error: "Code does not exist" }, { status: 404 })
  }

  if (!row.is_active) {
    return Response.json({ ok: false, error: "Code is disabled" }, { status: 400 })
  }
  if (row.used_by) {
    return Response.json({ ok: false, error: "Code has already been used" }, { status: 400 })
  }
  if (isExpired(row.expires_at)) {
    return Response.json({ ok: false, error: "Code is expired" }, { status: 400 })
  }

  return Response.json({
    ok: true,
    code: {
      id: row.id,
      code: row.code,
      label: row.label,
      templateKey: row.template_key,
      scope: row.scope,
      variant: row.variant,
      maxCourseSelect: row.max_course_select,
      maxSubjectSelect: row.max_subject_select,
      grantsAllCourses: row.grants_all_courses,
      expiresAt: row.expires_at,
    },
  })
}

