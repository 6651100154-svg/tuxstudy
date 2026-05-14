import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase (anon key, RLS enforced)
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

// Server-side Supabase (service role, bypasses RLS — only in API routes!)
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ── DB row types ──────────────────────────────────────────────────────────
export interface DbAccount {
  id: string
  auth_id?: string
  email: string
  name: string
  role: 'admin' | 'student'
  avatar: string
  active: boolean
  created_at: string
  updated_at: string
}

// ── Account helpers ───────────────────────────────────────────────────────
export async function getAccount(email: string): Promise<DbAccount | null> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function createAccount(
  email: string,
  name: string,
  authId: string,
  role: 'admin' | 'student' = 'student'
): Promise<DbAccount | null> {
  const { data, error } = await supabase
    .from('accounts')
    .insert([{ email: email.toLowerCase(), name, auth_id: authId, role, avatar: '', active: true }])
    .select()
    .single()
  if (error) return null
  return data
}

// ── Enrollments ───────────────────────────────────────────────────────────
export async function getEnrollments(accountId: string): Promise<string[]> {
  const { data } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('account_id', accountId)
  return (data || []).map((r: { course_id: string }) => r.course_id)
}

export async function addEnrollment(accountId: string, courseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('enrollments')
    .upsert({ account_id: accountId, course_id: courseId }, { onConflict: 'account_id,course_id' })
  return !error
}

// ── Lesson Progress ───────────────────────────────────────────────────────
export async function markLessonCompleted(accountId: string, lessonId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      { account_id: accountId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'account_id,lesson_id' }
    )
  return !error
}

export async function getLessonProgress(accountId: string): Promise<string[]> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('account_id', accountId)
    .eq('completed', true)
  return (data || []).map((r: { lesson_id: string }) => r.lesson_id)
}

// ── Watch History ─────────────────────────────────────────────────────────
export async function logWatchTime(
  accountId: string,
  assetId: string,
  lessonId: string,
  durationSec: number
) {
  if (durationSec < 5) return // ignore trivial
  await supabase
    .from('watch_history')
    .insert({ account_id: accountId, asset_id: assetId, lesson_id: lessonId, duration_sec: durationSec })
}

export async function getTotalStudySeconds(accountId: string): Promise<number> {
  const { data } = await supabase
    .from('watch_history')
    .select('duration_sec')
    .eq('account_id', accountId)
  return (data || []).reduce((s: number, r: { duration_sec: number }) => s + r.duration_sec, 0)
}

// ── Active notifications ──────────────────────────────────────────────────
export async function getActiveNotifications() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('active', true)
    .lte('start_date', today)
    .gte('end_date', today)
  return data || []
}
