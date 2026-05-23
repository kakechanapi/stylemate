'use client'
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EventItem } from '@/lib/events'
import type { Outfit } from '@/types/fashion'
import { deleteEventAction } from '@/app/events/actions'
import { deleteOutfitAction } from '@/app/outfits/actions'

interface Props {
  events: EventItem[]
  outfits: Outfit[]
  clothesMap: Record<string, { name: string; image_url?: string }>
  friendNames: Record<string, string>
  initialMonth?: string // "YYYY-MM"
}

const LONG_PRESS_MS = 500

export default function CalendarHybridView({
  events,
  outfits,
  clothesMap,
  friendNames,
  initialMonth,
}: Props) {
  const router = useRouter()
  const today = new Date()
  const initial = initialMonth ? new Date(`${initialMonth}-01T00:00:00`) : today
  const [currentMonth, setCurrentMonth] = useState(initial)
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(today))
  const [, startTransition] = useTransition()

  // 横スワイプ（指追従式）で月切替
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)
  const calContainerRef = useRef<HTMLDivElement | null>(null)
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(false)
  const isHSwipe = useRef(false) // 横スワイプ確定フラグ

  // 月情報
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 日付別マップ
  const eventsByDate: Record<string, EventItem[]> = {}
  events.forEach((e) => {
    const d = toDateStr(new Date(e.starts_at))
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(e)
  })

  const outfitsByDate: Record<string, Outfit[]> = {}
  outfits.forEach((o) => {
    if (!outfitsByDate[o.worn_at]) outfitsByDate[o.worn_at] = []
    outfitsByDate[o.worn_at].push(o)
  })

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setCurrentMonth(next)
    const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    // 表示中の月が変わったらサーバ側で再取得（前後1月キャッシュなので隣月ならインスタント）
    router.push(`/events?month=${ym}`)
  }
  const prevMonth = () => changeMonth(-1)
  const nextMonth = () => changeMonth(1)

  const dayEvents = eventsByDate[selectedDate] || []
  const dayOutfits = outfitsByDate[selectedDate] || []

  return (
    <>
      {/* 月ナビ */}
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
          style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 12px', cursor: 'pointer', border: 'none' }}
        >
          ‹
        </button>
        <span style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
          {year}年 {month + 1}月
        </span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', color: '#C4779B', fontSize: '1.2rem', padding: '4px 12px', cursor: 'pointer', border: 'none' }}
        >
          ›
        </button>
      </div>

      {/* カレンダー（iOS式 3ヶ月ストリップ・指追従ページング） */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 12,
          boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        {/* 曜日ヘッダ（固定） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : '#999',
                padding: 4,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 3ヶ月ストリップ（prev / current / next） */}
        <div
          ref={calContainerRef}
          onTouchStart={(e) => {
            if (animating) return
            swipeStartX.current = e.touches[0].clientX
            swipeStartY.current = e.touches[0].clientY
            isHSwipe.current = false
          }}
          onTouchMove={(e) => {
            if (swipeStartX.current === null || swipeStartY.current === null) return
            const dx = e.touches[0].clientX - swipeStartX.current
            const dy = e.touches[0].clientY - swipeStartY.current
            if (!isHSwipe.current) {
              if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                isHSwipe.current = true
              } else if (Math.abs(dy) > 8) {
                swipeStartX.current = null
                swipeStartY.current = null
                return
              }
            }
            if (isHSwipe.current) {
              setDragX(dx)
            }
          }}
          onTouchEnd={() => {
            if (!isHSwipe.current) {
              swipeStartX.current = null
              swipeStartY.current = null
              return
            }
            const width = calContainerRef.current?.offsetWidth || 320
            const threshold = width * 0.2 // 20%以上でページング
            setAnimating(true)
            if (dragX > threshold) {
              // 前月へ：右にフルスライド
              setDragX(width)
              setTimeout(() => {
                prevMonth()
                setDragX(0)
                setAnimating(false)
              }, 260)
            } else if (dragX < -threshold) {
              // 次月へ：左にフルスライド
              setDragX(-width)
              setTimeout(() => {
                nextMonth()
                setDragX(0)
                setAnimating(false)
              }, 260)
            } else {
              // スプリングバック
              setDragX(0)
              setTimeout(() => setAnimating(false), 200)
            }
            swipeStartX.current = null
            swipeStartY.current = null
            isHSwipe.current = false
          }}
          onTouchCancel={() => {
            setAnimating(true)
            setDragX(0)
            setTimeout(() => setAnimating(false), 200)
            swipeStartX.current = null
            swipeStartY.current = null
            isHSwipe.current = false
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'pan-y',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '300%',
              transform: `translateX(calc(-33.3333% + ${dragX}px))`,
              transition: animating ? 'transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
              willChange: 'transform',
            }}
          >
            <MonthGrid
              year={year}
              month={month - 1}
              today={today}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              outfitsByDate={outfitsByDate}
              onSelectDate={setSelectedDate}
            />
            <MonthGrid
              year={year}
              month={month}
              today={today}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              outfitsByDate={outfitsByDate}
              onSelectDate={setSelectedDate}
            />
            <MonthGrid
              year={year}
              month={month + 1}
              today={today}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              outfitsByDate={outfitsByDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        </div>

        {/* 凡例 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            fontSize: '0.66rem',
            color: '#999',
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid #FFE4F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA', display: 'inline-block' }} />
            予定
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4779B', display: 'inline-block' }} />
            着用記録
          </div>
        </div>
      </div>

      {/* 選択日の詳細 */}
      <div style={{ marginBottom: 8 }}>
        <h2
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#333',
            marginBottom: 10,
          }}
        >
          {formatJp(selectedDate)}
        </h2>

        {/* 予定 */}
        {dayEvents.length > 0 && (
          <Section title="予定" color="#60A5FA">
            {dayEvents.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                friendNames={friendNames}
                onEdit={() => router.push(`/events/${e.id}/edit`)}
                onDelete={() => {
                  if (!confirm('この予定を削除しますか？')) return
                  startTransition(async () => {
                    await deleteEventAction(e.id)
                    router.refresh()
                  })
                }}
              />
            ))}
          </Section>
        )}

        {/* 着た服 */}
        {dayOutfits.length > 0 && (
          <Section title="着た服" color="#C4779B">
            {dayOutfits.map((o) => (
              <OutfitRow
                key={o.id}
                outfit={o}
                clothesMap={clothesMap}
                friendNames={friendNames}
                onEdit={() => router.push(`/outfits/${o.id}/edit`)}
                onDelete={() => {
                  if (!confirm('この記録を削除しますか？')) return
                  startTransition(async () => {
                    await deleteOutfitAction(o.id)
                    router.refresh()
                  })
                }}
              />
            ))}
          </Section>
        )}

        {dayEvents.length === 0 && dayOutfits.length === 0 && (
          <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
            この日は予定も記録もありません
          </p>
        )}
      </div>
    </>
  )
}

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: '0.7rem',
          color,
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function EventRow({
  event,
  friendNames,
  onEdit,
  onDelete,
}: {
  event: EventItem
  friendNames: Record<string, string>
  onEdit: () => void
  onDelete: () => void
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const startLP = () => {
    longPressTimer.current = setTimeout(() => setMenuOpen(true), LONG_PRESS_MS)
  }
  const cancelLP = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const time = new Date(event.starts_at).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const friends = (event.friend_ids || []).map((id) => friendNames[id]).filter(Boolean)

  return (
    <>
      <div
        onClick={() => setMenuOpen(true)}
        onMouseDown={startLP}
        onMouseUp={cancelLP}
        onMouseLeave={cancelLP}
        onTouchStart={startLP}
        onTouchEnd={cancelLP}
        onTouchCancel={cancelLP}
        style={{
          background: '#fff',
          border: '1px solid #BAD7E9',
          borderRadius: 10,
          padding: 10,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 700, marginBottom: 2 }}>
          {time}
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#333' }}>{event.title}</div>
        {friends.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
            👤 {friends.join('、')}
          </div>
        )}
      </div>

      {menuOpen && (
        <ActionSheet
          title={event.title}
          onClose={() => setMenuOpen(false)}
          actions={[
            { label: '編集', onClick: onEdit },
            { label: '削除', onClick: onDelete, danger: true },
          ]}
        />
      )}
    </>
  )
}

