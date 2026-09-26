import 'server-only'
import { PDFParse } from 'pdf-parse'

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = new PDFParse({ data: buffer })
  try {
    const result = await pdf.getText()
    return (result?.text ?? '').trim()
  } finally {
    await pdf.destroy().catch(() => undefined)
  }
}

export async function fileToText(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdfText(bytes)
  return bytes.toString('utf-8')
}