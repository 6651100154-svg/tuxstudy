import { NextRequest } from "next/server"
import { generateCode, getTemplateByKey } from "@/lib/activation-codes"
import { requireAdminApiAuth, supabaseServiceRole } from "@/lib/server-auth"

type CreatePayload = {
  templateKey?: string
  quantity?: number
  expiresAt?: string | null
}

async function createUniqueCodes(prefix: string, quantity: number): Promise<string[]> {
  const built = new Set<string>()
  let guard = 0
  while (built.size < quantity && guard < quantity * 200) {
    built.add(generateCode(prefix))
    guard += 1
  }
  if (built.size < quantity) {
    throw new Error("Code generation exhausted")
  }

  const existing = new Set<string>()
  const firstPass = [...built]
  const { data: collisions } = await supabaseServiceRole
    .from("activation_codes")
    .select("code")
    .in("code", firstPass)
  for (const row of collisions || []) existing.add(row.code)

  const finalCodes: string[] = firstPass.filter((code) => !existing.has(code))
  while (finalCodes.length < quantity) {
    const next = generateCode(prefix)
    if (existing.has(next) || finalCodes.includes(next)) continue
    finalCodes.push(next)
  }

  return finalCodes.slice(0, quantity)
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  const { data: codes, error } = await supabaseServiceRole
    .from("activation_codes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  const accountIds = new Set<string>()
  for (const code of codes || []) {
    if (code.created_by) accountIds.add(code.created_by)
    if (code.used_by) accountIds.add(code.used_by)
  }

  const accountMap = new Map<string, { email: string; name: string }>()
  if (accountIds.size > 0) {
    const { data: accounts } = await supabaseServiceRole
      .from("accounts")
      .select("id, email, name")
      .in("id", [...accountIds])
    for (const account of accounts || []) {
      accountMap.set(account.id, { email: account.email, name: account.name })
    }
  }

  const mapped = (codes || []).map((row) => ({
    ...row,
    created_by_name: row.created_by ? accountMap.get(row.created_by)?.name || "" : "",
    created_by_email: row.created_by ? accountMap.get(row.created_by)?.email || "" : "",
    used_by_name: row.used_by ? accountMap.get(row.used_by)?.name || "" : "",
    used_by_email: row.used_by ? accountMap.get(row.used_by)?.email || "" : "",
  }))

  return Response.json({ codes: mapped, count: mapped.length })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  const body = (await request.json()) as CreatePayload
  const template = getTemplateByKey(body.templateKey || "")
  if (!template) {
    return Response.json({ error: "Template key is invalid" }, { status: 400 })
  }

  const quantity = Number(body.quantity || template.quantity)
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
    return Response.json({ error: "Quantity must be between 1 and 500" }, { status: 400 })
  }

  const codes = await createUniqueCodes(template.prefix, quantity)
  const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null

  const rows = codes.map((code) => ({
    code,
    template_key: template.key,
    label: template.label,
    scope: template.scope,
    variant: template.variant,
    max_course_select: template.maxCourseSelect,
    max_subject_select: template.maxSubjectSelect,
    grants_all_courses: template.grantsAllCourses,
    is_active: true,
    created_by: auth.account?.id || null,
    expires_at: expiresAt,
  }))

  const { data, error } = await supabaseServiceRole
    .from("activation_codes")
    .insert(rows)
    .select("*")

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ created: data || [], count: (data || []).length })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const id = String(body.id || "")
  const isActive = Boolean(body.isActive)
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 })

  const { data, error } = await supabaseServiceRole
    .from("activation_codes")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ code: data })
}

