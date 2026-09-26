'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge, Spinner } from '@/components/ui'
import { readJson } from '@/lib/utils'

interface ProfileResponse {
  profile: {
    name: string
    currentRole: string | null
    experienceYears: number | null
    location: string | null
    skills: string[]
    targetRoles: string[]
    compTargetMinLPA: number | null
    compTargetMaxLPA: number | null
  }
  config: {
    roles: string[]
    queries: string[]
    negativeKeywords: string[]
    locations: string[]
  }
}

export default function OnboardingPage() {
  const [cvText, setCvText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProfileResponse | null>(null)

  const submit = async (text?: string) => {
    const body = text ?? cvText
    if (!body.trim()) {
      setError('Paste your CV or upload a file first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: body }),
      })
      const json = await readJson<ProfileResponse & { error?: string }>(res)
      if (!res.ok) throw new Error(json.error ?? 'Failed to parse CV')
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/profile', { method: 'POST', body: form })
      const json = await readJson<ProfileResponse & { error?: string }>(res)
      if (!res.ok) throw new Error(json.error ?? 'Failed to parse file')
      setResult(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile & search strategy</h1>
        <p className="mt-1 text-sm text-muted">
          Provide your CV once. The agent extracts your profile and derives your job search config.
        </p>
      </div>

      {!result ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Paste CV text</h2>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={14}
              placeholder="Paste the full text of your resume here…"
              className="mt-3 w-full rounded-lg border border-edge bg-ink p-3 font-mono text-xs text-foreground outline-none focus:border-accent"
            />
            <button
              onClick={() => void submit()}
              disabled={busy}
              className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-dim disabled:opacity-50"
            >
              {busy ? <Spinner label="Parsing with Gemini…" /> : 'Parse CV'}
            </button>
          </section>

          <section className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Or upload a file</h2>
            <p className="mt-1 text-xs text-muted">PDF, .docx, or .txt — parsed server-side.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-edge p-10 text-sm text-muted hover:border-accent hover:text-foreground">
              <span className="text-3xl">↑</span>
              <span className="mt-2">Drop your CV here or click to browse</span>
              <input
                type="file"
                accept=".pdf,.txt,.docx,.doc,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                }}
              />
            </label>
            {busy ? (
              <div className="mt-4 text-sm text-muted">
                <Spinner label="Parsing file…" />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {error ? <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {result ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-edge bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{result.profile.name}</h2>
                <p className="text-sm text-muted">
                  {[result.profile.currentRole, result.profile.location, result.profile.experienceYears ? `${result.profile.experienceYears} yrs` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                onClick={() => {
                  setResult(null)
                  setCvText('')
                }}
                className="rounded-md border border-edge px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Re-parse
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.profile.skills.slice(0, 20).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                  {result.profile.skills.length > 20 ? (
                    <span className="text-xs text-muted">+{result.profile.skills.length - 20} more</span>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Target roles</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.profile.targetRoles.map((r) => (
                    <Badge key={r} tone="emerald">
                      {r}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs uppercase tracking-wider text-muted">Compensation target</p>
                <p className="mt-1 text-sm">
                  {result.profile.compTargetMinLPA != null && result.profile.compTargetMaxLPA != null
                    ? `${result.profile.compTargetMinLPA} – ${result.profile.compTargetMaxLPA} LPA`
                    : 'Not stated'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Derived search config</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Search queries</p>
                <div className="mt-1.5 space-y-1">
                  {result.config.queries.map((q) => (
                    <p key={q} className="rounded-md bg-ink px-3 py-1.5 font-mono text-xs">
                      {q}
                    </p>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Negative keywords</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {result.config.negativeKeywords.map((k) => (
                      <Badge key={k} tone="red">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Locations</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {result.config.locations.map((l) => (
                      <Badge key={l} tone="blue">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <p className="text-sm text-muted">
            Profile saved. Head to{' '}
            <Link href="/jobs" className="text-accent hover:underline">
              Jobs
            </Link>{' '}
            to run your first discovery scan.
          </p>
        </div>
      ) : null}
    </div>
  )
}