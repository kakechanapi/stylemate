'use client'

import { useEffect, useRef, useState } from 'react'
import { saveSelfPhoto, loadSelfPhoto, clearSelfPhoto } from '@/lib/self-photo-db'

interface Props {
  /** 管理者のみ表示にしたい時 true で渡す。false なら表示しない */
  show: boolean
}

// 画像の最大ピクセル数（一辺 1024px に縮小して保存）。
// 大きすぎる base64 は IndexedDB と試着 API の負荷になるため。
const MAX_DIMENSION = 1024
const MAX_BYTES = 3 * 1024 * 1024 // base64 で 4MB 強相当

async function fileToCompressedBase64(file: File): Promise<string> {
  // 一旦 dataURL に読み込み、Canvas で縮小して再エンコード
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('image load failed'))
    i.src = dataUrl
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function SelfPhotoRegister({ show }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!show) {
      setLoaded(true)
      return
    }
    void (async () => {
      const p = await loadSelfPhoto()
      setPhoto(p?.base64 || null)
      setLoaded(true)
    })()
  }, [show])

  if (!show) return null

  const handleFile = async (file: File) => {
    setError('')
    setSaved(false)
    setBusy(true)
    try {
      const base64 = await fileToCompressedBase64(file)
      if (base64.length > MAX_BYTES) {
        setError('画像が大きすぎます。別の写真を選んでください。')
        return
      }
      await saveSelfPhoto(base64)
      setPhoto(base64)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('登録した自分の写真を削除しますか？')) return
    setBusy(true)
    try {
      await clearSelfPhoto()
      setPhoto(null)
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <section style={{ marginTop: 24, padding: 16, borderRadius: 12, background: '#fff', border: '0.5px solid #eee' }}>
        <div style={{ color: '#aaa', fontSize: '0.85rem' }}>読み込み中…</div>
      </section>
    )
  }

  return (
    <section
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        background: '#fff',
        border: '0.5px solid #eee',
      }}
    >
      <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333', margin: 0 }}>
        コーデ試着用の全身写真
      </h2>
      <p style={{ fontSize: '0.72rem', color: '#888', margin: '6px 0 12px', lineHeight: 1.6 }}>
        正面・全身が映った写真を1枚登録すると、AI が提案した3案のコーデをあなた自身が着た姿で確認できます。
        <br />
        <b style={{ color: '#7A5290' }}>この写真は端末内のみに保存</b> され、試着時のみ Replicate に送信されます（生成後すぐ削除）。
      </p>

      {photo ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <img
            src={photo}
            alt="登録された自分の写真"
            style={{
              width: 96,
              height: 128,
              objectFit: 'cover',
              borderRadius: 8,
              border: '0.5px solid #eee',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                background: '#fff',
                color: '#C4779B',
                border: '1.5px solid #E8A0BF',
                borderRadius: 18,
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              写真を撮り直す
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              style={{
                background: '#fff',
                color: '#999',
                border: '1.5px solid #ddd',
                borderRadius: 18,
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            border: 'none',
            borderRadius: 18,
            padding: 12,
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? '保存中…' : '+ 全身写真を登録'}
        </button>
      )}

      {/* capture は付けない：iOS Safari で capture があるとフォトライブラリ選択を
          スキップしてカメラを直接起動してしまう。全身写真は「撮ってもらった既存写真」を
          選ぶのが主流なので、ギャラリー/カメラの選択肢を残す */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />

      {saved && (
        <p style={{ fontSize: '0.72rem', color: '#3B8C5A', margin: '8px 0 0' }}>
          ✓ 保存しました（端末内）
        </p>
      )}
      {error && (
        <p style={{ fontSize: '0.72rem', color: '#C44', margin: '8px 0 0' }}>{error}</p>
      )}
    </section>
  )
}
