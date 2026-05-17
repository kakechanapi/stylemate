'use client'
import { useState } from 'react'

interface OutfitRecord {
  date: string
  tpo: string
  items: string[]
  note?: string
}

const demoRecords: OutfitRecord[] = [
  { date: new Date().toISOString().split('T')[0], tpo: 'casual', items: ['ホワイトTシャツ', 'スキニーデニム'], note: 'カフェでランチ' },
]

const tpoEmoji: Record<string, string> = {
  casual: '😊', date: '💕', work: '💼', party: '🎉', sport: '🏃', formal: '✨',
}

export default function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const recordByDate: Record<string, OutfitRecord> = {}
  demoRecords.forEach(r => { recordByDate[r.date] = r })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', marginBottom: '20px' }}>
        着用カレンダー 📅
      </h1>

      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={prevMonth} style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 8px' }}>‹</button>
        <span style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
          {year}年{month + 1}月
        </span>
        <button onClick={nextMonth} style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 8px' }}>›</button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 12px rgba(232,160,191,0.12)', marginBottom: '20px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : '#999', padding: '4px' }}>
              {d}
            </div>
          ))}
        </div>
        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const record = recordByDate[dateStr]
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const dayOfWeek = (firstDay + i) % 7
            return (
              <div key={day} style={{
                textAlign: 'center',
                padding: '4px 2px',
                borderRadius: '10px',
                background: isToday ? '#FFF0F6' : record ? '#FFF5F8' : 'transparent',
                border: isToday ? '2px solid #E8A0BF' : '2px solid transparent',
              }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? '#C4779B' : dayOfWeek === 0 ? '#F87171' : dayOfWeek === 6 ? '#60A5FA' : '#333',
                }}>
                  {day}
                </span>
                {record && <div style={{ fontSize: '0.7rem' }}>{tpoEmoji[record.tpo] || '👗'}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent records */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginBottom: '12px' }}>着用記録</h2>
      {demoRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#ccc' }}>
          <p>まだ着用記録がありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {demoRecords.map((record, i) => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 2px 8px rgba(232,160,191,0.1)',
              border: '1px solid #FFE4F0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#333' }}>{record.date}</span>
                <span style={{ fontSize: '1rem' }}>{tpoEmoji[record.tpo] || '👗'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {record.items.map((item, j) => (
                  <span key={j} style={{
                    background: '#FFF0F6',
                    color: '#C4779B',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {item}
                  </span>
                ))}
              </div>
              {record.note && (
                <p style={{ fontSize: '0.78rem', color: '#999', marginTop: '8px' }}>{record.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
