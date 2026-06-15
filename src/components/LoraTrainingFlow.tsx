'use client'
// Phase 5: LoRA 訓練フロー（クライアント）
// 流れ：
// 1) ユーザーが「本人モードを起動」をクリック
// 2) コスト確認ダイアログ表示
// 3) IndexedDB から顔写真を取得 → ブラウザで zip 化
// 4) Supabase Storage の 'lora-training' バケットに zip をアップロード
// 5) POST /api/lora-train で Replicate 訓練を開始
// 6) ポーリングで進捗表示（20-30 分かかる前提）
// 7) 完了したら成功表示・friends.lora_url が DB に保存される

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  friendId: string
  friendName: string
  photoCount: number
  initialStatus: 'none' | 'pending' | 'training' | 'ready' | 'failed'
  initialTrainingId?: string | null
}

type Phase = 'idle' | 'confirming' | 'zipping' | 'uploading' | 'starting' | 'polling' | 'done' | 'error'

const POLL_INTERVAL_MS = 30_000 // 30秒間隔
const ESTIMATED_COST_JPY = 450

export default function LoraTrainingFlow({
  friendId,
  friendName,
  photoCount,
  initialStatus,
  initialTrainingId,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>(
    initialStatus === 'training' ? 'polling' : initialStatus === 'ready' ? 'done' : 'idle'
  )
  const [trainingId, setTrainingId] = useState<string | null>(initialTrainingId || null)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState('')

  // 訓練中ならポーリング再開
  useEffect(() => {
    if (phase !== 'polling' || !trainingId) return

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/lora-train?id=${trainingId}`)
        const data = await res.json()
        if (cancelled) return

        if (data.status === 'succeeded') {
          setPhase('done')
          setProgressMsg('✨ セットアップ完了！よりリアルにオンライン試着できます')
          router.refresh()
        } else if (data.status === 'failed' || data.status === 'canceled') {
          setPhase('error')
          setError(data.error || '訓練に失敗しました')
        } else {
          // 進行中
          const progress = data.progress
            ? data.progress.split('\n').slice(-2).join(' / ')
            : '訓練中...'
          setProgressMsg(progress)
        }
      } catch (e) {
        if (cancelled) return
        console.error('[lora poll] error:', e)
      }
    }

    poll() // 即時1回
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [phase, trainingId, router])

  const startTraining = async () => {
    setError('')
    setPhase('zipping')
    setProgressMsg('写真を準備中…')

    try {
      // 1) IndexedDB から face-${friendId}-* を全部取得
      const { dataUrlToBlob } = await import('@/lib/blobStore')
      const photoBlobs: { name: string; blob: Blob }[] = []
      // 最大30枚まで試行
      for (let i = 0; i < 30; i++) {
        const key = `face-${friendId}-${i}`
        try {
          const { openDB } = await import('idb')
          const db = await openDB('giftwear_blobs', 1)
          const entry = await db.get('blobs', key) as { blob: Blob } | undefined
          if (entry?.blob) {
            const ext = entry.blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
            photoBlobs.push({
              name: `${String(i).padStart(2, '0')}.${ext}`,
              blob: entry.blob,
            })
          }
        } catch {
          // ignore missing
        }
      }

      if (photoBlobs.length < 5) {
        throw new Error(
          `訓練には写真が最低5枚必要です（現在 ${photoBlobs.length}枚）`
        )
      }

      // 2) zip 化
      setProgressMsg(`${photoBlobs.length}枚を zip 化中…`)
      const zip = new JSZip()
      for (const { name, blob } of photoBlobs) {
        zip.file(name, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // 3) Supabase Storage にアップロード
      setPhase('uploading')
      setProgressMsg('Replicate に送信中…')
      const supabase = createSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('未ログインです')

      const zipPath = `${user.id}/${friendId}-${Date.now()}.zip`
      const { error: uploadErr } = await supabase.storage
        .from('lora-training')
        .upload(zipPath, zipBlob, {
          contentType: 'application/zip',
          upsert: true,
        })
      if (uploadErr) throw new Error(`アップロード失敗: ${uploadErr.message}`)

      const { data: pub } = supabase.storage.from('lora-training').getPublicUrl(zipPath)
      const zipUrl = pub.publicUrl

      // 4) 訓練開始 API
      setPhase('starting')
      setProgressMsg('訓練を開始しています…')
      const res = await fetch('/api/lora-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, zipUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.userMessage || data.error || '訓練開始失敗')
      }

      setTrainingId(data.trainingId)
      setPhase('polling')
      setProgressMsg('訓練中… 20〜30分かかります。閉じても進行は続きます。')
      router.refresh()
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : '不明なエラー')
    }
  }

  // ─── レンダリング ───

  // 訓練完了
  if (phase === 'done') {
    return (
      <Box color="#34D399">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
          ✓ よりリアルに試着OK
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 8, lineHeight: 1.6 }}>
          セットアップが完了しました。これからのオンライン試着が、より{friendName}そっくりに仕上がります。
        </p>
      </Box>
    )
  }

  // 訓練中
  if (phase === 'polling') {
    return (
      <Box color="#E8A0BF">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#C4779B' }}>
          🌀 セットアップ中…
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 8, lineHeight: 1.6 }}>
          {progressMsg || '20〜30分かかります。途中で画面を閉じても進行は続きます。'}
        </p>
      </Box>
    )
  }

  // エラー
  if (phase === 'error') {
    return (
      <Box color="#d63384">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d63384' }}>
          セットアップに失敗しました
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 6, lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          onClick={() => {
            setPhase('idle')
            setError('')
          }}
          style={btnSecondary}
        >
          もう一度やり直す
        </button>
      </Box>
    )
  }

  // 確認ダイアログ
  if (phase === 'confirming') {
    return (
      <Box color="#E8A0BF">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>
          よりリアルに試着できるようセットアップしますか？
        </h3>
        <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: '0.8rem', color: '#666', lineHeight: 1.7 }}>
          <li>登録済の {photoCount}枚 を使って AI に自分を学習させます</li>
          <li>セットアップに <b>20〜30分</b> かかります</li>
          <li>コスト：<b>約 {ESTIMATED_COST_JPY}円</b></li>
          <li>顔写真は一時的に送信されますが、セットアップ後は外部側で削除されます</li>
        </ul>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={() => setPhase('idle')} style={btnSecondary}>
            キャンセル
          </button>
          <button onClick={startTraining} style={btnPrimary}>
            セットアップを開始する
          </button>
        </div>
      </Box>
    )
  }

  // 準備中（zipping / uploading / starting）
  if (phase === 'zipping' || phase === 'uploading' || phase === 'starting') {
    return (
      <Box color="#E8A0BF">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#C4779B' }}>
          🛠 準備中…
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 6 }}>{progressMsg}</p>
      </Box>
    )
  }

  // idle：起動ボタン
  return (
    <Box color="#E8A0BF">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>よりリアルにオンライン試着</h3>
      <p style={{ fontSize: '0.78rem', color: '#666', marginTop: 6, lineHeight: 1.6 }}>
        登録した {photoCount}枚 から AI に自分を学習させて、オンライン試着を「{friendName}そっくり」に仕上げます。
      </p>
      {photoCount < 5 ? (
        <p
          style={{
            fontSize: '0.72rem',
            color: '#d63384',
            marginTop: 10,
            background: '#FFF0F6',
            padding: 10,
            borderRadius: 8,
          }}
        >
          ※ セットアップには写真が最低5枚必要です。写真欄から追加してください。
        </p>
      ) : (
        <button
          onClick={() => setPhase('confirming')}
          style={{ ...btnPrimary, width: '100%', marginTop: 14 }}
        >
          セットアップする（約 {ESTIMATED_COST_JPY}円）
        </button>
      )}
    </Box>
  )
}

function Box({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${color}55`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  flex: 1,
}

const btnSecondary: React.CSSProperties = {
  background: '#fff',
  color: '#999',
  border: '2px solid #eee',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  flex: 1,
}
