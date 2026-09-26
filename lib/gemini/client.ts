import 'server-only'
import { GoogleGenAI } from '@google/genai'

let _ai: GoogleGenAI | null = null

function getAi(): GoogleGenAI {
  if (_ai) return _ai
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY is not set. Copy .env.example to .env and fill it in.')
  _ai = new GoogleGenAI({ apiKey })
  return _ai
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

export { getAi as ai }

export interface JsonCallOptions {
  system?: string
  prompt: string
  schema: Record<string, unknown>
  temperature?: number
  timeoutMs?: number
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

export async function generateJson<T>({
  system,
  prompt,
  schema,
  temperature = 0.2,
  timeoutMs = 60_000,
}: JsonCallOptions): Promise<T> {
  const call = getAi().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature,
    },
  })

  const response = await withTimeout(call, timeoutMs, 'Gemini JSON')

  const text = response.text
  if (!text) throw new Error('Gemini returned an empty response.')

  let raw = text
  try {
    return JSON.parse(text) as T
  } catch {
    raw = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return JSON.parse(raw) as T
}

export async function generateText(system: string, prompt: string, temperature = 0.7, timeoutMs = 60_000): Promise<string> {
  const call = getAi().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature,
    },
  })

  const response = await withTimeout(call, timeoutMs, 'Gemini text')
  const text = response.text
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}
