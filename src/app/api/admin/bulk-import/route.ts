import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApiAuth, supabaseServiceRole as db } from '@/lib/server-auth'
import { parsePathSegments } from '@/lib/data'
import { uid } from '@/lib/types'

interface TsvRow {
  index: string
  subjectRaw: string
  providerRaw: string
  filePath: string
  fileType: string
  driveId: string
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/^\d+\.\s*/, '')       // remove leading "08. "
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

function assetType(fileType: string): string {
  const t = fileType.toLowerCase()
  if (t.includes('mp4') || t.includes('video')) return 'video'
  if (t.includes('pdf')) return 'pdf'
  if (t.includes('ebook')) return 'ebook'
  if (t.includes('sheet')) return 'sheet'
  return 'other'
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.msg }, { status: auth.status })

  const { rows }: { rows: TsvRow[] } = await req.json()
  if (!rows?.length) return NextResponse.json({ ok: false, error: 'Không có dữ liệu' }, { status: 400 })

  let created = 0
  let skipped = 0

  // Cache maps to avoid redundant DB lookups
  const subjectMap: Record<string, string> = {}   // raw name → id
  const providerMap: Record<string, string> = {}  // "subjectId|raw" → id
  const courseMap: Record<string, string> = {}    // "providerId|name" → id
  const moduleMap: Record<string, string> = {}    // "courseId|title" → id
  const lessonMap: Record<string, string> = {}    // "moduleId|title" → id

  for (const row of rows) {
    if (!row.driveId || !row.subjectRaw) { skipped++; continue }

    // ── Subject ───────────────────────────────────────────────────────────
    const subjectName = row.subjectRaw.replace(/^\d+\.\s*/, '').trim()
    if (!subjectMap[subjectName]) {
      const { data: existing } = await db.from('subjects').select('id').ilike('name', subjectName).maybeSingle()
      if (existing) {
        subjectMap[subjectName] = existing.id
      } else {
        const id = slugify(subjectName) || uid()
        await db.from('subjects').upsert({ id, name: subjectName, icon: '📖', color: '#6366f1', order: 0 }, { onConflict: 'id' })
        subjectMap[subjectName] = id
      }
    }
    const subjectId = subjectMap[subjectName]

    // ── Provider ──────────────────────────────────────────────────────────
    const providerName = row.providerRaw.replace(/^\d+\.\s*/, '').trim()
    const providerKey = `${subjectId}|${providerName}`
    if (!providerMap[providerKey]) {
      const { data: existing } = await db.from('providers').select('id').eq('subject_id', subjectId).ilike('name', providerName).maybeSingle()
      if (existing) {
        providerMap[providerKey] = existing.id
      } else {
        const id = `${subjectId}-${slugify(providerName).slice(0, 30)}-${Date.now().toString(36)}`
        await db.from('providers').upsert({ id, subject_id: subjectId, name: providerName, order: 0 }, { onConflict: 'id' })
        providerMap[providerKey] = id
      }
    }
    const providerId = providerMap[providerKey]

    // ── Parse path for course/module/lesson ───────────────────────────────
    const segs = parsePathSegments(row.filePath)
    const courseName  = segs.course  || providerName
    const moduleName  = segs.module  || 'Chuyên đề 1'
    const lessonName  = segs.lesson  || segs.filename || row.driveId

    // ── Course ────────────────────────────────────────────────────────────
    const courseKey = `${providerId}|${courseName}`
    if (!courseMap[courseKey]) {
      const { data: existing } = await db.from('courses').select('id').eq('provider_id', providerId).ilike('name', courseName).maybeSingle()
      if (existing) {
        courseMap[courseKey] = existing.id
      } else {
        const id = `${providerId}-${slugify(courseName).slice(0, 25)}-${Date.now().toString(36)}`
        await db.from('courses').upsert({ id, provider_id: providerId, name: courseName, is_published: true, order: 0 }, { onConflict: 'id' })
        courseMap[courseKey] = id
      }
    }
    const courseId = courseMap[courseKey]

    // ── Module ────────────────────────────────────────────────────────────
    const moduleKey = `${courseId}|${moduleName}`
    if (!moduleMap[moduleKey]) {
      const { data: existing } = await db.from('modules').select('id').eq('course_id', courseId).ilike('title', moduleName).maybeSingle()
      if (existing) {
        moduleMap[moduleKey] = existing.id
      } else {
        const { count } = await db.from('modules').select('*', { count: 'exact', head: true }).eq('course_id', courseId)
        const id = `${courseId}-m${(count || 0) + 1}-${Date.now().toString(36)}`
        await db.from('modules').upsert({ id, course_id: courseId, title: moduleName, order: (count || 0) + 1 }, { onConflict: 'id' })
        moduleMap[moduleKey] = id
      }
    }
    const moduleId = moduleMap[moduleKey]

    // ── Lesson ────────────────────────────────────────────────────────────
    const lessonKey = `${moduleId}|${lessonName}`
    if (!lessonMap[lessonKey]) {
      const { data: existing } = await db.from('lessons').select('id').eq('module_id', moduleId).ilike('title', lessonName).maybeSingle()
      if (existing) {
        lessonMap[lessonKey] = existing.id
      } else {
        const { count } = await db.from('lessons').select('*', { count: 'exact', head: true }).eq('module_id', moduleId)
        const id = `${moduleId}-l${(count || 0) + 1}-${Date.now().toString(36)}`
        await db.from('lessons').upsert({ id, module_id: moduleId, title: lessonName, order: (count || 0) + 1 }, { onConflict: 'id' })
        lessonMap[lessonKey] = id
      }
    }
    const lessonId = lessonMap[lessonKey]

    // ── Asset ─────────────────────────────────────────────────────────────
    const type = assetType(row.fileType)
    // Check if this driveId already exists for this lesson
    const { data: existingAsset } = await db.from('assets').select('id').eq('lesson_id', lessonId).eq('drive_id', row.driveId).maybeSingle()
    if (existingAsset) { skipped++; continue }

    const { count: assetCount } = await db.from('assets').select('*', { count: 'exact', head: true }).eq('lesson_id', lessonId)
    const assetId = `${lessonId}-a${(assetCount || 0) + 1}-${Date.now().toString(36)}`
    const assetTitle = segs.filename.replace(/\.[^.]+$/, '').slice(0, 100) || row.driveId

    await db.from('assets').insert({
      id: assetId, lesson_id: lessonId, type, title: assetTitle,
      drive_id: type === 'video' ? row.driveId : '',
      url: type !== 'video' ? row.driveId : '',
      order: (assetCount || 0) + 1,
    })
    created++
  }

  return NextResponse.json({ ok: true, data: { created, skipped, total: rows.length } })
}
