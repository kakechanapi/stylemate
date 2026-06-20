'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SeedResult {
  ok: boolean
  totalAdded?: number
  gender?: string
  deleted?: number
  error?: string
  errors?: string[]
}

export default function SeedClosetClient() {
  const router = useRouter()
  const [loading, setLoading] = useState<'seed' | 'delete' | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)

  const handleSeed = async () => {
    if (loading) return
    if (!confirm('楽天 API から 50 着を投入します。よろしいですか？\n（既存の [SAMPLE] サンプル服は事前に削除されます）')) return
    setLoading('seed')
    setResult(null)
    try {
      const res = await fetch('/api/admin/seed-closet', { method: 'POST' })
      const data = (await res.json()) as SeedResult
      setResult(data)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : '不明なエラー' })
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    if (loading) return
    if (!confirm('[SAMPLE] で始まる服を全て削除します。手動登録分は影響しません。')) return
    setLoading('delete')
    setResult(null)
    try {
      const res = await fetch('/api/admin/seed-closet', { method: 'DELETE' })
      const data = (await res.json()) as SeedResult
      setResult(data)
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : '不明なエラー' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={handleSeed}
        disabled={loading !== null}
        style={{
          background:
            loading === 'seed'
              ? '#ccc'
              : 'linear-gradient(135deg, #E8A0BF, #C4779B)',
          color: '#fff',
          border: 'none',
          borderRadius: 16,
          padding: '14px 20px',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 14px rgba(196,121,155,0.35)',
        }}
      >
        {loading === 'seed' ? '🌱 投入中…（30秒くらいかかります）' : '🌱 50着のサンプル服を投入する'}
      </button>

      <button
        onClick={handleDelete}
        disabled={loading !== null}
        style={{
          background: '#fff',
          color: '#999',
          border: '2px solid #ddd',
          borderRadius: 16,
          padding: '12px 18px',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading === 'delete' ? '削除中…' : '🗑 [SAMPLE] 服だけ一括削除'}
      </button>

      {/* 結果表示 */}
      {result && (
        <div
          style={{
            marginTop: 8,
            background: result.ok ? '#E8FBF1' : '#FFEAEA',
            border: `2px solid ${result.ok ? '#6EE7B7' : '#F87171'}`,
            borderRadius: 12,
            padding: 14,
            fontSize: '0.85rem',
            color: result.ok ? '#10B981' : '#D63A3A',
            lineHeight: 1.7,
          }}
        >
          {result.ok ? (
            <>
              ✅ 完了しました
              {typeof result.totalAdded === 'number' && (
                <>
                  <br />
                  投入：<b>{result.totalAdded}着</b>（性別: {result.gender}）
                </>
              )}
              {typeof result.deleted === 'number' && (
                <>
                  <br />
                  削除：<b>{result.deleted}着</b>
                </>
              )}
              <br />
              <button
                onClick={() => router.push('/closet')}
                style={{
                  marginTop: 10,
                  background: '#fff',
                  border: '2px solid #6EE7B7',
                  color: '#10B981',
                  borderRadius: 12,
                  padding: '6px 14px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                クローゼットを見る →
              </button>
            </>
          ) : (
            <>
              ❌ {result.error || 'エラーが発生しました'}
            </>
          )}
          {Array.isArray(result.errors) && result.errors.length > 0 && (
            <details style={{ marginTop: 8, fontSize: '0.72rem', color: '#7B5B00' }}>
              <summary>個別エラー（最初の{result.errors.length}件）</summary>
              <ul style={{ marginLeft: 16, marginTop: 4 }}>
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
