'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Friend, Relationship, Gender } from '@/types/fashion'
import type { FriendWithMeta } from '@/lib/friends'
import { deleteFriendAction } from '@/app/friends/actions'

// 関係性ごとの色 & 絵文字
const RELATION_STYLE: Record<Relationship, { bg: string; color: string; emoji: string }> = {
  '友達': { bg: '#E8F0FF', color: '#4A6FD6', emoji: '👫' },
  '家族': { bg: '#E6F9F0', color: '#0E9F6E', emoji: '🏠' },
  '恋人・パートナー': { bg: '#FFE4F0', color: '#C4779B', emoji: '💞' },
  '自分': { bg: '#FFE4F0', color: '#C4779B', emoji: '🪞' },
  'その他': { bg: '#F1F1F1', color: '#666', emoji: '✨' },
}

const GENDER_STYLE: Record<Gender, { symbol: string; color: string } | null> = {
  '男性': { symbol: '♂', color: '#4A6FD6' },
  '女性': { symbol: '♀', color: '#C4779B' },
  '指定しない': null,
}

// 「3週間前」のような相対表示
function relativeDays(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - d.getTime()
  const days = Math.round(diffMs / 86400000)
  if (days < 0) return '未来'
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`
  return `${Math.floor(days / 365)}年前`
}

// 誕生日表示：今日 / N日後 / M/D
function birthdayInfo(bday: string): { text: string; highlight: boolean } {
  // bday: YYYY-MM-DD（年は無視して月日のみ使う）
  const [, mStr, dStr] = bday.split('-')
  const m = parseInt(mStr, 10)
  const d = parseInt(dStr, 10)
  if (Number.isNaN(m) || Number.isNaN(d)) return { text: '', highlight: false }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  let next = new Date(year, m - 1, d)
  if (next < today) next = new Date(year + 1, m - 1, d)
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return { text: `🎂 今日が誕生日！`, highlight: true }
  if (diffDays <= 7) return { text: `🎂 あと${diffDays}日`, highlight: true }
  if (diffDays <= 30) return { text: `🎂 ${m}/${d} (あと${diffDays}日)`, highlight: false }
  return { text: `🎂 ${m}/${d}`, highlight: false }
}

export default function FriendCard({ friend }: { friend: Friend | FriendWithMeta }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    startTransition(async () => {
      await deleteFriendAction(friend.id)
      router.refresh()
    })
  }

  const rel = friend.relationship ? RELATION_STYLE[friend.relationship] : null
  const gen = friend.gender ? GENDER_STYLE[friend.gender] : null
  const bday = friend.birthday ? birthdayInfo(friend.birthday) : null
  const withMeta = friend as FriendWithMeta
  const lastMet = withMeta.last_met_at
  const metCount = withMeta.met_count || 0

  return (
    <Link
      href={`/friends/${friend.id}`}
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(232,160,191,0.12)',
        border: friend.is_me ? '2px solid #E8A0BF' : '1px solid #FFE4F0',
        position: 'relative',
        textDecoration: 'none',
        color: 'inherit',
        opacity: pending ? 0.4 : 1,
        display: 'flex',
        gap: 14,
        padding: 14,
        alignItems: 'flex-start',
      }}
    >
      {/* 削除（右上） */}
      <button
        onClick={handleDelete}
        disabled={pending}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: 'none',
          background: confirming ? '#d63384' : 'rgba(0,0,0,0.35)',
          color: '#fff',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={confirming ? 'もう一度押して削除' : '削除'}
      >
        {confirming ? '?' : '×'}
      </button>

      {/* 丸サムネ */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#FFF0F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {friend.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.thumb_url}
            alt={friend.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '2rem' }}>{friend.is_me ? '🙂' : '👤'}</span>
        )}
      </div>

      {/* 情報エリア */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
        {/* 1段目：名前 + 性別 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}
        >
          <p
            style={{
              fontSize: '1.02rem',
              fontWeight: 800,
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {friend.name}
          </p>
          {gen && (
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: gen.color,
                lineHeight: 1,
              }}
              title={friend.gender}
            >
              {gen.symbol}
            </span>
          )}
        </div>

        {/* 2段目：関係性バッジ + 誕生日 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
            marginBottom: lastMet || friend.note ? 8 : 0,
          }}
        >
          {rel && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: rel.color,
                background: rel.bg,
                borderRadius: 6,
                padding: '3px 8px',
                lineHeight: 1.2,
              }}
            >
              {rel.emoji} {friend.relationship}
            </span>
          )}
          {bday && bday.text && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: bday.highlight ? 800 : 600,
                color: bday.highlight ? '#C4779B' : '#888',
                background: bday.highlight ? '#FFE4F0' : 'transparent',
                borderRadius: 6,
                padding: bday.highlight ? '3px 8px' : '3px 0',
                lineHeight: 1.2,
              }}
            >
              {bday.text}
            </span>
          )}
        </div>

        {/* 3段目：最終会った日 + 会った回数 */}
        {(lastMet || metCount > 0) && (
          <div
            style={{
              fontSize: '0.72rem',
              color: '#888',
              marginBottom: friend.note ? 6 : 0,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            {lastMet ? (
              <>
                <span>🕐 最終: {relativeDays(lastMet)}</span>
                <span style={{ color: '#bbb' }}>·</span>
                <span>{metCount}回</span>
              </>
            ) : (
              <span style={{ color: '#bbb' }}>記録なし</span>
            )}
          </div>
        )}

        {/* 4段目：メモプレビュー */}
        {friend.note && (
          <p
            style={{
              fontSize: '0.74rem',
              color: '#aaa',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontStyle: 'italic',
            }}
          >
            “{friend.note}”
          </p>
        )}
      </div>
    </Link>
  )
}
