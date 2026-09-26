import type { Metadata } from 'next'
import { Nav } from '@/components/nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Career Scout',
  description: 'AI job discovery and ATS-optimized CV builder for the Indian job market',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16">{children}</main>
      </body>
    </html>
  )
}