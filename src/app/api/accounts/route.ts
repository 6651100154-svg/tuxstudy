import { NextRequest } from "next/server"
import { requireAdminApiAuth, supabaseServiceRole as db } from "@/lib/server-auth"

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  try {
    const { data, error } = await db
      .from("accounts")
      .select("id, email, name, role, avatar, active, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })

    const accounts = await Promise.all(
      (data || []).map(async (acc) => {
        const { data: enrollments } = await db
          .from("enrollments")
          .select("course_id")
          .eq("account_id", acc.id)
        return {
          ...acc,
          enrollments: (enrollments || []).map((e) => e.course_id),
          createdAt: acc.created_at,
        }
      })
    )

    return Response.json({ accounts, count: accounts.length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApiAuth(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  const body = await request.json()
  const { id, ...fields } = body
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.name !== undefined) update.name = fields.name
  if (fields.active !== undefined) update.active = fields.active
  if (fields.role !== undefined) update.role = fields.role
  if (fields.avatar !== undefined) update.avatar = fields.avatar

  const { data, error } = await db
    .from("accounts")
    .update(update)
    .eq("id", id)
    .select("id, email, name, role, avatar, active")
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true, account: data })
}
