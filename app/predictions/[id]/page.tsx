import { supabaseServer } from '@/src/lib/supabase-server'
import { notFound } from 'next/navigation'
import VoteButtons from '@/src/components/VoteButtons'

const CATEGORY_LABELS: Record<string, string> = {
  politics: '🗳️ 政治',
  economy: '📈 経済',
  sports: '⚽ スポーツ',
  entertainment: '🎬 エンタメ',
  society: '🌏 社会',
  tech: '💻 テクノロジー',
}

export const dynamic = 'force-dynamic'

export default async function PredictionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = supabaseServer()

  const { data: prediction } = await supabase
    .from('predictions_with_odds')
    .select('*')
    .eq('id', id)
    .single()

  if (!prediction) notFound()

  const closesAt = new Date(prediction.closes_at)
  const now = new Date()
  const diffMs = closesAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isExpired = diffMs < 0

  const yesPercent = prediction.yes_percent ?? 50
  const noPercent = prediction.no_percent ?? 50
  const totalVotes = prediction.total_votes ?? 0

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <a href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        marginBottom: '1.5rem',
      }}>
        ← 一覧に戻る
      </a>

      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow)',
      }}>
        {/* カテゴリ・ステータス */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--surface-2)',
            color: 'var(--primary)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            {CATEGORY_LABELS[prediction.category] || prediction.category}
          </span>
          <span style={{
            background: isExpired ? '#f3f4f6' : '#dcfce7',
            color: isExpired ? '#6b7280' : '#16a34a',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            {isExpired ? '締切済み' : `残り ${diffDays} 日`}
          </span>
        </div>

        {/* 質問 */}
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {prediction.question}
        </h1>

        {/* 説明 */}
        {prediction.description && (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            lineHeight: 1.7,
            padding: '1rem',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
          }}>
            {prediction.description}
          </p>
        )}

        {/* オッズ表示 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--yes-color)', fontSize: '1.1rem' }}>
              YES {yesPercent}%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {totalVotes.toLocaleString()} 票
            </span>
            <span style={{ fontWeight: 700, color: 'var(--no-color)', fontSize: '1.1rem' }}>
              NO {noPercent}%
            </span>
          </div>
          <div style={{
            height: '12px',
            borderRadius: '6px',
            overflow: 'hidden',
            background: 'var(--no-color)',
          }}>
            <div style={{
              height: '100%',
              width: `${yesPercent}%`,
              background: 'var(--yes-color)',
              borderRadius: '6px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* 投票ボタン */}
        {!isExpired && <VoteButtons predictionId={prediction.id} />}

        {/* メタ情報 */}
        <div style={{
          borderTop: '1px solid var(--border)',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <span>締切: {closesAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          {prediction.source_url && (
            <a
              href={prediction.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)' }}
            >
              📎 参考情報
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
