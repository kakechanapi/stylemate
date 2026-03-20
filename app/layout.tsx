import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '予測市場 | 賭けじゃなくて、考える習慣',
  description: '日本初のカジュアル予測市場アプリ。Yes/No の 2 択で世の中を予測しよう。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <header style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow)',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
            🎯 予測市場
          </a>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ホーム</a>
            <a href="/rankings" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ランキング</a>
            <button style={{
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              ログイン
            </button>
          </nav>
        </header>
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
