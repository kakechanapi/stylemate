import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SessionExpiredHandler from '@/components/SessionExpiredHandler'

export const metadata: Metadata = {
  // OGP 画像等の相対 URL を絶対化するベース
  metadataBase: new URL('https://stylemate-alpha.vercel.app'),
  title: 'StyleMate（仮）— AIコーデ提案 × オンライン試着',
  description:
    '持ってる服を最大限活用し、毎日の最適コーデを AI が提案。足りなければオンラインで試着して買える。',
  // iOS「ホーム画面に追加」でスタンドアロン表示
  appleWebApp: {
    capable: true,
    title: 'StyleMate',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#C4779B',
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
        <Analytics />
      </body>
    </html>
  )
}
