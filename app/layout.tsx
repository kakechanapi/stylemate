import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'クローゼットAI | AIコーデ提案アプリ',
  description: 'バーコードスキャンで服を登録して、AIが天気・TPOに合わせたコーデを提案してくれるファッションアプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main style={{ minHeight: '100dvh', paddingBottom: '80px', maxWidth: '480px', margin: '0 auto' }}>
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
