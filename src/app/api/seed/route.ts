import { createClient } from "@supabase/supabase-js"

// Use service role for seeding
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Check if admin account already exists
    const { data: existing } = await supabaseServiceRole
      .from("accounts")
      .select("id")
      .eq("email", "admin@edu.vn")
      .single()

    if (existing) {
      return Response.json({ message: "Accounts already seeded" })
    }

    // Insert default accounts
    const { data, error } = await supabaseServiceRole.from("accounts").insert([
      {
        email: "admin@edu.vn",
        password: "admin123",
        name: "Admin",
        role: "admin",
        avatar: "",
        active: true,
      },
      {
        email: "hocvien@edu.vn",
        password: "hocvien123",
        name: "Nguyễn Văn An",
        role: "student",
        avatar: "",
        active: true,
      },
    ])

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // Get the student account and add enrollments
    const { data: student } = await supabaseServiceRole
      .from("accounts")
      .select("id")
      .eq("email", "hocvien@edu.vn")
      .single()

    if (student) {
      await supabaseServiceRole.from("enrollments").insert([
        { account_id: student.id, course_id: "toan-gva" },
        { account_id: student.id, course_id: "sinh-gve" },
      ])
    }

    return Response.json({ message: "Accounts seeded successfully", data })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
