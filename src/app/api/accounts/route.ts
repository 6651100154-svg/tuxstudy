import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin(request: NextRequest): Promise<{ ok: boolean; status?: number; msg?: string }> {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "").trim()
  if (!token) return { ok: false, status: 401, msg: "Unauthorized" }

  const { data: { user }, error } = await supabaseServiceRole.auth.getUser(token)
  if (error || !user) return { ok: false, status: 401, msg: "Invalid session" }

  const { data: account } = await supabaseServiceRole
    .from("accounts")
    .select("role")
    .eq("auth_id", user.id)
    .single()

  if (account?.role !== "admin") return { ok: false, status: 403, msg: "Forbidden" }
  return { ok: true }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return Response.json({ error: auth.msg }, { status: auth.status })

  try {
    const { data, error } = await supabaseServiceRole
      .from("accounts")
      .select("id, email, name, role, avatar, active, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })

    const accounts = await Promise.all(
      (data || []).map(async (acc) => {
        const { data: enrollments } = await supabaseServiceRole
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
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
