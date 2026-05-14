import { NextRequest } from "next/server"
import { normalizeActivationCode } from "@/lib/activation-codes"
import { requireApiAuth, supabaseServiceRole } from "@/lib/server-auth"

type RedeemPayload = {
  code?: string
  selectedCourseId?: string
  selectedSubjectIds?: string[]
}

function uniq(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

function validateSubjectCount(subjectIds: string[], required: number): boolean {
  if (required <= 0) return true
  return uniq(subjectIds).length === required
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })
  if (auth.account?.role !== "student") {
    return Response.json({ error: "Only student accounts can redeem codes" }, { status: 403 })
  }

  const body = (await request.json()) as RedeemPayload
  const code = normalizeActivationCode(String(body.code || ""))
  if (!code) return Response.json({ error: "Code is required" }, { status: 400 })

  const { data: codeRow, error: codeErr } = await supabaseServiceRole
    .from("activation_codes")
    .select("*")
    .eq("code", code)
    .single()
  if (codeErr || !codeRow) {
    return Response.json({ error: "Code does not exist" }, { status: 404 })
  }

  if (!codeRow.is_active) {
    return Response.json({ error: "Code is disabled" }, { status: 400 })
  }
  if (codeRow.used_by) {
    return Response.json({ error: "Code has already been used" }, { status: 400 })
  }
  if (isExpired(codeRow.expires_at)) {
    return Response.json({ error: "Code is expired" }, { status: 400 })
  }

  const { data: courses, error: coursesErr } = await supabaseServiceRole
    .from("courses")
    .select("id, subject_id, teacher_name")
  if (coursesErr || !courses) {
    return Response.json({ error: "Cannot load course catalog" }, { status: 500 })
  }

  const selectedCourseId = String(body.selectedCourseId || "").trim()
  const selectedSubjectIds = uniq(Array.isArray(body.selectedSubjectIds) ? body.selectedSubjectIds : [])
  let grantedCourseIds: string[] = []

  if (codeRow.grants_all_courses) {
    grantedCourseIds = courses.map((c) => c.id)
  } else if (codeRow.scope === "single_course") {
    if (!selectedCourseId) {
      return Response.json({ error: "Please select 1 course to activate" }, { status: 400 })
    }
    const picked = courses.find((course) => course.id === selectedCourseId)
    if (!picked) return Response.json({ error: "Selected course is invalid" }, { status: 400 })
    grantedCourseIds = [picked.id]
  } else if (codeRow.scope === "single_subject") {
    if (!validateSubjectCount(selectedSubjectIds, 1)) {
      return Response.json({ error: "Please select exactly 1 subject" }, { status: 400 })
    }
    grantedCourseIds = courses
      .filter((course) => course.subject_id === selectedSubjectIds[0])
      .map((course) => course.id)
  } else if (codeRow.scope === "three_subjects") {
    const requiredCount = Number(codeRow.max_subject_select || 3)
    if (!validateSubjectCount(selectedSubjectIds, requiredCount)) {
      return Response.json({ error: `Please select exactly ${requiredCount} subjects` }, { status: 400 })
    }
    grantedCourseIds = courses
      .filter((course) => selectedSubjectIds.includes(course.subject_id))
      .map((course) => course.id)
  } else {
    return Response.json({ error: "Unsupported code scope" }, { status: 400 })
  }

  grantedCourseIds = uniq(grantedCourseIds)
  if (grantedCourseIds.length === 0) {
    return Response.json({ error: "No courses found for this activation selection" }, { status: 400 })
  }

  // Atomic claim: only succeeds if code is still unused at update time.
  const nowIso = new Date().toISOString()
  const { data: claimedCode, error: claimErr } = await supabaseServiceRole
    .from("activation_codes")
    .update({
      used_by: auth.account?.id || null,
      used_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", codeRow.id)
    .eq("is_active", true)
    .is("used_by", null)
    .select("*")
    .single()

  if (claimErr || !claimedCode) {
    return Response.json(
      { error: "Code was claimed by another account. Please use another code." },
      { status: 409 }
    )
  }

  const { data: existingEnrollments } = await supabaseServiceRole
    .from("enrollments")
    .select("course_id")
    .eq("account_id", auth.account?.id || "")

  const existingSet = new Set((existingEnrollments || []).map((row) => row.course_id))
  const newCourseIds = grantedCourseIds.filter((courseId) => !existingSet.has(courseId))

  if (newCourseIds.length > 0) {
    const enrollmentRows = newCourseIds.map((courseId) => ({
      account_id: auth.account?.id || "",
      course_id: courseId,
    }))
    const { error: enrollmentErr } = await supabaseServiceRole.from("enrollments").insert(enrollmentRows)
    if (enrollmentErr) {
      return Response.json({ error: `Code claimed but enrollment failed: ${enrollmentErr.message}` }, { status: 500 })
    }
  }

  await supabaseServiceRole.from("activation_redemptions").insert({
    activation_code_id: codeRow.id,
    account_id: auth.account?.id || "",
    selected_course_id: selectedCourseId || null,
    selected_subject_ids: selectedSubjectIds,
    granted_course_ids: grantedCourseIds,
  })

  const { data: finalEnrollments } = await supabaseServiceRole
    .from("enrollments")
    .select("course_id")
    .eq("account_id", auth.account?.id || "")

  const courseNameMap = new Map(courses.map((course) => [course.id, course.teacher_name]))
  const grantedCourseNames = grantedCourseIds.map((id) => courseNameMap.get(id) || id)

  return Response.json({
    ok: true,
    message: "Code redeemed successfully",
    code: claimedCode.code,
    grantedCourseIds,
    grantedCourseNames,
    enrollments: (finalEnrollments || []).map((row) => row.course_id),
    newlyActivatedCount: newCourseIds.length,
  })
}

