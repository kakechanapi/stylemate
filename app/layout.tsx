import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SessionExpiredHandler from '@/components/SessionExpiredHandler'

export const metadata: Metadata = {
  title: 'StyleMate（仮）— AIコーデ提案 × 本人試着',
  description:
    '持ってる服を最大限活用し、毎日の最適コーデを AI が提案。足りなければ本人で試着して買える。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main style={{ minHeight: '100dvh', paddingBottom: '80px', maxWidth: '480px', margin: '0 auto' }}>
          {children}
        </main>
        <BottomNav />
        <SessionExpiredHandler />
      </body>
    </html>
  )
}
