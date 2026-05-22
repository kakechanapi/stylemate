'use client'
import { useState } from 'react'
import type { Outfit } from '@/types/fashion'

const tpoEmoji: Record<string, string> = {
  casual: '😊',
  date: '💕',
  work: '💼',
  party: '🎉',
  sport: '🏃',
  formal: '✨',
}

interface Props {
  outfits: Outfit[]
  clothesMap: Record<string, string> // cloth id → name
}

export default function CalendarView({ outfits, clothesMap }: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 日付別マップ（複数同日があれば最新を採用）
  const recordByDate: Record<string, Outfit> = {}
  outfits.forEach((o) => {
    if (!recordByDate[o.worn_at]) recordByDate[o.worn_at] = o
  })

  // 表示する記録（今月分のみ）
  const monthlyRecords = outfits.filter((o) => {
    const d = new Date(o.worn_at)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  return (
    <>
      {/* Month nav */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <button
          onClick={prevMonth}
          style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 8px' }}
        >
          ‹
        </button>
        <span style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
          {year}年{month + 1}月
        </span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 8px' }}
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 16,
          boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : '#999',
                padding: 4,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const record = recordByDate[dateStr]
            const isToday =
              today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
            const dayOfWeek = (firstDay + i) % 7
            return (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  padding: '4px 2px',
                  borderRadius: 10,
                  background: isToday ? '#FFF0F6' : record ? '#FFF5F8' : 'transparent',
                  border: isToday ? '2px solid #E8A0BF' : '2px solid transparent',
                }}
              >
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday
                      ? '#C4779B'
                      : dayOfWeek === 0
                        ? '#F87171'
                        : dayOfWeek === 6
                          ? '#60A5FA'
                          : '#333',
                  }}
                >
                  {day}
                </span>
                {record && (
                  <div style={{ fontSize: '0.7rem' }}>
                    {(record.tpo && tpoEmoji[record.tpo]) || '👗'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent records */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#333', marginBottom: 12 }}>
        この月の記録
      </h2>
      {monthlyRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#ccc' }}>
          <p>まだ着用記録がありません</p>
          <p style={{ fontSize: '0.78rem', marginTop: 8 }}>
            ※ 記録機能は後の Phase で追加します
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {monthlyRecords.map((record) => (
            <div
              key={record.id}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 14,
                boxShadow: '0 2px 8px rgba(232,160,191,0.1)',
                border: '1px solid #FFE4F0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#333' }}>
                  {record.worn_at}
                </span>
                <span style={{ fontSize: '1rem' }}>
                  {(record.tpo && tpoEmoji[record.tpo]) || '👗'}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {record.cloth_ids.map((cid) => (
                  <span
                    key={cid}
                    style={{
                      background: '#FFF0F6',
                      color: '#C4779B',
                      borderRadius: 8,
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {clothesMap[cid] || '不明な服'}
                  </span>
                ))}
              </div>
              {record.note && (
                <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 8 }}>{record.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
