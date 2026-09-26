'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/agent', label: 'Agent' },
  { href: '/onboarding', label: 'Profile' },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    const confirmed = window.confirm(
      'Sign out and start a clean slate?\n\nThis permanently erases the candidate profile, all jobs, scans and generated CVs.',
    )
    if (!confirmed) return

    setBusy(true)
    try {
      const res = await fetch('/api/signout', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      window.alert(`Sign out failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-ink/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-accent text-[11px] font-bold text-black">
            CS
          </span>
          <span className="hidden sm:inline">Career Scout</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active ? 'bg-white/[0.07] text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          <span className="mx-1.5 h-5 w-px bg-edge" aria-hidden="true" />
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            title="Sign out and start a clean slate"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-red-300 disabled:opacity-50"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </div>
    </header>
  )
}
