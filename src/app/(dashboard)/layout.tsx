import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '../(app)/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '123DINO — Digitalisierung und Innovation',
  description: 'KI-gestützte Digitalisierung und Innovation',
}

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
