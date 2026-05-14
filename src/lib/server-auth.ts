import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

export interface ApiAuthAccount {
  id: string
  auth_id: string
  email: string
  name: string
  role: "admin" | "student"
  active: boolean
}

export interface ApiAuthResult {
  ok: boolean
  status: number
  msg: string
  user?: { id: string; email?: string }
  account?: ApiAuthAccount
}

export const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requireApiAuth(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "").trim()
  if (!token) return { ok: false, status: 401, msg: "Unauthorized" }

  const {
    data: { user },
    error: userErr,
  } = await supabaseServiceRole.auth.getUser(token)
  if (userErr || !user) {
    return { ok: false, status: 401, msg: "Invalid session" }
  }

  const { data: account, error: accountErr } = await supabaseServiceRole
    .from("accounts")
    .select("id, auth_id, email, name, role, active")
    .eq("auth_id", user.id)
    .single()

  if (accountErr || !account) {
    return { ok: false, status: 403, msg: "Account profile not found" }
  }

  if (!account.active) {
    return { ok: false, status: 403, msg: "Account is disabled" }
  }

  return { ok: true, status: 200, msg: "ok", user: { id: user.id, email: user.email }, account }
}

export async function requireAdminApiAuth(request: NextRequest): Promise<ApiAuthResult> {
  const auth = await requireApiAuth(request)
  if (!auth.ok) return auth
  if (auth.account?.role !== "admin") {
    return { ok: false, status: 403, msg: "Forbidden" }
  }
  return auth
}

