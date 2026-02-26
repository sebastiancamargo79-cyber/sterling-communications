import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'Sterling Communications',
  description: 'Office and brand kit management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={libreBaskerville.variable}>
      <body>{children}</body>
    </html>
  )
}
