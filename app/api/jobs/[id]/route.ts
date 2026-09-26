import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { JOB_STATUSES, VERDICTS } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const job = await db.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.status === 'string' && JOB_STATUSES.includes(body.status as (typeof JOB_STATUSES)[number])) {
    data.status = body.status
  }
  if (typeof body.verdict === 'string' && VERDICTS.includes(body.verdict as (typeof VERDICTS)[number])) {
    data.verdict = body.verdict
  }
  if (typeof body.notes === 'string') data.notes = body.notes

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const job = await db.job.update({ where: { id }, data })
  return NextResponse.json({ job })
}