import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import { CvDocument } from './cv-template'
import type { CvData } from '../types'

export async function renderCvPdf(cv: CvData): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} />)
}