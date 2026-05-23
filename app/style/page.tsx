// 嗜好スワイプ画面
import Link from 'next/link'
import { getStyleProfile, listSwipes } from '@/lib/style'
import StyleSwipeClient from '@/components/StyleSwipeClient'

export default async function StylePage() {
  const profile = await getStyleProfile()
  const recentSwipes = await listSwipes({ limit: 100 })
  const likedCount = recentSwipes.filter((s) => s.liked).length
  const dislikedCount = recentSwipes.filter((s) => !s.liked).length

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #FFE4F0',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ color: '#999', fontSize: '1.2rem' }}>
          ‹
        </Link>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginLeft: 14 }}>
          好みを教える 💞
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* 現在の推定嗜好 */}
        {profile && profile.tags.length > 0 ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #FFF0F6, #FFE4F0)',
              border: '1px solid #FFE4F0',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                color: '#999',
                fontWeight: 700,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              AI が推定したあなたの嗜好
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {profile.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    background: '#fff',
                    color: '#C4779B',
                    border: '1px solid #E8A0BF',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 12,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {profile.summary && (
              <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.5 }}>
                {profile.summary}
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              background: '#FFF5F8',
              border: '1px solid #FFE4F0',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              fontSize: '0.78rem',
              color: '#666',
              lineHeight: 1.6,
            }}
          >
            👉 服を5枚以上スワイプすると、AI があなたの嗜好（系統）を分析します。
            分析結果はコーデ提案に自動反映。
          </div>
        )}

        {/* スワイプ統計 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <Stat label="❤️ いいね" value={likedCount} color="#C4779B" />
          <Stat label="🚫 いらない" value={dislikedCount} color="#999" />
          <Stat label="合計" value={likedCount + dislikedCount} color="#666" />
        </div>

        {/* スワイプ本体 */}
        <StyleSwipeClient initialLikedCount={likedCount} hasProfile={!!profile} />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: '#fff',
        border: '1px solid #FFE4F0',
        borderRadius: 10,
        padding: 10,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.65rem', color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
