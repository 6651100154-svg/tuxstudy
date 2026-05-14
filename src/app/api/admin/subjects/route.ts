import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const body = await req.json()
  const { error } = await db.from('subjects').insert(body)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const { id, ...body } = await req.json()
  const { error } = await db.from('subjects').update(body).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const { id } = await req.json()
  const { error } = await db.from('subjects').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
