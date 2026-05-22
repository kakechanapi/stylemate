'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Phase = 'loading' | 'generating' | 'succeeded' | 'failed'

interface Props {
  friendId: string
  friendName: string
  humanImage: string // data URL or http URL
  clothingId: string
  clothingImageUrl: string
  clothingName: string
  garmentDescription?: string
}

const PROGRESS_LABELS = [
  '画像を準備中…',
  '体型を分析中…',
  '服を合成中…',
  '仕上げ中…',
]

export default function TryonGenerator(props: Props) {
  const router = useRouter()
  const startedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('loading')
  const [progress, setProgress] = useState(0)
  const [labelIdx, setLabelIdx] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    const startedAt = Date.now()
    const expectedMs = 60_000

    const progressTimer = setInterval(() => {
      if (cancelled) return
      const elapsed = Date.now() - startedAt
      const ratio = Math.min(elapsed / expectedMs, 0.95)
      setProgress(Math.round(ratio * 100))
      const idx = Math.min(Math.floor(ratio * PROGRESS_LABELS.length), PROGRESS_LABELS.length - 1)
      setLabelIdx(idx)
    }, 500)

    ;(async () => {
      try {
        // human image を data URL に正規化
        const humanImageBase64 = await ensureDataUrl(props.humanImage)

        // 試着開始
        const startRes = await fetch('/api/tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            humanImageBase64,
            clothingImageUrl: props.clothingImageUrl,
            friendId: props.friendId,
            clothingId: props.clothingId,
            garmentDescription: props.garmentDescription,
          }),
        })
        const startData = await startRes.json()
        if (cancelled) return
        if (!startRes.ok) {
          clearInterval(progressTimer)
          setError(startData.userMessage || startData.error || '試着開始に失敗しました')
          setPhase('failed')
          return
        }

        setPhase('generating')

        const poll = async () => {
          if (cancelled) return
          try {
            const res = await fetch(
              `/api/tryon?predictionId=${startData.predictionId}&tryonId=${startData.tryonId || ''}`
            )
            const data = await res.json()
            if (cancelled) return
            if (data.status === 'succeeded' && data.resultUrl) {
              clearInterval(progressTimer)
              setProgress(100)
              setResultUrl(data.resultUrl)
              setTimeout(() => setPhase('succeeded'), 300)
              return
            }
            if (data.status === 'failed' || data.status === 'canceled') {
              clearInterval(progressTimer)
              setError(typeof data.error === 'string' ? data.error : 'AIの生成が失敗しました。再度お試しください。')
              setPhase('failed')
              return
            }
            setTimeout(poll, 2000)
          } catch (e) {
            if (cancelled) return
            clearInterval(progressTimer)
            setError(e instanceof Error ? e.message : 'ネットワークエラー')
            setPhase('failed')
          }
        }
        setTimeout(poll, 2000)
      } catch (e) {
        if (cancelled) return
        clearInterval(progressTimer)
        setError(e instanceof Error ? e.message : '不明なエラー')
        setPhase('failed')
      }
    })()

    return () => {
      cancelled = true
      clearInterval(progressTimer)
    }
  }, [props.friendId, props.clothingId, props.clothingImageUrl, props.garmentDescription, props.humanImage])

  // ─── Result ───
  if (phase === 'succeeded') {
    return (
      <div style={{ padding: 0 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid #FFE4F0',
            background: '#fff',
          }}
        >
          <Link href={`/friends/${props.friendId}`} style={{ color: '#999', fontSize: '1.2rem' }}>
            ‹
          </Link>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>試着完成</h1>
          <div style={{ width: 24 }} />
        </header>

        <div style={{ padding: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="試着結果"
            style={{ width: '100%', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
          <div
            style={{
              textAlign: 'center',
              marginTop: 12,
              fontSize: '0.85rem',
              color: '#666',
            }}
          >
            <b style={{ color: '#333' }}>{props.friendName}</b> ×{' '}
            <b style={{ color: '#333' }}>{props.clothingName}</b>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={() => router.push(`/tryon/${props.friendId}`)}
              style={{
                flex: 1,
                padding: 14,
                background: '#fff',
                border: '2px solid #E8A0BF',
                color: '#C4779B',
                borderRadius: 16,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              別の服を試着
            </button>
            <button
              onClick={() => router.push(`/friends/${props.friendId}`)}
              style={{
                flex: 1,
                padding: 14,
                background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              友人ページへ戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Failed ───
  if (phase === 'failed') {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😢</div>
        <p style={{ color: '#333', fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>
          試着できませんでした
        </p>
        <p style={{ color: '#999', fontSize: '0.8rem', marginBottom: 24, lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          onClick={() => router.refresh()}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginRight: 8,
          }}
        >
          再試行
        </button>
        <button
          onClick={() => router.push(`/tryon/${props.friendId}`)}
          style={{
            padding: '12px 28px',
            background: '#fff',
            border: '2px solid #ddd',
            color: '#666',
            borderRadius: 24,
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          別の服を選ぶ
        </button>
      </div>
    )
  }

  // ─── Loading / Generating ───
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #FFF0F6 0%, #FFE4F0 60%, #F5C6D8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      {/* 友人画像 */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          overflow: 'hidden',
          marginBottom: 24,
          border: '4px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 24px rgba(196,121,155,0.25)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.humanImage}
          alt={props.friendName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', marginBottom: 6 }}>
        {PROGRESS_LABELS[labelIdx]}
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: 24 }}>
        {props.friendName} × {props.clothingName}
      </p>

      <div
        style={{
          width: '100%',
          maxWidth: 300,
          height: 6,
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(to right, #E8A0BF, #C4779B)',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: '0.85rem', fontWeight: 700, color: '#C4779B' }}>
        {progress}%
      </div>

      <p style={{ marginTop: 30, fontSize: '0.72rem', color: '#999', textAlign: 'center' }}>
        完了まで 1分前後。画面を閉じても処理は継続します。
      </p>
    </div>
  )
}

// 画像 ref を Replicate に送れる形（data URL or 公開 URL）にする
async function ensureDataUrl(ref: string): Promise<string> {
  if (ref.startsWith('data:')) return ref
  if (ref.startsWith('http')) {
    // 公開 URL ならそのまま渡せる（Replicate がアクセスできる）
    return ref
  }
  throw new Error('画像が解決できません')
}
