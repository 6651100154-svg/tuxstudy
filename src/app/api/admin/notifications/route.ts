import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const { data, error } = await db.from('notifications').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const body = await req.json()
  if (!body.content?.trim()) return NextResponse.json({ ok: false, error: 'Nội dung không được trống' }, { status: 400 })
  const { data, error } = await db.from('notifications').insert({
    content: body.content.trim(),
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    active: true,
  }).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'Thiếu id' }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (body.content !== undefined) update.content = body.content
  if (body.startDate !== undefined) update.start_date = body.startDate || null
  if (body.endDate !== undefined) update.end_date = body.endDate || null
  if (body.active !== undefined) update.active = body.active
  const { data, error } = await db.from('notifications').update(update).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false, error: 'Thiếu id' }, { status: 400 })
  const { error } = await db.from('notifications').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
