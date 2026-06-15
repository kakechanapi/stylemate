'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createEventAction } from '@/app/events/actions'
import { handleActionResult } from './SessionExpiredHandler'

const TPO_OPTIONS = [
  { value: 'casual', label: 'カジュアル' },
  { value: 'date', label: 'デート' },
  { value: 'work', label: '仕事' },
  { value: 'party', label: 'パーティー' },
  { value: 'sport', label: 'スポーツ' },
  { value: 'formal', label: 'フォーマル' },
]

export default function NewEventForm({
  friends,
}: {
  friends: { id: string; name: string }[]
}) {
  const router = useRouter()

  // デフォルト：明日 19:00
  const defaultDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(19, 0, 0, 0)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('19:00')
  const [tpo, setTpo] = useState('casual')
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
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

    // 日付＋時刻 → ISO
    const starts = new Date(`${date}T${time}:00`).toISOString()

    const result = handleActionResult(
      await createEventAction({
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
          placeholder="例：イタリアンディナー / ピクニック"
          style={inputStyle}
        />
      </Field>

      <Field label="日付" required>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="時刻" required>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={inputStyle}
        />
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
                  whiteSpace: 'nowrap',
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
          <p
            style={{
              fontSize: '0.78rem',
              color: '#bbb',
              padding: 12,
              background: '#FFF5F8',
              borderRadius: 10,
            }}
          >
            まず「友人」タブから登録してください
          </p>
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

      <Field label="場所" optional>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例：渋谷"
          style={inputStyle}
        />
      </Field>

      <Field label="メモ" optional>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="任意"
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
          {saving ? '保存中…' : '予定を追加'}
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
    <div style={{ marginBottom: 16 }}>
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
