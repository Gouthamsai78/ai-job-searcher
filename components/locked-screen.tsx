'use client'

import Link from 'next/link'

/**
 * Shown instead of the dashboard when no CV has been parsed — i.e. for a
 * brand-new visitor, and again for anyone who signed out and left a clean slate.
 */
export function LockedScreen() {
  return (
    <div className="flex min-h-[58vh] items-center justify-center py-8">
      <div className="w-full max-w-md rounded-xl border border-edge bg-panel px-8 py-10 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-edge bg-ink">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 text-accent"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </span>

        <h1 className="mt-4 text-xl font-semibold tracking-tight">No CV on file</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Career Scout is on a clean slate. Add a candidate&apos;s CV to unlock fit scoring, discovery
          scans and tailored resumes.
        </p>

        <Link
          href="/onboarding"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-dim"
        >
          Add a candidate →
        </Link>
      </div>
    </div>
  )
}
