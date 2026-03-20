import { supabaseServer } from '@/src/lib/supabase-server'
import PredictionCard from '@/src/components/PredictionCard'

const CATEGORIES = [
  { id: 'all', label: 'すべて' },
  { id: 'politics', label: '🗳️ 政治' },
  { id: 'economy', label: '📈 経済' },
  { id: 'sports', label: '⚽ スポーツ' },
  { id: 'entertainment', label: '🎬 エンタメ' },
  { id: 'society', label: '🌏 社会' },
  { id: 'tech', label: '💻 テクノロジー' },
]

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory = category || 'all'

  const supabase = supabaseServer()
  let query = supabase
    .from('predictions_with_odds')
    .select('*')
    .eq('status', 'active')
    .order('closes_at', { ascending: true })
    .limit(20)

  if (activeCategory !== 'all') {
    query = query.eq('category', activeCategory)
  }

  const { data: predictions, error } = await query

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* ヒーローセクション */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        borderRadius: 'var(--radius)',
        padding: '2rem',
        color: '#fff',
        marginBottom: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          賭けじゃなくて、考える習慣
        </h1>
        <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>
          Yes / No の 2 択で世の中を予測。みんなの集合知を可視化しよう。
        </p>
      </div>

      {/* カテゴリフィルター */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem',
      }}>
        {CATEGORIES.map((cat) => (
          <a
            key={cat.id}
            href={cat.id === 'all' ? '/' : `/?category=${cat.id}`}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeCategory === cat.id ? 'var(--primary)' : 'var(--surface)',
              color: activeCategory === cat.id ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${activeCategory === cat.id ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            {cat.label}
          </a>
        ))}
      </div>

      {/* 予測カード一覧 */}
      {error ? (
        <ErrorState message="データの取得に失敗しました。Supabase の設定を確認してください。" />
      ) : !predictions || predictions.length === 0 ? (
        <EmptyState category={activeCategory} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {predictions.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </div>
      )}

      {/* デモ用サンプルカード（Supabase未接続時） */}
      {error && <DemoCards />}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 'var(--radius)',
      padding: '1.5rem',
      color: '#dc2626',
      marginBottom: '1rem',
    }}>
      ⚠️ {message}
    </div>
  )
}

function EmptyState({ category }: { category: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 1rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <p>このカテゴリの予測はまだありません</p>
    </div>
  )
}

// Supabase未接続時のデモ表示
function DemoCards() {
  const demos = [
    {
      id: 'demo-1',
      question: '2026年の参議院選挙で与党は過半数を維持できるか？',
      category: 'politics',
      yes_percent: 62,
      no_percent: 38,
      total_votes: 1284,
      closes_at: '2026-07-10T23:59:59+09:00',
    },
    {
      id: 'demo-2',
      question: '2026年末までにドル円は130円を下回るか？',
      category: 'economy',
      yes_percent: 45,
      no_percent: 55,
      total_votes: 892,
      closes_at: '2026-12-31T23:59:59+09:00',
    },
    {
      id: 'demo-3',
      question: '阪神タイガースは2026年シーズンにリーグ優勝できるか？',
      category: 'sports',
      yes_percent: 38,
      no_percent: 62,
      total_votes: 2103,
      closes_at: '2026-10-31T23:59:59+09:00',
    },
  ]

  return (
    <div>
      <p style={{
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        marginBottom: '1rem',
        padding: '8px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
      }}>
        📋 デモ表示（Supabase に接続すると実データが表示されます）
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {demos.map((p) => (
          <PredictionCard key={p.id} prediction={p as any} />
        ))}
      </div>
    </div>
  )
}
