'use client'

// 着用記録フォーム内で「友達がいないとき」「友達を追加したいとき」に使う。
// 名前だけで素早く追加できるが、詳細（性別・誕生日・関係性）も任意で入力可能。
// 身長・体型は友達に対しては保持しない方針（試着・本人モードを使わないため）。

import { useState } from 'react'
import type { Gender, Relationship } from '@/types/fashion'
import { quickAddFriendAction } from './friend-quick-add-action'

interface Props {
  onAdded: (friend: { id: string; name: string }) => void
  placeholder?: string
  compact?: boolean // 友達がすでに居る時に小さく表示
}

const GENDERS: Gender[] = ['女性', '男性']
const RELATIONSHIPS: Relationship[] = ['友達', '家族', '恋人・パートナー', 'その他']

export default function QuickAddFriendField({ onAdded, placeholder, compact }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('女性')
  const [birthday, setBirthday] = useState('')
  const [relationship, setRelationship] = useState<Relationship>('友達')
  const [note, setNote] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(!compact) // compact モードは折り畳み

  const reset = () => {
    setName('')
    setGender('女性')
    setBirthday('')
    setRelationship('友達')
    setNote('')
    setShowDetails(false)
  }

  const handleAdd = async () => {
    if (!name.trim() || adding) return
    setAdding(true)
    setError('')
    const result = await quickAddFriendAction({
      name,
      gender: gender || undefined,
      birthday: birthday || undefined,
      relationship,
      note: note || undefined,
    })
    if (!result.ok || !result.id || !result.name) {
      setError(result.error || '追加に失敗しました')
      setAdding(false)
      return
    }
    onAdded({ id: result.id, name: result.name })
    reset()
    setAdding(false)
    if (compact) setOpen(false)
  }

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '6px 12px',
          borderRadius: 20,
          border: '2px dashed #E8A0BF',
          background: '#fff',
          color: '#C4779B',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          marginTop: 6,
        }}
      >
        ＋ 友達を追加
      </button>
    )
  }

  return (
    <div
      style={{
        background: '#FFF8FB',
        border: '2px dashed #E8A0BF',
        borderRadius: 12,
        padding: 10,
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !showDetails) {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={placeholder || '名前を入力（例：たかし）'}
          disabled={adding}
          maxLength={30}
          style={{
            flex: 1,
            border: '1px solid #FFE4F0',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: '0.85rem',
            outline: 'none',
            color: '#333',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim() || adding}
          style={{
            background: name.trim() ? 'linear-gradient(135deg, #E8A0BF, #C4779B)' : '#eee',
            color: name.trim() ? '#fff' : '#bbb',
            border: 'none',
            borderRadius: 8,
            padding: '0 14px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: name.trim() && !adding ? 'pointer' : 'not-allowed',
          }}
        >
          {adding ? '…' : '＋ 追加'}
        </button>
        {compact && (
          <button
            type="button"
            onClick={() => { setOpen(false); reset() }}
            style={{
              background: 'transparent',
              color: '#bbb',
              border: 'none',
              padding: '0 6px',
              cursor: 'pointer',
            }}
            aria-label="閉じる"
          >
            ✕
          </button>
        )}
      </div>

      {/* 詳細トグル */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        style={{
          background: 'transparent',
          color: '#C4779B',
          border: 'none',
          padding: 0,
          fontSize: '0.72rem',
          fontWeight: 600,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {showDetails ? '▾' : '▸'} 性別・誕生日・関係性も入れる（任意）
      </button>

      {showDetails && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          {/* 性別 */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              性別
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {GENDERS.map((g) => {
                const active = gender === g
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(active ? '' : g)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: `1px solid ${active ? '#E8A0BF' : '#FFE4F0'}`,
                      background: active ? '#FFF0F6' : '#fff',
                      color: active ? '#C4779B' : '#888',
                      fontSize: '0.74rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
          {/* 誕生日（フィールド全体タップでカレンダー起動） */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              誕生日
            </label>
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
              style={{
                width: '100%',
                border: '1px solid #FFE4F0',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: '0.82rem',
                color: '#333',
                cursor: 'pointer',
              }}
            />
          </div>
          {/* 関係性 */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              関係性
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relationship)}
              style={{
                width: '100%',
                border: '1px solid #FFE4F0',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: '0.82rem',
                color: '#333',
                background: '#fff',
              }}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {/* メモ（自由記述） */}
          <div>
            <label style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              メモ
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="職業や特徴など、自由にお書きください"
              rows={3}
              style={{
                width: '100%',
                border: '1px solid #FFE4F0',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: '0.82rem',
                color: '#333',
                background: '#fff',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.66rem', color: '#999', margin: 0 }}>
        ※ 写真や追加情報は後で /friends から編集できます。
      </p>
      {error && (
        <p style={{ fontSize: '0.72rem', color: '#d63384', margin: 0 }}>{error}</p>
      )}
    </div>
  )
}
