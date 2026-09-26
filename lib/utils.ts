export function normalizeUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return 'unknown'
  const d = typeof date === 'string' ? new Date(date) : date
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerScout/1.0)', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return (await res.json()) as T
}
