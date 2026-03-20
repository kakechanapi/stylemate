import Link from 'next/link'

type Prediction = {
  id: string
  question: string
  category: string
  yes_percent?: number
  no_percent?: number
  total_votes?: number
  closes_at: string
  status?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: '🗳️ 政治',
  economy: '📈 経済',
  sports: '⚽ スポーツ',
  entertainment: '🎬 エンタメ',
  society: '🌏 社会',
  tech: '💻 テクノロジー',
}

export default function PredictionCard({ prediction }: { prediction: Prediction }) {
  const yesPercent = prediction.yes_percent ?? 50
  const noPercent = prediction.no_percent ?? 50
  const totalVotes = prediction.total_votes ?? 0

  const closesAt = new Date(prediction.closes_at)
  const now = new Date()
  const diffMs = closesAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const isExpired = diffMs < 0

  return (
    <Link href={`/predictions/${prediction.id}`} style={{ display: 'block' }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(108, 99, 255, 0.14)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'
        }}
      >
        {/* ヘッダー行 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <span style={{
            background: 'var(--surface-2)',
            color: 'var(--primary)',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}>
            {CATEGORY_LABELS[prediction.category] || prediction.category}
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: isExpired ? 'var(--text-muted)' : '#16a34a',
            fontWeight: 600,
          }}>
            {isExpired ? '締切済み' : `残り ${diffDays} 日`}
          </span>
        </div>

        {/* 質問文 */}
        <p style={{
          fontWeight: 600,
          fontSize: '0.95rem',
          lineHeight: 1.5,
          marginBottom: '1rem',
          color: 'var(--text)',
        }}>
          {prediction.question}
        </p>

        {/* オッズバー */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}>
            <span style={{ color: 'var(--yes-color)' }}>YES {yesPercent}%</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {totalVotes > 0 ? `${totalVotes.toLocaleString()} 票` : '投票なし'}
            </span>
            <span style={{ color: 'var(--no-color)' }}>NO {noPercent}%</span>
          </div>
          <div style={{
            height: '8px',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--no-color)',
          }}>
            <div style={{
              height: '100%',
              width: `${yesPercent}%`,
              background: 'var(--yes-color)',
              borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>
    </Link>
  )
}