function OutfitRow({
  outfit,
  clothesMap,
  friendNames,
  onEdit,
  onDelete,
}: {
  outfit: Outfit
  clothesMap: Record<string, { name: string; image_url?: string }>
  friendNames: Record<string, string>
  onEdit: () => void
  onDelete: () => void
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const startLP = () => {
    longPressTimer.current = setTimeout(() => setMenuOpen(true), LONG_PRESS_MS)
  }
  const cancelLP = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const friends = (outfit.met_with_friend_ids || []).map((id) => friendNames[id]).filter(Boolean)

  return (
    <>
      <div
        onClick={() => setMenuOpen(true)}
        onMouseDown={startLP}
        onMouseUp={cancelLP}
        onMouseLeave={cancelLP}
        onTouchStart={startLP}
        onTouchEnd={cancelLP}
        onTouchCancel={cancelLP}
        style={{
          background: '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 10,
          padding: 10,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          {outfit.cloth_ids.slice(0, 4).map((cid) => {
            const c = clothesMap[cid]
            if (!c) return null
            return (
              <div
                key={cid}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: '#FFF0F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
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
                  <span style={{ fontSize: '1rem' }}>👗</span>
                )}
              </div>
            )
          })}
          {outfit.cloth_ids.length > 4 && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: '#FFE4F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: '#C4779B',
                fontWeight: 700,
              }}
            >
              +{outfit.cloth_ids.length - 4}
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#666' }}>
          {outfit.cloth_ids.length} 点
          {friends.length > 0 && <> · 👤 {friends.join('、')}</>}
          {outfit.tpo && <> · {outfit.tpo}</>}
        </div>
        {outfit.note && (
          <p style={{ fontSize: '0.72rem', color: '#999', marginTop: 4 }}>{outfit.note}</p>
        )}
      </div>

      {menuOpen && (
        <ActionSheet
          title="着用記録"
          onClose={() => setMenuOpen(false)}
          actions={[
            { label: '編集（詳細を見る）', onClick: onEdit },
            { label: '削除', onClick: onDelete, danger: true },
          ]}
        />
      )}
    </>
  )
}

