import 'server-only'
import { Firecrawl } from 'firecrawl'

let _client: Firecrawl | null = null

function getClient(): Firecrawl {
  if (_client) return _client
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set. Copy .env.example to .env and fill it in.')
  _client = new Firecrawl({ apiKey })
  return _client
}

export function getFirecrawl(): Firecrawl {
  return getClient()
}

export const FIRECRAWL_MAX_CREDITS = Number(process.env.FIRECRAWL_MAX_CREDITS_PER_SCAN ?? 500)