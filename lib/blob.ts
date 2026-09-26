import 'server-only'
import { writeFile, rm } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export async function saveCvPdf(
  buffer: Buffer,
  filename: string,
): Promise<{ url: string; pathname: string }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(filename, buffer, { contentType: 'application/pdf', access: 'public' })
    return { url: blob.url, pathname: blob.pathname }
  }

  const dir = path.join(process.cwd(), 'public', 'cvs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  await writeFile(filePath, buffer)
  return { url: `/cvs/${filename}`, pathname: `/cvs/${filename}` }
}

/**
 * Remove generated CV PDFs for both storage modes: remote Vercel Blob URLs
 * when a token is configured, and public/cvs/* files otherwise.
 */
export async function deleteCvPdfs(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))]
  if (unique.length === 0) return

  const remote = unique.filter((u) => /^https?:\/\//.test(u))
  const local = unique.filter((u) => !/^https?:\/\//.test(u))

  if (remote.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import('@vercel/blob')
    await del(remote)
  }

  if (local.length > 0) {
    const dir = path.join(process.cwd(), 'public', 'cvs')
    await Promise.all(
      local.map(async (u) => {
        const name = u.startsWith('/cvs/') ? u.slice('/cvs/'.length) : path.basename(u)
        if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return
        const file = path.join(dir, name)
        if (!file.startsWith(dir)) return
        if (existsSync(file)) await rm(file, { force: true })
      }),
    )
  }
}