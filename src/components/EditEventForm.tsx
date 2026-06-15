'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EventItem } from '@/lib/events'
import { updateEventAction } from '@/app/events/actions'
import { handleActionResult } from './SessionExpiredHandler'

const TPO_OPTIONS = [
  { value: 'casual', label: 'カジュアル' },
  { value: 'date', label: 'デート' },
  { value: 'work', label: '仕事' },
  { value: 'party', label: 'パーティー' },
  { value: 'sport', label: 'スポーツ' },
  { value: 'formal', label: 'フォーマル' },
]

export default function EditEventForm({
  event,
  friends,
}: {
  event: EventItem
  friends: { id: string; name: string }[]
}) {
  const router = useRouter()

  const startsDate = new Date(event.starts_at)
  const dateStr = `${startsDate.getFullYear()}-${String(startsDate.getMonth() + 1).padStart(2, '0')}-${String(startsDate.getDate()).padStart(2, '0')}`
  const timeStr = `${String(startsDate.getHours()).padStart(2, '0')}:${String(startsDate.getMinutes()).padStart(2, '0')}`

  const [title, setTitle] = useState(event.title)
  const [date, setDate] = useState(dateStr)
  const [time, setTime] = useState(timeStr)
  const [tpo, setTpo] = useState(event.tpo || 'casual')
  const [friendIds, setFriendIds] = useState<string[]>(event.friend_ids || [])
  const [location, setLocation] = useState(event.location || '')
  const [note, setNote] = useState(event.note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = title.trim().length > 0

  const toggleFriend = (id: string) => {
    setFriendIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError('')
    const starts = new Date(`${date}T${time}:00`).toISOString()
    const result = handleActionResult(
      await updateEventAction(event.id, {
        title: title.trim(),
        starts_at: starts,
        tpo,
        friend_ids: friendIds,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      })
    )
    if (!result.ok) {
      setError(result.userMessage || result.error || '保存に失敗しました')
      setSaving(false)
      return
    }
    router.push('/events')
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <Field label="タイトル" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="日付" required>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>

      <Field label="時刻" required>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
      </Field>

      <Field label="シーン">
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

      <Field label="誰と会う？">
        {friends.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: '#bbb' }}>友人未登録</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {friends.map((f) => {
              const active = friendIds.includes(f.id)
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
        )}
      </Field>

      <Field label="場所">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例：渋谷"
          style={inputStyle}
        />
      </Field>

      <Field label="メモ">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
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
          {saving ? '保存中…' : '保存'}
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: '0.7rem',
          color: '#999',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#C4779B' }}> *</span>}
      </div>
      {children}
    </div>
  )
}
