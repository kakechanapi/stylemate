'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera } from 'lucide-react'
import type { BodyType, Gender, Relationship } from '@/types/fashion'
import FacePhotoPicker, {
  FacePhoto,
  FacePhotoPickerHandle,
} from '@/components/FacePhotoPicker'
import { dataUrlToBlob, saveBlob } from '@/lib/blobStore'
import { createFriendAction } from '../actions'

const BODY_TYPES: BodyType[] = ['スリム', 'ふつう', 'がっしり']
const GENDERS: Gender[] = ['男性', '女性', '指定しない']
const RELATIONSHIPS: Relationship[] = [
  '友達',
  '家族',
  '恋人・パートナー',
  '自分',
  'その他',
]

function NewFriendForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMe = searchParams.get('me') === '1'

  const [name, setName] = useState('')
  const [height, setHeight] = useState(160)
  const [bodyType, setBodyType] = useState<BodyType>('ふつう')
  const [gender, setGender] = useState<Gender>('指定しない')
  const [relationship, setRelationship] = useState<Relationship>(
    isMe ? '自分' : '友達'
  )
  const [facePhotos, setFacePhotos] = useState<FacePhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pickerRef = useRef<FacePhotoPickerHandle>(null)

  useEffect(() => {
    if (isMe && !name) setName('自分')
  }, [isMe, name])

  const profilePhoto = useMemo(() => {
    const firstUsable = facePhotos.find((p) => p.quality.isUsable)
    return firstUsable?.dataUrl || facePhotos[0]?.dataUrl || ''
  }, [facePhotos])

  // 自分は写真必須 / 会う相手は名前のみで OK
  const canSave = useMemo(
    () => name.trim().length > 0 && (!isMe || facePhotos.length > 0),
    [facePhotos, name, isMe]
  )

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError('')

    try {
      // 1. 友人レコード作成
      const usable = facePhotos.filter((p) => p.quality.isUsable)
      const created = await createFriendAction({
        name: name.trim(),
        height_cm: isMe ? height : undefined,
        body_type: isMe ? bodyType : undefined,
        gender: isMe ? gender : undefined,
        relationship,
        is_me: isMe,
        thumb_url: profilePhoto || undefined,
        face_photo_count: usable.length,
      })

      if (!created.ok || !created.id) {
        setError(created.error || '保存に失敗しました')
        setSaving(false)
        return
      }

      // 2. 顔写真を IndexedDB に保存（friendId と紐付け）
      for (let i = 0; i < usable.length; i++) {
        const key = `face-${created.id}-${i}`
        try {
          await saveBlob(key, dataUrlToBlob(usable[i].dataUrl))
        } catch (e) {
          console.warn('[friend/new] face photo save failed:', e)
        }
      }

      router.push(isMe ? '/my' : '/friends')
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
      setSaving(false)
    }
  }

  const sliderPosition = ((height - 140) / (200 - 140)) * 100

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid #FFE4F0',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push(isMe ? '/my' : '/friends')}
          style={{ background: 'none', color: '#999', fontSize: '0.95rem' }}
        >
          キャンセル
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>
          {isMe ? '自分を登録' : '会う相手を追加'}
        </h1>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ padding: '24px 20px' }}>
        {/* 円形プレビュー：タップでマルチ選択 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => pickerRef.current?.openFileDialog()}
            style={{
              position: 'relative',
              width: 140,
              height: 140,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(232,160,191,0.06)',
              border: '3px solid #fff',
              boxShadow: '0 4px 12px rgba(232,160,191,0.25)',
              cursor: 'pointer',
            }}
            aria-label="写真を追加"
          >
            {profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePhoto}
                alt="friend"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px dashed #E8A0BF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={24} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#999' }}>
                  タップして追加
                </div>
              </div>
            )}
            {facePhotos.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  background: '#C4779B',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  borderRadius: 12,
                  padding: '2px 10px',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {facePhotos.length}枚
              </div>
            )}
          </button>
        </div>

        {/* マルチ選択ピッカー */}
        <FacePhotoPicker
          ref={pickerRef}
          photos={facePhotos}
          onChange={setFacePhotos}
          showAddTile={false}
        />

        {/* Name */}
        <Field label="名前" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：ゆうか"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #FFE4F0',
              borderRadius: 12,
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
        </Field>

        {/* 自分の場合のみ詳細フィールド */}
        {isMe && (<>

        {/* Height */}
        <Field label="身長" required>
          <div style={{ background: '#fff', border: '1px solid #FFE4F0', borderRadius: 12, padding: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C4779B' }}>
                {height}
                <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: 4 }}>cm</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#bbb' }}>140 — 200cm</div>
            </div>
            <div style={{ position: 'relative', height: 24, marginTop: 4, marginBottom: 4 }}>
              {/* トラック */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 9,
                  height: 6,
                  background: '#FFE4F0',
                  borderRadius: 6,
                }}
              />
              {/* 進捗 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 9,
                  height: 6,
                  width: `${sliderPosition}%`,
                  background: 'linear-gradient(to right, #E8A0BF, #C4779B)',
                  borderRadius: 6,
                  pointerEvents: 'none',
                }}
              />
              {/* つまみ（ハロー付きで「動かせる」と分かる） */}
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${sliderPosition}% - 12px)`,
                  top: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '3px solid #C4779B',
                  boxShadow: '0 2px 8px rgba(196,121,155,0.35)',
                  pointerEvents: 'none',
                  transition: 'left 0.05s ease-out',
                }}
              />
              <input
                type="range"
                min="140"
                max="200"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: 'transparent',
                }}
              />
            </div>
          </div>
        </Field>

        {/* Body type */}
        <Field label="体型" required>
          <Segmented options={BODY_TYPES} value={bodyType} onChange={(v) => setBodyType(v as BodyType)} />
        </Field>

        {/* Gender */}
        <Field label="性別" required>
          <Segmented options={GENDERS} value={gender} onChange={(v) => setGender(v as Gender)} />
        </Field>

        </>)}

        {/* Relationship */}
        <Field label="関係性" optional>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #FFE4F0',
              borderRadius: 12,
              fontSize: '0.95rem',
              background: '#fff',
            }}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <p style={{ color: '#d63384', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>
        )}
      </div>

      {/* Bottom save */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, #fff 70%, transparent)',
          padding: '12px 20px 90px',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            width: '100%',
            padding: 14,
            background:
              canSave && !saving ? 'linear-gradient(135deg, #E8A0BF, #C4779B)' : '#ddd',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: '1rem',
            fontWeight: 700,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? '保存中…' : '追加する'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: '0.7rem',
          color: '#999',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#C4779B' }}>*</span>}
        {optional && (
          <span
            style={{
              fontSize: '0.6rem',
              color: '#bbb',
              background: '#f5f5f5',
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            任意
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#fff',
        border: '2px solid #FFE4F0',
        borderRadius: 12,
        padding: 4,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 10,
              border: 'none',
              background: active ? 'linear-gradient(135deg, #E8A0BF, #C4779B)' : 'transparent',
              color: active ? '#fff' : '#999',
              fontSize: '0.85rem',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function NewFriendPage() {
  return (
    <Suspense fallback={null}>
      <NewFriendForm />
    </Suspense>
  )
}
