'use client'
import { useState } from 'react'
import Link from 'next/link'
import WeatherWidget from '@/components/WeatherWidget'
import TPOSelector from '@/components/TPOSelector'
import OutfitSuggestionCard from '@/components/OutfitSuggestionCard'
import { ClothingItem, Outfit } from '@/types/fashion'
import type { EventItem } from '@/lib/events'

interface Props {
  clothes: ClothingItem[]
  userEmail: string | null
  upcomingEvents: EventItem[]
  friendNames: Record<string, string>
  todayOutfit: Outfit | null
  isAdmin?: boolean
}

export default function HomeClient({ clothes, userEmail, upcomingEvents, friendNames, todayOutfit, isAdmin }: Props) {
  const [tpo, setTpo] = useState('casual')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    upcomingEvents[0]?.id || null
  )

  const today = new Date().toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const isEmptyCloset = clothes.length === 0
  const selectedEvent = upcomingEvents.find((e) => e.id === selectedEventId) || null

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>{today}</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>今日のコーデ 👗</h1>
        </div>
        <Link
          href="/my"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {(userEmail?.[0] || '?').toUpperCase()}
        </Link>
      </div>

      {/* Weather */}
      <div style={{ marginBottom: 16 }}>
        <WeatherWidget />
      </div>

      {/* これからの予定 */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#999',
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            これからの予定
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingEvents.map((e) => {
              const date = new Date(e.starts_at)
              const dateStr = date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              const friendsText = (e.friend_ids || [])
                .map((id) => friendNames[id])
                .filter(Boolean)
                .join(', ')
              const active = e.id === selectedEventId
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEventId(active ? null : e.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: active ? 'linear-gradient(135deg, #FFF0F6, #FFE4F0)' : '#fff',
                    border: `2px solid ${active ? '#E8A0BF' : '#FFE4F0'}`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '1.2rem' }}>{active ? '✓' : '📅'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#333' }}>
                      {e.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                      {dateStr}
                      {friendsText && <> · {friendsText}</>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {selectedEvent && (
            <p
              style={{
                fontSize: '0.72rem',
                color: '#C4779B',
                marginTop: 6,
                paddingLeft: 4,
                fontWeight: 600,
              }}
            >
              ✨ この予定に合わせたコーデを提案します
            </p>
          )}
        </div>
      )}

      {/* シーン選択（予定が選ばれてなければ手動選択） */}
      {!selectedEvent && (
        <div
          style={{
            marginBottom: 20,
            background: '#fff',
            border: '1px solid #FFE4F0',
            borderRadius: 16,
            padding: 14,
            boxShadow: '0 2px 8px rgba(232,160,191,0.08)',
          }}
        >
          <TPOSelector selected={tpo} onChange={setTpo} />
        </div>
      )}

      {/* AI Outfit Suggestion or empty state */}
      {isEmptyCloset ? (
        <div
          style={{
            background: '#fff',
            border: '2px dashed #F5C6D8',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👗</div>
          <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: 16, lineHeight: 1.6 }}>
            まずクローゼットに服を登録しましょう。
            <br />
            登録した服から AI がコーデを提案します。
          </p>
          <Link
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
          </Link>
        </div>
      ) : (
        <OutfitSuggestionCard
          clothes={clothes}
          tpo={selectedEvent?.tpo || tpo}
          eventId={selectedEvent?.id}
          todayOutfit={todayOutfit}
          sceneLabel={selectedEvent ? selectedEvent.title : undefined}
          isAdmin={isAdmin}
        />
      )}

      {/* Quick actions */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* メイン：今日のコーデを記録（被り回避AIの学習源） */}
        {!isEmptyCloset && (
          <Link
            href="/outfits/new"
            style={{
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              borderRadius: 16,
              padding: 14,
              textAlign: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(196,121,155,0.3)',
            }}
          >
            ✍ 今日のコーデを手動で記録する
          </Link>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/register"
            style={{
              flex: 1,
              background: '#fff',
              border: '2px solid #E8A0BF',
              borderRadius: 16,
              padding: 12,
              textAlign: 'center',
              color: '#C4779B',
              fontWeight: 700,
              fontSize: '0.82rem',
              textDecoration: 'none',
            }}
          >
            ＋ 服を登録
          </Link>
          <Link
            href="/events/new"
            style={{
              flex: 1,
              background: '#fff',
              border: '2px solid #E8A0BF',
              borderRadius: 16,
              padding: 12,
              textAlign: 'center',
              color: '#C4779B',
              fontWeight: 700,
              fontSize: '0.82rem',
              textDecoration: 'none',
            }}
          >
            📅 予定を追加
          </Link>
          <Link
            href="/style"
            style={{
              flex: 1,
              background: '#fff',
              border: '2px solid #E8A0BF',
              borderRadius: 16,
              padding: 12,
              textAlign: 'center',
              color: '#C4779B',
              fontWeight: 700,
              fontSize: '0.82rem',
              textDecoration: 'none',
            }}
          >
            💞 好み学習
          </Link>
        </div>
      </div>
    </div>
  )
}
