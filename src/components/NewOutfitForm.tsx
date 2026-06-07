'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ClothingItem } from '@/types/fashion'
import type { EventItem } from '@/lib/events'
import { createOutfitAction } from '@/app/outfits/actions'
import { handleActionResult } from './SessionExpiredHandler'
import QuickAddFriendField from './QuickAddFriendField'

const categoryEmoji: Record<string, string> = {
  tops: '👕', bottoms: '👖', outerwear: '🧥', shoes: '👟',
  bag: '👜', accessory: '💍', dress: '👗', other: '🎁',
}

const TPO_OPTIONS = [
  { value: 'casual', label: 'カジュアル' },
  { value: 'date', label: 'デート' },
  { value: 'work', label: '仕事' },
  { value: 'party', label: 'パーティー' },
  { value: 'sport', label: 'スポーツ' },
  { value: 'formal', label: 'フォーマル' },
]

interface Props {
  clothes: ClothingItem[]
  friends: { id: string; name: string }[]
  todayEvents: EventItem[]
}

export default function NewOutfitForm({ clothes, friends: initialFriends, todayEvents }: Props) {
  const router = useRouter()
  const [friends, setFriends] = useState(initialFriends)

  const handleFriendAdded = (f: { id: string; name: string }) => {
    setFriends((prev) => [...prev, f])
    setMetWithFriendIds((prev) => [...prev, f.id])
  }

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  // 今日の予定があれば、そこから誰と会うかをプリフィル
  const initialFriendIds = useMemo(() => {
    const ids = new Set<string>()
    todayEvents.forEach((e) => (e.friend_ids || []).forEach((id) => ids.add(id)))
    return Array.from(ids)
  }, [todayEvents])

  // 今日の予定の TPO（最初のもの）
  const initialTpo = todayEvents[0]?.tpo || 'casual'

  const [wornAt, setWornAt] = useState(todayStr)
  const [selectedClothIds, setSelectedClothIds] = useState<string[]>([])
  const [tpo, setTpo] = useState(initialTpo)
  const [metWithFriendIds, setMetWithFriendIds] = useState<string[]>(initialFriendIds)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = selectedClothIds.length > 0

  const toggleCloth = (id: string) => {
    setSelectedClothIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const toggleFriend = (id: string) => {
    setMetWithFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError('')
    const result = handleActionResult(
      await createOutfitAction({
        cloth_ids: selectedClothIds,
        tpo,
        worn_at: wornAt,
        met_with_friend_ids: metWithFriendIds,
        note: note.trim() || undefined,
      })
    )
    if (!result.ok) {
      setError(result.userMessage || result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    router.push('/calendar')
  }

  if (clothes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👗</div>
        <p style={{ color: '#999', marginBottom: 20 }}>
          記録するには、まずクローゼットに服を登録してください。
        </p>
        <a
          href="/register"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 24,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          服を登録する
        </a>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {todayEvents.length > 0 && (
        <div
          style={{
            background: '#FFF0F6',
            borderLeft: '3px solid #C4779B',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.78rem',
            color: '#666',
            lineHeight: 1.6,
          }}
        >
          📅 今日は <b>{todayEvents.map((e) => e.title).join('、')}</b> の予定があります。
          会う人を自動で選択しました。
        </div>
      )}

      <Field label="日付" required>
        <input
          type="date"
          value={wornAt}
          onChange={(e) => setWornAt(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="着た服" required>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {clothes.map((c) => {
            const active = selectedClothIds.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggleCloth(c.id)}
                style={{
                  background: '#fff',
                  border: `2px solid ${active ? '#C4779B' : '#FFE4F0'}`,
                  borderRadius: 12,
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: '#C4779B',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      zIndex: 2,
                    }}
                  >
                    ✓
                  </div>
                )}
                <div
                  style={{
                    aspectRatio: '1',
                    background: '#FFF0F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.8rem' }}>
                      {categoryEmoji[c.category] || '👗'}
                    </span>
                  )}
                </div>
                <div style={{ padding: '6px 4px', fontSize: '0.7rem', color: '#333', textAlign: 'center' }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {c.name}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: '0.7rem', color: '#999', marginTop: 6 }}>
          {selectedClothIds.length}点 選択中
        </p>
      </Field>

      <Field label="TPO">
        <div
          style={{
            display: 'flex',
            background: '#fff',
            border: '2px solid #FFE4F0',
            borderRadius: 12,
            padding: 4,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {TPO_OPTIONS.map((o) => {
            const active = o.value === tpo
            return (
              <button
                key={o.value}
                onClick={() => setTpo(o.value)}
                style={{
                  flex: '1 0 30%',
                  padding: '8px',
                  borderRadius: 10,
                  border: 'none',
                  background: active ? 'linear-gradient(135deg, #E8A0BF, #C4779B)' : 'transparent',
                  color: active ? '#fff' : '#999',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="誰と会った？" optional>
        {friends.length === 0 ? (
          <>
            <p style={{ fontSize: '0.78rem', color: '#bbb', marginBottom: 4 }}>
              まだ友達が登録されていません。下から追加するか、空欄でも保存OKです。
            </p>
            <QuickAddFriendField onAdded={handleFriendAdded} />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {friends.map((f) => {
                const active = metWithFriendIds.includes(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFriend(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: `2px solid ${active ? '#E8A0BF' : '#FFE4F0'}`,
                      background: active ? '#FFF0F6' : '#fff',
                      color: active ? '#C4779B' : '#888',
                      fontSize: '0.82rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}
                    {f.name}
                  </button>
                )
              })}
            </div>
            <QuickAddFriendField onAdded={handleFriendAdded} compact />
          </>
        )}
        <p style={{ fontSize: '0.7rem', color: '#999', marginTop: 4 }}>
          記録すると AI が次回「同じ人と被らない」コーデを提案します
        </p>
      </Field>

      <Field label="メモ" optional>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="任意"
          rows={2}
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
        />
      </Field>

      {error && <p style={{ color: '#d63384', fontSize: '0.8rem' }}>{error}</p>}

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
          {saving ? '保存中…' : 'コーデを記録'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid #FFE4F0',
  borderRadius: 12,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
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
          marginBottom: 8,
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