function ActionSheet({
  title,
  actions,
  onClose,
}: {
  title: string
  actions: { label: string; onClick: () => void; danger?: boolean }[]
  onClose: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
      />
      <div
        style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 100,
          zIndex: 51,
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          maxWidth: 460,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #F5C6D8',
            fontSize: '0.85rem',
            color: '#333',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => {
              onClose()
              a.onClick()
            }}
            style={{
              width: '100%',
              padding: 16,
              background: 'transparent',
              border: 'none',
              borderTop: i === 0 ? 'none' : '1px solid #F5C6D8',
              color: a.danger ? '#d63384' : '#333',
              fontSize: '0.95rem',
              fontWeight: a.danger ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 16,
            background: '#FFF5F8',
            border: 'none',
            borderTop: '1px solid #F5C6D8',
            color: '#666',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          キャンセル
        </button>
      </div>
    </>
  )
}

// ─── MonthGrid（1ヶ月分の日付グリッド） ───
function MonthGrid({
  year,
  month, // 0-11（範囲外OK、Dateで正規化される）
  today,
  selectedDate,
  eventsByDate,
  outfitsByDate,
  onSelectDate,
}: {
  year: number
  month: number
  today: Date
  selectedDate: string
  eventsByDate: Record<string, EventItem[]>
  outfitsByDate: Record<string, Outfit[]>
  onSelectDate: (s: string) => void
}) {
  // 月を正規化（month=-1 → 前年12月、month=12 → 翌年1月）
  const normalizedFirst = new Date(year, month, 1)
  const ny = normalizedFirst.getFullYear()
  const nm = normalizedFirst.getMonth()
  const firstDay = normalizedFirst.getDay()
  const daysInMonth = new Date(ny, nm + 1, 0).getDate()

  return (
    <div style={{ width: '33.3333%', flexShrink: 0, padding: '0 2px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEvent = !!eventsByDate[dateStr]
          const hasOutfit = !!outfitsByDate[dateStr]
          const isToday = isSameDay(today, new Date(ny, nm, day))
          const isSelected = dateStr === selectedDate
          const dayOfWeek = (firstDay + i) % 7
          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                padding: 0,
                borderRadius: 8,
                background: isSelected
                  ? 'linear-gradient(135deg, #E8A0BF, #C4779B)'
                  : isToday
                    ? '#FFF0F6'
                    : 'transparent',
                border: isToday && !isSelected ? '2px solid #E8A0BF' : '2px solid transparent',
                color: isSelected
                  ? '#fff'
                  : isToday
                    ? '#C4779B'
                    : dayOfWeek === 0
                      ? '#F87171'
                      : dayOfWeek === 6
                        ? '#60A5FA'
                        : '#333',
                fontSize: '0.85rem',
                fontWeight: isToday || isSelected ? 700 : 400,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <span>{day}</span>
              <div style={{ display: 'flex', gap: 2, height: 4 }}>
                {hasEvent && (
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: isSelected ? '#fff' : '#60A5FA',
                    }}
                  />
                )}
                {hasOutfit && (
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: isSelected ? '#fff' : '#C4779B',
                    }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── helpers ───
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function formatJp(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}
