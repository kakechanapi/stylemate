'use client'

// 友達詳細ページ用の編集フォーム
// 友達（is_me=false）専用：写真・名前・性別・誕生日・関係性・メモを編集
// 身長・体型・本人モード（LoRA）は出さない方針

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import type { Friend, Gender, Relationship } from '@/types/fashion'
import { uploadFriendThumb } from '@/lib/storage'
import { updateFriendAction } from '@/app/friends/actions'

const GENDERS: Gender[] = ['女性', '男性']
const RELATIONSHIPS: Relationship[] = [
  '友達',
  '家族',
  '恋人・パートナー',
  'その他',
]

interface Props {
  friend: Friend
}

export default function FriendEditForm({ friend }: Props) {
  const router = useRouter()

  const [name, setName] = useState(friend.name)
  // 既存データに「指定しない」が入っていたら女性扱いに寄せる（後方互換）
  const initialGender: Gender =
    friend.gender === '男性' ? '男性' : '女性'
  const [gender, setGender] = useState<Gender>(initialGender)
  const [birthday, setBirthday] = useState(friend.birthday || '')
  const [relationship, setRelationship] = useState<Relationship>(
    friend.relationship || '友達'
  )
  const [note, setNote] = useState(friend.note || '')
  const [thumbUrl, setThumbUrl] = useState(friend.thumb_url || '')

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const result = await uploadFriendThumb(file)
    if (result.ok && result.url) {
      setThumbUrl(result.url)
    } else {
      setUploadError(result.error || 'アップロード失敗')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    const result = await updateFriendAction(friend.id, {
      name: name.trim(),
      gender,
      birthday: birthday || null,
      relationship,
      note: note.trim() || null,
      thumb_url: thumbUrl || null,
    })
    if (!result.ok) {
      setError(result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    // ふわっと「✓ 保存しました」表示 → 1.2秒後にリストに戻る
    setTimeout(() => router.push('/friends'), 1200)
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* プロフィール写真 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'relative',
            width: 140,
            height: 140,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'rgba(232,160,191,0.06)',
            border: '3px solid #fff',
            boxShadow: '0 4px 12px rgba(232,160,191,0.25)',
            cursor: uploading ? 'wait' : 'pointer',
          }}
          aria-label="写真を変更"
        >
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={name}
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
        </button>
        {thumbUrl && (
          <button
            type="button"
            onClick={() => setThumbUrl('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#bbb',
              fontSize: '0.75rem',
              marginTop: 6,
              cursor: 'pointer',
            }}
          >
            写真を削除
          </button>
        )}
        {uploading && (
          <p style={{ color: '#C4779B', fontSize: '0.78rem', marginTop: 6 }}>
            アップロード中…
          </p>
        )}
        {uploadError && (
          <p style={{ color: '#d63384', fontSize: '0.75rem', marginTop: 6 }}>
            {uploadError}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImagePick}
          style={{ display: 'none' }}
        />
      </div>

      {/* 名前 */}
      <Field label="名前" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：ゆうか"
          style={inputStyle}
        />
      </Field>

      {/* 性別 */}
      <Field label="性別" optional>
        <Segmented
          options={GENDERS}
          value={gender}
          onChange={(v) => setGender(v as Gender)}
        />
      </Field>

      {/* 誕生日（フィールド全体タップでカレンダー起動） */}
      <Field label="誕生日" optional>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          onClick={(e) => {
            const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
            el.showPicker?.()
          }}
          onFocus={(e) => {
            const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
            el.showPicker?.()
          }}
          style={{ ...inputStyle, cursor: 'pointer' }}
        />
      </Field>

      {/* 関係性 */}
      <Field label="関係性" optional>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Relationship)}
          style={{
            ...inputStyle,
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

      {/* メモ */}
      <Field label="メモ" optional>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="職業や特徴など、自由にお書きください"
          rows={5}
          style={{
            ...inputStyle,
            resize: 'vertical',
            fontFamily: 'inherit',
            minHeight: 80,
          }}
        />
        <p style={{ fontSize: '0.66rem', color: '#999', marginTop: 4, lineHeight: 1.5 }}>
          ※ あなた自身のメモ用です。AI提案の参考にも将来使えるよう保存します。
        </p>
      </Field>

      {error && (
        <p style={{ color: '#d63384', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>
      )}

      {/* 保存ボタン（固定） */}
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
          disabled={!name.trim() || saving || saved}
          style={{
            width: '100%',
            padding: 14,
            background: saved
              ? 'linear-gradient(135deg, #6ee7b7, #34d399)'
              : name.trim() && !saving
              ? 'linear-gradient(135deg, #E8A0BF, #C4779B)'
              : '#ddd',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            fontSize: '1rem',
            fontWeight: 700,
            cursor: name.trim() && !saving && !saved ? 'pointer' : 'not-allowed',
          }}
        >
          {saved ? '✓ 保存しました' : saving ? '保存中…' : '変更を保存'}
        </button>
      </div>
    </div>
  )
}

// ───── 内部 UI 部品 ─────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid #FFE4F0',
  borderRadius: 12,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  color: '#333',
  outline: 'none',
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
            type="button"
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 10,
              border: 'none',
              background: active
                ? 'linear-gradient(135deg, #E8A0BF, #C4779B)'
                : 'transparent',
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
