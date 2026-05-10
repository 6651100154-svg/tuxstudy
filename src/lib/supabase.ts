import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface DbAccount {
  id: string
  auth_id?: string
  email: string
  name: string
  role: "admin" | "student"
  avatar: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface DbEnrollment {
  id: string
  account_id: string
  course_id: string
  enrolled_at: string
}

export interface DbLessonProgress {
  id: string
  account_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
  created_at: string
}

// Account functions
export async function getAccount(email: string): Promise<DbAccount | null> {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("email", email.toLowerCase())
      .single()
    if (error) {
      console.error("getAccount error:", error)
      return null
    }
    return data
  } catch (e) {
    console.error("getAccount exception:", e)
    return null
  }
}

export async function createAccount(
  email: string,
  name: string,
  authId: string,
  role: "admin" | "student" = "student"
): Promise<DbAccount | null> {
  const { data, error } = await supabase
    .from("accounts")
    .insert([
      {
        email: email.toLowerCase(),
        name,
        auth_id: authId,
        role,
        avatar: "",
        active: true,
      },
    ])
    .select()
    .single()
  if (error) return null
  return data
}

export async function getEnrollments(accountId: string): Promise<string[]> {
  const { data } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("account_id", accountId)
  return (data || []).map((e) => e.course_id)
}

export async function addEnrollment(
  accountId: string,
  courseId: string
): Promise<boolean> {
  const { error } = await supabase.from("enrollments").insert([
    {
      account_id: accountId,
      course_id: courseId,
    },
  ])
  return !error
}

export async function isLessonCompleted(
  accountId: string,
  lessonId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("lesson_progress")
    .select("completed")
    .eq("account_id", accountId)
    .eq("lesson_id", lessonId)
    .single()
  return data?.completed || false
}

export async function markLessonCompleted(
  accountId: string,
  lessonId: string
): Promise<boolean> {
  const { error: checkError, data: existing } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("account_id", accountId)
    .eq("lesson_id", lessonId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from("lesson_progress")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", existing.id)
    return !error
  } else {
    const { error } = await supabase
      .from("lesson_progress")
      .insert([
        {
          account_id: accountId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
      ])
    return !error
  }
}
