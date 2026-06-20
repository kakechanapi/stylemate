// 管理者専用：サンプルクローゼット投入 UI
// /api/admin/seed-closet を叩いて 50 着投入し、AI 提案のテストを楽にする

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { checkAdmin } from '@/lib/admin'
import SeedClosetClient from './SeedClosetClient'

export const metadata = {
  title: 'サンプルクローゼット投入',
}

export default async function SeedClosetPage() {
  const admin = await checkAdmin()
  if (!admin.isAdmin) {
    redirect('/')
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/my" style={{ color: '#999', fontSize: '0.85rem', textDecoration: 'none' }}>
          ‹ マイへ戻る
        </Link>
      </div>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', marginBottom: 8 }}>
        🌱 サンプルクローゼット投入
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, marginBottom: 20 }}>
        AI コーデ提案の検証用に、楽天 API から実物の商品画像つきでバランスよく 50 着を投入します。
        <br />
        あなたのプロフィールの性別に応じてカテゴリ配分が変わります。
      </p>

      <SeedClosetClient />

      <div
        style={{
          marginTop: 24,
          background: '#FFF8E1',
          border: '1px solid #FFE082',
          borderRadius: 12,
          padding: 14,
          fontSize: '0.78rem',
          color: '#7B5B00',
          lineHeight: 1.6,
        }}
      >
        <strong>⚠️ 注意</strong>
        <ul style={{ marginLeft: 18, marginTop: 6 }}>
          <li>投入される服の名前は <code>[SAMPLE] ...</code> プレフィックスがつきます</li>
          <li>再投入すると既存のサンプル（[SAMPLE] で始まる服）は自動削除されます</li>
          <li>あなたが手動登録した服は影響を受けません</li>
          <li>「サンプル削除」ボタンで [SAMPLE] 服を一括削除できます</li>
        </ul>
      </div>
    </div>
  )
}
