import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Seed endpoint: protected by SEED_SECRET env var
// Call with header: X-Seed-Secret: <value of SEED_SECRET>
export async function GET(request: NextRequest) {
  const seedSecret = process.env.SEED_SECRET
  const providedSecret = request.headers.get("X-Seed-Secret")

  if (!seedSecret) {
    return Response.json({ error: "SEED_SECRET not configured on server" }, { status: 503 })
  }
  if (!providedSecret || providedSecret !== seedSecret) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { data: existing } = await supabaseServiceRole
      .from("accounts")
      .select("id")
      .eq("email", "admin@edu.vn")
      .single()

    if (existing) {
      return Response.json({ message: "Accounts already seeded" })
    }

    // Seed admin via Supabase Auth (password must be set via Dashboard or env)
    const adminPassword = process.env.SEED_ADMIN_PASSWORD
    const studentPassword = process.env.SEED_STUDENT_PASSWORD
    if (!adminPassword || !studentPassword) {
      return Response.json({ error: "SEED_ADMIN_PASSWORD or SEED_STUDENT_PASSWORD not set" }, { status: 503 })
    }

    const { data: adminAuth, error: adminErr } = await supabaseServiceRole.auth.admin.createUser({
      email: "admin@edu.vn",
      password: adminPassword,
      email_confirm: true,
    })
    if (adminErr) return Response.json({ error: adminErr.message }, { status: 400 })

    const { data: studentAuth, error: studentErr } = await supabaseServiceRole.auth.admin.createUser({
      email: "hocvien@edu.vn",
      password: studentPassword,
      email_confirm: true,
    })
    if (studentErr) return Response.json({ error: studentErr.message }, { status: 400 })

    await supabaseServiceRole.from("accounts").insert([
      { email: "admin@edu.vn", name: "Admin", role: "admin", avatar: "", active: true, auth_id: adminAuth.user.id },
      { email: "hocvien@edu.vn", name: "Nguyễn Văn An", role: "student", avatar: "", active: true, auth_id: studentAuth.user.id },
    ])

    const { data: student } = await supabaseServiceRole
      .from("accounts").select("id").eq("email", "hocvien@edu.vn").single()

    if (student) {
      await supabaseServiceRole.from("enrollments").insert([
        { account_id: student.id, course_id: "toan-gva" },
        { account_id: student.id, course_id: "sinh-gve" },
      ])
    }

    return Response.json({ message: "Seeded successfully" })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
