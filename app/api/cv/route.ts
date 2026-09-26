import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { generateTailoredCv } from '../../../lib/gemini/cv'
import { renderCvPdf } from '../../../lib/pdf/render'
import { saveCvPdf } from '../../../lib/blob'
import { profileToData } from '../../../lib/mappers'
import { getOrCreateProfile } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  const job = await db.job.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ url: job.cvPdfUrl, generated: Boolean(job.cvPdfUrl), job })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const jobId = typeof body?.jobId === 'string' ? body.jobId : ''
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const profile = await getOrCreateProfile()
  const job = await db.job.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const cv = await generateTailoredCv(profileToData(profile), job)
  const buffer = await renderCvPdf(cv)
  const filename = `cv-${job.company.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${job.id.slice(0, 8)}.pdf`
  const { url } = await saveCvPdf(buffer, filename)

  await db.job.update({ where: { id: job.id }, data: { cvPdfUrl: url } })

  return NextResponse.json({ url, cv })
}