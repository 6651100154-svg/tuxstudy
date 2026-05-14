import { NextRequest } from "next/server"
import { supabaseServiceRole as db } from "@/lib/server-auth"

// Protected by SEED_SECRET env var — call with header: X-Seed-Secret: <value>
export async function GET(request: NextRequest) {
  const seedSecret = process.env.SEED_SECRET
  const provided = request.headers.get("X-Seed-Secret")

  if (!seedSecret) return Response.json({ error: "SEED_SECRET not configured" }, { status: 503 })
  if (!provided || provided !== seedSecret) return Response.json({ error: "Forbidden" }, { status: 403 })

  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) return Response.json({ error: "SEED_ADMIN_PASSWORD not set" }, { status: 503 })

  try {
    const { data: existing } = await db.from("accounts").select("id").eq("email", "admin@tuxstudy.vn").single()
    if (existing) return Response.json({ message: "Already seeded" })

    const { data: adminAuth, error: adminErr } = await db.auth.admin.createUser({
      email: "admin@tuxstudy.vn",
      password: adminPassword,
      email_confirm: true,
    })
    if (adminErr) return Response.json({ error: adminErr.message }, { status: 400 })

    await db.from("accounts").insert({
      email: "admin@tuxstudy.vn",
      name: "Admin",
      role: "admin",
      avatar: "",
      active: true,
      auth_id: adminAuth.user.id,
    })

    return Response.json({ message: "Admin account created: admin@tuxstudy.vn" })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
