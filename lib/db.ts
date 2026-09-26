import 'server-only'
import type { PrismaClient as PrismaClientType } from '../generated/client'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType }

function createClient(): PrismaClientType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('../generated/client') as typeof import('../generated/client')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaNeon } = require('@prisma/adapter-neon') as typeof import('@prisma/adapter-neon')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

let _db: PrismaClientType | null = null

function getDb(): PrismaClientType {
  if (_db) return _db
  _db = globalForPrisma.prisma ?? createClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
  return _db
}

export const db: PrismaClientType = new Proxy({} as PrismaClientType, {
  get(_, prop) {
    const client = getDb()
    const val = Reflect.get(client, prop)
    if (typeof val === 'function') return val.bind(client)
    return val
  },
}) as PrismaClientType