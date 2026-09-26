import 'server-only'
import { NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { deleteCvPdfs } from '../../../lib/blob'
import { clearProfileIdMemo, getOrCreateProfileId } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Signs the current candidate out and leaves a clean slate: profile, search
 * config, scans, jobs and generated CV PDFs all go, and the next request
 * bootstraps a fresh profile with no CV parsed.
 */
export async function POST() {
  const profileId = await getOrCreateProfileId()

  // Read the CV URLs before the cascade below removes the rows that hold them.
  const jobs = await db.job.findMany({ where: { profileId }, select: { cvPdfUrl: true } })
  const pdfUrls = jobs.map((j) => j.cvPdfUrl).filter((u): u is string => Boolean(u))

  // SearchConfig, Scan and Job all cascade off Profile. ScanHistory has no FK.
  await db.profile.delete({ where: { id: profileId } })
  await db.scanHistory.deleteMany({})
  clearProfileIdMemo()

  let clearedCvs = 0
  try {
    await deleteCvPdfs(pdfUrls)
    clearedCvs = pdfUrls.length
  } catch (err) {
    // Storage cleanup is best-effort: the row data is already gone, so the
    // sign-out succeeded either way. Don't fail the request over an orphaned file.
    console.error('signout: failed to delete CV PDFs', err)
  }

  const nextProfileId = await getOrCreateProfileId()
  return NextResponse.json({ ok: true, profileId: nextProfileId, clearedCvs })
}
