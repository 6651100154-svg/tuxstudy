import { createClient } from "@supabase/supabase-js"

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabaseServiceRole
      .from("accounts")
      .select("id, email, name, role, avatar, active, created_at, updated_at")

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // Fetch enrollments for each account
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
