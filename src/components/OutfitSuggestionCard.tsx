'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClothingItem, Outfit } from '@/types/fashion'
import {
  recordOutfitSwipeAction,
  confirmTodayOutfitAction,
  resetTodayOutfitAction,
} from './outfit-suggestion-actions'

interface OutfitSuggestion {
  suggestion: string
  reason: string
  items: string[]
  itemIds: string[]
  layerHint?: string
  /** クローゼットに足りないカテゴリ（UI で「登録すると幅が広がる」ガイド表示用） */
  missingCategories?: string[]
}

type ItemStatus = 'pending' | 'fixed' | 'rejected'

interface Props {
  clothes: ClothingItem[]
  tpo: string
  eventId?: string | null
  onRefresh?: () => void
  // 今日確定済みのコーデ。あれば「確定済みビュー」を表示する。
  todayOutfit?: Outfit | null
}

// ドラフト（確定前の状態）を localStorage に保存するキー
const DRAFT_KEY = 'stylemate:outfit-draft'

interface DraftPayload {
  date: string // YYYY-MM-DD
  suggestion: OutfitSuggestion
  itemStatus: Record<string, ItemStatus>
  weather?: { description?: string; temperature?: number } | null
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function OutfitSuggestionCard({ clothes, tpo, eventId, todayOutfit }: Props) {
  const router = useRouter()
  const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  // アイテムごとの状態
  const [itemStatus, setItemStatus] = useState<Record<string, ItemStatus>>({})
  // 採用済 (確定保存済) フラグ
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  // 直近の weather (確定時に保存用)
  const [lastWeather, setLastWeather] = useState<{ description?: string; temperature?: number } | null>(null)
  const [resetting, setResetting] = useState(false)
  // ドラフトを localStorage から復元
  const [draftLoaded, setDraftLoaded] = useState(false)

  // 初回マウント時：localStorage からドラフトを復元（今日のものだけ）
  useEffect(() => {
    if (todayOutfit) {
      setDraftLoaded(true)
      return
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as DraftPayload
        if (draft.date === todayStr() && draft.suggestion?.itemIds?.length > 0) {
          setSuggestion(draft.suggestion)
          setItemStatus(draft.itemStatus || {})
          setLastWeather(draft.weather || null)
        } else {
          // 日付が違うので破棄
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch {
      // 破損データは捨てる
      localStorage.removeItem(DRAFT_KEY)
    }
    setDraftLoaded(true)
  }, [todayOutfit])

  // suggestion or itemStatus が変わったら localStorage を更新
  useEffect(() => {
    if (!draftLoaded) return
    if (todayOutfit) return // 確定済みなら保存しない
    if (!suggestion) {
      localStorage.removeItem(DRAFT_KEY)
      return
    }
    const payload: DraftPayload = {
      date: todayStr(),
      suggestion,
      itemStatus,
      weather: lastWeather,
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    } catch {
      // 容量オーバー等は無視
    }
  }, [suggestion, itemStatus, lastWeather, draftLoaded, todayOutfit])

  const fetchSuggestion = async (opts?: {
    fixedItemIds?: string[]
    excludedItemIds?: string[]
  }) => {
    setLoading(true)
    setConfirmed(false)
    setConfirmError('')
    try {
      // 天気を取得（位置情報があれば使う）
      const w = await new Promise<{ description?: string; temperature?: number } | null>((resolve) => {
        const tryFetch = async (lat?: number, lon?: number) => {
          const url =
            lat !== undefined && lon !== undefined
              ? `/api/weather?lat=${lat}&lon=${lon}`
              : `/api/weather`
          try {
            const r = await fetch(url)
            const d = await r.json()
            resolve(d.error ? null : d)
          } catch {
            resolve(null)
          }
        }
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => tryFetch(pos.coords.latitude, pos.coords.longitude),
            () => tryFetch(),
            { timeout: 5000, maximumAge: 600_000 }
          )
        } else {
          tryFetch()
        }
      })
      setLastWeather(w)

      const res = await fetch('/api/ai-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clothes,
          weather: w,
          tpo,
          eventId,
          fixedItemIds: opts?.fixedItemIds,
          excludedItemIds: opts?.excludedItemIds,
        }),
      })
      const data = (await res.json()) as OutfitSuggestion
      setSuggestion(data)
      // 新しい提案の status を初期化（固定アイテムは継続、それ以外は pending）
      const nextStatus: Record<string, ItemStatus> = {}
      for (const id of data.itemIds || []) {
        nextStatus[id] = opts?.fixedItemIds?.includes(id) ? 'fixed' : 'pending'
      }
      setItemStatus(nextStatus)
    } catch {
      setSuggestion({
        suggestion: '提案の取得に失敗しました。再試行してください。',
        reason: '',
        items: [],
        itemIds: [],
      })
    } finally {
      setLoading(false)
    }
  }

  // アイテムの固定/却下/解除
  const handleFix = async (item: ClothingItem) => {
    setItemStatus((p) => ({ ...p, [item.id]: 'fixed' }))
    // 嗜好学習に like 記録（画像があるときだけ）
    if (item.image_url) {
      void recordOutfitSwipeAction({
        image_url: item.image_url,
        item_name: item.name,
        brand: item.brand,
        liked: true,
      })
    }
  }
  const handleReject = async (item: ClothingItem) => {
    setItemStatus((p) => ({ ...p, [item.id]: 'rejected' }))
    if (item.image_url) {
      void recordOutfitSwipeAction({
        image_url: item.image_url,
        item_name: item.name,
        brand: item.brand,
        liked: false,
      })
    }
  }
  const handleReset = (item: ClothingItem) => {
    setItemStatus((p) => ({ ...p, [item.id]: 'pending' }))
  }

  // 「却下したのを差し替えて再提案」
  const handleRefreshRejected = () => {
    if (!suggestion) return
    const fixedIds: string[] = []
    const excludedIds: string[] = []
    for (const id of suggestion.itemIds) {
      const s = itemStatus[id]
      if (s === 'fixed') fixedIds.push(id)
      if (s === 'rejected') excludedIds.push(id)
    }
    fetchSuggestion({ fixedItemIds: fixedIds, excludedItemIds: excludedIds })
  }

  // 「今日の服に決定」
  const handleConfirm = async () => {
    if (!suggestion) return
    setConfirming(true)
    setConfirmError('')
    // 固定 or pending のアイテムを保存（却下は除く）
    const clothIds = suggestion.itemIds.filter((id) => itemStatus[id] !== 'rejected')
    const result = await confirmTodayOutfitAction({
      cloth_ids: clothIds,
      tpo,
      weather: lastWeather?.description,
      temperature: lastWeather?.temperature,
    })
    if (result.ok) {
      setConfirmed(true)
      // ドラフトはもう要らない
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      // 確定済みビューに切り替えるためサーバーから再取得
      router.refresh()
    } else {
      setConfirmError(result.error || '保存に失敗しました')
    }
    setConfirming(false)
  }

  // 今日確定済みコーデを「変更する」（既存を削除して再提案フローに戻る）
  const handleResetTodayOutfit = async () => {
    if (!todayOutfit) return
    if (!confirm('今日のコーデをリセットして新しく提案しますか？')) return
    setResetting(true)
    const result = await resetTodayOutfitAction(todayOutfit.id)
    setResetting(false)
    if (result.ok) {
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      router.refresh()
    } else {
      alert(result.error || 'リセットに失敗しました')
    }
  }

  // 全部固定状態かどうか
  const itemIds = suggestion?.itemIds || []
  const allDecided = itemIds.length > 0 && itemIds.every(
    (id) => itemStatus[id] === 'fixed' || itemStatus[id] === 'rejected'
  )
  const hasRejected = itemIds.some((id) => itemStatus[id] === 'rejected')
  const fixedCount = itemIds.filter((id) => itemStatus[id] === 'fixed').length

  // ─── 今日確定済みビュー ───
  if (todayOutfit) {
    const items = (todayOutfit.cloth_ids || [])
      .map((id) => clothes.find((c) => c.id === id))
      .filter((c): c is ClothingItem => !!c)
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #E8FBF1 0%, #F5FFF9 100%)',
          borderRadius: 20,
          padding: 16,
          boxShadow: '0 4px 20px rgba(52,211,153,0.15)',
          border: '2px solid #6EE7B7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.2rem' }}>✓</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10B981' }}>
            今日のコーデ 確定済み
          </span>
        </div>

        {/* コラージュ（全アイテムを固定扱いで表示） */}
        <CollageView
          items={items}
          statusMap={Object.fromEntries(items.map((it) => [it.id, 'fixed' as ItemStatus]))}
        />

        {/* アイテム一覧（参照のみ） */}
        {items.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: '0.78rem', color: '#10B981', marginBottom: 8, fontWeight: 700 }}>
              着る服（{items.length}点）
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#fff',
                    border: '2px solid #6EE7B7',
                    borderRadius: 12,
                    padding: 8,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#FFF0F6',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.image_url} alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : <span style={{ fontSize: '1.3rem' }}>👗</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    {item.brand && <div style={{ fontSize: '0.66rem', color: '#999' }}>{item.brand}</div>}
                  </div>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayOutfit.note && (
          <p style={{ color: '#666', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 10 }}>
            📝 {todayOutfit.note}
          </p>
        )}

        <button
          onClick={handleResetTodayOutfit}
          disabled={resetting}
          style={{
            width: '100%',
            background: '#fff',
            color: '#C4779B',
            border: '2px solid #E8A0BF',
            borderRadius: 18,
            padding: 10,
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: resetting ? 'wait' : 'pointer',
          }}
        >
          {resetting ? '処理中…' : '🔄 新しいコーデで提案し直す'}
        </button>
        <p style={{ fontSize: '0.66rem', color: '#999', textAlign: 'center', marginTop: 6 }}>
          このコーデは {todayOutfit.worn_at} の着用記録として保存されています
        </p>
      </div>
    )
  }

  // ─── 初期表示 ───
  if (!suggestion && !loading) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
          border: '1px solid #FFE4F0',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✨</div>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 16 }}>
          AI が今日の天気・シーンから最適なコーデを提案します
        </p>
        <button
          onClick={() => fetchSuggestion()}
          style={{
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            borderRadius: 24,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(232,160,191,0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          コーデを提案してもらう
        </button>
      </div>
    )
  }

  // ─── ローディング ───
  if (loading) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>👗</div>
        <p style={{ color: '#C4779B', fontWeight: 600 }}>AI がコーデを考え中…</p>
        <p style={{ color: '#bbb', fontSize: '0.72rem', marginTop: 6 }}>
          天気・気温・あなたの服を考慮中
        </p>
      </div>
    )
  }

  // 提案アイテムの ClothingItem 配列（順序維持）
  const suggestedItems = (suggestion?.itemIds || [])
    .map((id) => clothes.find((c) => c.id === id))
    .filter((c): c is ClothingItem => !!c)

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fff 0%, #FFF5F8 100%)',
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 4px 20px rgba(232,160,191,0.15)',
        border: '1px solid #FFE4F0',
      }}
    >
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C4779B' }}>
          AI コーデ提案
        </span>
      </div>

      {/* ① 一番上：服画像コラージュ（仮の「自分が着たイメージ」） */}
      <CollageView items={suggestedItems} statusMap={itemStatus} />

      {/* ② 中段：アイテムカード縦並び（固定/却下ボタン付き） */}
      {suggestedItems.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontSize: '0.78rem',
              color: '#999',
              marginBottom: 8,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>使うアイテム（{fixedCount}/{suggestedItems.length} 固定）</span>
            <span style={{ fontSize: '0.68rem', color: '#bbb' }}>👍固定 / 👎却下</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                status={itemStatus[item.id] || 'pending'}
                onFix={() => handleFix(item)}
                onReject={() => handleReject(item)}
                onReset={() => handleReset(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ③ 下段：説明文（軽く） */}
      <div style={{ marginBottom: 12 }}>
        {suggestion?.layerHint && (
          <div
            style={{
              background: '#FFF0F6',
              borderLeft: '3px solid #C4779B',
              padding: '6px 10px',
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: '0.65rem', color: '#C4779B', fontWeight: 700, marginBottom: 2 }}>
              🧥 中身レイヤー
            </div>
            <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5, margin: 0 }}>
              {suggestion.layerHint}
            </p>
          </div>
        )}
        <p style={{ color: '#666', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
          {suggestion?.suggestion}
        </p>
        {suggestion?.reason && (
          <p style={{ fontSize: '0.7rem', color: '#bbb', lineHeight: 1.5, marginTop: 4 }}>
            💡 {suggestion.reason}
          </p>
        )}
      </div>

      {/* クローゼットの不足カテゴリ案内（提案が薄かった本質的な原因の可視化） */}
      {suggestion?.missingCategories && suggestion.missingCategories.length > 0 && (
        <div
          style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B38600', marginBottom: 4 }}>
            💡 もっと豊かなコーデにするには
          </div>
          <p style={{ fontSize: '0.72rem', color: '#7B5B00', lineHeight: 1.6, margin: 0, marginBottom: 8 }}>
            <b>{suggestion.missingCategories.join('・')}</b>がクローゼットに未登録です。登録するとコーデの幅が広がります。
          </p>
          <a
            href="/register"
            style={{
              display: 'inline-block',
              background: '#fff',
              border: '1.5px solid #FFC107',
              color: '#B38600',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            + 服を登録する
          </a>
        </div>
      )}

      {/* アクションボタン */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 却下があれば「差し替えて再提案」 */}
        {hasRejected && (
          <button
            onClick={handleRefreshRejected}
            disabled={loading}
            style={{
              width: '100%',
              background: '#fff',
              color: '#4A6FD6',
              border: '2px solid #6B8FE8',
              borderRadius: 18,
              padding: 10,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🔄 却下したのを差し替えて再提案
          </button>
        )}
        {/* 全部判断済みなら「今日の服に決定」 */}
        <button
          onClick={handleConfirm}
          disabled={!allDecided || confirming || confirmed}
          style={{
            width: '100%',
            background: confirmed
              ? 'linear-gradient(135deg, #6ee7b7, #34d399)'
              : allDecided
              ? 'linear-gradient(135deg, #E8A0BF, #C4779B)'
              : '#eee',
            color: allDecided || confirmed ? '#fff' : '#bbb',
            border: 'none',
            borderRadius: 18,
            padding: 12,
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: allDecided && !confirming ? 'pointer' : 'not-allowed',
            opacity: allDecided || confirmed ? 1 : 0.6,
          }}
        >
          {confirmed
            ? '✓ 今日のコーデに保存しました！'
            : confirming
            ? '保存中…'
            : allDecided
            ? '✅ 今日の服に決定'
            : `全アイテムを判断してください（残${itemIds.length - itemIds.filter((id) => itemStatus[id] === 'fixed' || itemStatus[id] === 'rejected').length}）`}
        </button>
        {confirmError && (
          <p style={{ color: '#d63384', fontSize: '0.72rem', textAlign: 'center' }}>
            {confirmError}
          </p>
        )}
        {/* 全部やり直し */}
        <button
          onClick={() => fetchSuggestion()}
          disabled={loading}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#bbb',
            border: 'none',
            padding: 4,
            fontSize: '0.72rem',
            cursor: 'pointer',
          }}
        >
          全部やり直して別のコーデを見る
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────
// コラージュビュー（仮の「着たイメージ」）
// 服画像を重ね合わせて1つのビジュアルに見せる
// 将来：LoRA + IDM-VTON で実際の本人合成画像に差し替え
// ─────────────────────────────
function CollageView({
  items,
  statusMap,
}: {
  items: ClothingItem[]
  statusMap: Record<string, ItemStatus>
}) {
  // 却下されたアイテムは半透明で薄く
  const visibleItems = items.filter((it) => statusMap[it.id] !== 'rejected')

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #FFF0F6 0%, #FFE4F0 100%)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        position: 'relative',
        minHeight: 180,
        overflow: 'hidden',
      }}
    >
      {/* 上部ラベル */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          fontSize: '0.65rem',
          color: '#C4779B',
          fontWeight: 700,
          letterSpacing: 1,
          zIndex: 2,
        }}
      >
        👤 着たイメージ（Preview）
      </div>
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          fontSize: '0.6rem',
          color: '#999',
          background: '#fff',
          padding: '2px 8px',
          borderRadius: 10,
          zIndex: 2,
        }}
      >
        本人合成は近日公開
      </div>

      {/* コラージュ：服画像を重ねて並べる */}
      {visibleItems.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingTop: 20,
            flexWrap: 'wrap',
          }}
        >
          {visibleItems.map((item, i) => (
            <div
              key={item.id}
              style={{
                width: 90,
                height: 120,
                background: '#fff',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(196,121,155,0.25)',
                transform: `rotate(${(i - (visibleItems.length - 1) / 2) * 4}deg)`,
                transition: 'transform 0.3s',
                border: statusMap[item.id] === 'fixed' ? '3px solid #34D399' : '2px solid #fff',
              }}
            >
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    background: '#FFF0F6',
                  }}
                >
                  👗
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            paddingTop: 40,
            textAlign: 'center',
            color: '#C4779B',
            fontSize: '0.85rem',
          }}
        >
          全部却下されました。再提案してください
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────
// アイテム行（画像 + 名前 + 固定/却下ボタン）
// ─────────────────────────────
function ItemRow({
  item,
  status,
  onFix,
  onReject,
  onReset,
}: {
  item: ClothingItem
  status: ItemStatus
  onFix: () => void
  onReject: () => void
  onReset: () => void
}) {
  const bg =
    status === 'fixed'
      ? '#E8FBF1'
      : status === 'rejected'
      ? '#FFEAEA'
      : '#fff'
  const border =
    status === 'fixed'
      ? '2px solid #34D399'
      : status === 'rejected'
      ? '2px solid #F87171'
      : '1px solid #FFE4F0'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: bg,
        border,
        borderRadius: 12,
        padding: 8,
        opacity: status === 'rejected' ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* サムネ */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#FFF0F6',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1.4rem' }}>👗</span>
        )}
      </div>

      {/* 名前・ブランド */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.82rem',
            color: '#333',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        {item.brand && (
          <div style={{ fontSize: '0.66rem', color: '#999' }}>{item.brand}</div>
        )}
      </div>

      {/* ボタン群 */}
      {status === 'pending' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onFix}
            style={{
              background: '#fff',
              border: '2px solid #34D399',
              color: '#10B981',
              borderRadius: 18,
              padding: '6px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            aria-label="固定"
          >
            👍 固定
          </button>
          <button
            onClick={onReject}
            style={{
              background: '#fff',
              border: '2px solid #F87171',
              color: '#EF4444',
              borderRadius: 18,
              padding: '6px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            aria-label="却下"
          >
            👎 却下
          </button>
        </div>
      )}
      {status !== 'pending' && (
        <button
          onClick={onReset}
          style={{
            background: 'transparent',
            border: 'none',
            color: status === 'fixed' ? '#10B981' : '#EF4444',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {status === 'fixed' ? '✓ 固定中' : '✕ 却下中'}
          <br />
          <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>取り消し</span>
        </button>
      )}
    </div>
  )
}
