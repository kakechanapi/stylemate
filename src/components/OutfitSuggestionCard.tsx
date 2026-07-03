'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ClothingItem, Outfit } from '@/types/fashion'
import { SCENE_LABEL } from './TPOSelector'
import { SERVICE_COSTS_JPY } from '@/lib/usage-cost-constants'
import {
  recordOutfitSwipeAction,
  confirmTodayOutfitAction,
  resetTodayOutfitAction,
} from './outfit-suggestion-actions'

interface OutfitSuggestion {
  theme?: string // 「韓国系クリーンカジュアル」等のテーマ名
  suggestion: string
  reason: string
  items: string[]
  itemIds: string[]
  layerHint?: string
}

interface SuggestionsResponse {
  suggestions: OutfitSuggestion[]
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
  // 表示用のシーン名（予定が選ばれていればその予定名、なければ TPO ラベルから自動算出）
  sceneLabel?: string
  // 管理者かどうか。コーデ試着ベータ機能のボタン表示制御に使う
  isAdmin?: boolean
  // true ならマウント後に自動で提案を開始（オンボーディング直後の魔法演出用）
  autoStart?: boolean
}

interface TryonState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  resultUrl?: string
  error?: string
}

// ドラフト（確定前の状態）を localStorage に保存するキー
const DRAFT_KEY = 'stylemate:outfit-draft'

// 試着1回の単価（円）。UI 表示は必ずここから導出する（ハードコード禁止）
const TRYON_COST_JPY = SERVICE_COSTS_JPY.replicate_tryon

interface DraftPayload {
  date: string // YYYY-MM-DD
  suggestions: OutfitSuggestion[]
  selectedIndex: number | null
  itemStatus: Record<string, ItemStatus>
  weather?: { description?: string; temperature?: number } | null
  missingCategories?: string[]
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function OutfitSuggestionCard({
  clothes,
  tpo,
  eventId,
  todayOutfit,
  sceneLabel,
  isAdmin,
  autoStart,
}: Props) {
  // 表示用シーン名：明示指定があればそれ優先、なければ TPO から
  const displaySceneLabel = sceneLabel || SCENE_LABEL[tpo] || 'コーデ'
  const router = useRouter()
  // 3案を保持。selectedIndex が決まったら詳細モード、null なら3案リスト表示
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [missingCategories, setMissingCategories] = useState<string[]>([])
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
  // コーデ試着（自分姿）の結果。suggestions と同じ index で対応
  const [tryonResults, setTryonResults] = useState<TryonState[]>([])
  const [tryonError, setTryonError] = useState('')
  // 3案リスト → 詳細モードに遷移しても結果を保持。新しい3案が来たら自動リセット
  useEffect(() => {
    setTryonResults((prev) => {
      if (prev.length !== suggestions.length) return suggestions.map(() => ({ status: 'idle' }))
      return prev
    })
  }, [suggestions])

  // 選択中の案（詳細モードで参照）
  const suggestion = selectedIndex !== null ? suggestions[selectedIndex] || null : null

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
        if (draft.date === todayStr() && Array.isArray(draft.suggestions) && draft.suggestions.length > 0) {
          setSuggestions(draft.suggestions)
          setSelectedIndex(draft.selectedIndex)
          setItemStatus(draft.itemStatus || {})
          setLastWeather(draft.weather || null)
          setMissingCategories(draft.missingCategories || [])
        } else {
          // 日付が違う / 旧形式 → 破棄
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch {
      // 破損データは捨てる
      localStorage.removeItem(DRAFT_KEY)
    }
    setDraftLoaded(true)
  }, [todayOutfit])

  // suggestions or itemStatus が変わったら localStorage を更新
  useEffect(() => {
    if (!draftLoaded) return
    if (todayOutfit) return // 確定済みなら保存しない
    if (suggestions.length === 0) {
      localStorage.removeItem(DRAFT_KEY)
      return
    }
    const payload: DraftPayload = {
      date: todayStr(),
      suggestions,
      selectedIndex,
      itemStatus,
      weather: lastWeather,
      missingCategories,
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
    } catch {
      // 容量オーバー等は無視
    }
  }, [suggestions, selectedIndex, itemStatus, lastWeather, missingCategories, draftLoaded, todayOutfit])

  // オンボーディング直後（/?suggest=1）：自動で提案を開始して「魔法」を見せる。
  // ドラフト復元を待ってから判定し、既に提案や確定があれば何もしない
  const autoStartFired = useRef(false)
  useEffect(() => {
    if (!autoStart || autoStartFired.current) return
    if (!draftLoaded || todayOutfit || loading) return
    if (suggestions.length > 0) return
    autoStartFired.current = true
    void fetchSuggestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, draftLoaded, todayOutfit, loading, suggestions.length])

  const fetchSuggestion = async (opts?: {
    fixedItemIds?: string[]
    excludedItemIds?: string[]
    /** 詳細モードで「却下→差し替え再提案」した時 true。結果を1案として詳細モードに直接戻す */
    fromDetailRefresh?: boolean
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
      const data = (await res.json()) as SuggestionsResponse
      const list = Array.isArray(data.suggestions) ? data.suggestions : []
      setSuggestions(list)
      setMissingCategories(data.missingCategories || [])
      // 新しい提案が来たら試着結果は必ずリセットする。
      // 長さ比較の useEffect だけだと「3案→別の3案」で前の自分姿画像が
      // 新しい提案に付いたまま表示されるバグになる
      setTryonResults(list.map(() => ({ status: 'idle' })))
      setTryonError('')
      // 「却下→差し替え再提案」（refresh フロー）は、1案だけ返る想定なので自動で詳細モードへ
      // 新規提案はリスト表示モードから始めて、ユーザーに選ばせる
      if (opts?.fromDetailRefresh && list.length > 0) {
        setSelectedIndex(0)
        const nextStatus: Record<string, ItemStatus> = {}
        for (const id of list[0].itemIds || []) {
          nextStatus[id] = opts?.fixedItemIds?.includes(id) ? 'fixed' : 'pending'
        }
        setItemStatus(nextStatus)
      } else {
        setSelectedIndex(null)
        setItemStatus({})
      }
    } catch {
      setSuggestions([
        {
          suggestion: '提案の取得に失敗しました。再試行してください。',
          reason: '',
          items: [],
          itemIds: [],
        },
      ])
      setSelectedIndex(0)
    } finally {
      setLoading(false)
    }
  }

  // 3案リストから1案選択 → 詳細モードへ
  const handleSelectSuggestion = (idx: number) => {
    setSelectedIndex(idx)
    const picked = suggestions[idx]
    const nextStatus: Record<string, ItemStatus> = {}
    for (const id of picked.itemIds || []) {
      nextStatus[id] = 'pending'
    }
    setItemStatus(nextStatus)
    setConfirmed(false)
    setConfirmError('')
  }

  // 「← 別の案を見る」で 3案リストに戻る
  const handleBackToList = () => {
    setSelectedIndex(null)
    setItemStatus({})
    setConfirmed(false)
    setConfirmError('')
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
    fetchSuggestion({ fixedItemIds: fixedIds, excludedItemIds: excludedIds, fromDetailRefresh: true })
  }

  // 自分姿で試着（管理者ベータ・プログレッシブ）
  // targetIndexes 未指定 → デフォルト A 案のみ。コスト1/3に抑える。
  // 「B/C も見比べる」では [1, 2] を渡す。
  const handleTryon = async (targetIndexes?: number[]) => {
    if (!isAdmin || suggestions.length === 0) return
    const indexes =
      targetIndexes && targetIndexes.length > 0
        ? targetIndexes.filter((i) => i >= 0 && i < suggestions.length)
        : [0]
    setTryonError('')
    const { loadSelfPhoto } = await import('@/lib/self-photo-db')
    const photo = await loadSelfPhoto()
    if (!photo) {
      setTryonError('先にマイページから全身写真を登録してください。')
      return
    }
    // 対象 indexes の代表服を選ぶ：トップス → ワンピース → 画像つき最初の服
    const reps = indexes.map((idx) => {
      const s = suggestions[idx]
      const list = (s?.itemIds || [])
        .map((id) => clothes.find((c) => c.id === id))
        .filter((c): c is ClothingItem => !!c && !!c.image_url)
      return {
        idx,
        rep:
          list.find((c) => c.category === 'tops') ||
          list.find((c) => c.category === 'dress') ||
          list[0] ||
          null,
      }
    })
    const validReps = reps.filter((r) => r.rep)
    if (validReps.length === 0) {
      setTryonError('試着できる画像つきの服が見つかりません。')
      return
    }
    // 対象 indexes だけを loading にする（他は触らない）
    setTryonResults((prev) =>
      prev.map((x, i) => (indexes.includes(i) ? { status: 'loading' } : x))
    )
    // 服の画像 URL はサーバー側で clothes テーブルから引く。clothingId だけ送る
    const itemsForApi = validReps.map((r) => ({
      _idx: r.idx,
      clothingId: r.rep!.id,
    }))
    try {
      const res = await fetch('/api/coord-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanImageBase64: photo.base64,
          photoVersion: photo.version,
          items: itemsForApi.map((it) => ({ clothingId: it.clothingId })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.predictions)) {
        setTryonError(data.userMessage || '試着開始に失敗しました')
        setTryonResults((prev) =>
          prev.map((x, i) => (indexes.includes(i) && x.status === 'loading' ? { status: 'failed' } : x))
        )
        return
      }
      // predictions[i] は itemsForApi[i] と同順
      type Pred = {
        caseIndex: number
        predictionId: string | null
        status: string
        resultUrl?: string
        cached?: boolean
        photoVersion?: number
        cacheKey?: string
        error?: string
      }
      const predictions = data.predictions as Pred[]

      await Promise.all(
        predictions.map(async (p, i) => {
          const originalIdx = itemsForApi[i]._idx
          // キャッシュヒット → 即 succeeded
          if (p.cached && p.resultUrl) {
            setTryonResults((prev) =>
              prev.map((x, k) => (k === originalIdx ? { status: 'succeeded', resultUrl: p.resultUrl } : x))
            )
            return
          }
          if (!p.predictionId || !p.cacheKey) {
            setTryonResults((prev) =>
              prev.map((x, k) => (k === originalIdx ? { status: 'failed', error: p.error } : x))
            )
            return
          }
          const photoVersion = p.photoVersion ?? photo.version
          // 最大 60 秒ポーリング、3秒間隔
          for (let attempt = 0; attempt < 20; attempt++) {
            await new Promise((r) => setTimeout(r, 3000))
            try {
              const pr = await fetch(
                `/api/coord-tryon?predictionId=${encodeURIComponent(p.predictionId)}&photoVersion=${photoVersion}&cacheKey=${encodeURIComponent(p.cacheKey)}`
              )
              const pd = await pr.json()
              if (pd.status === 'succeeded' && pd.resultUrl) {
                setTryonResults((prev) =>
                  prev.map((x, k) => (k === originalIdx ? { status: 'succeeded', resultUrl: pd.resultUrl } : x))
                )
                return
              }
              if (pd.status === 'failed' || pd.status === 'canceled') {
                setTryonResults((prev) =>
                  prev.map((x, k) => (k === originalIdx ? { status: 'failed', error: pd.error || '' } : x))
                )
                return
              }
            } catch {
              // ネットワーク一過性なら継続
            }
          }
          setTryonResults((prev) =>
            prev.map((x, k) => (k === originalIdx ? { status: 'failed', error: 'タイムアウト' } : x))
          )
        })
      )
    } catch (e) {
      setTryonError(e instanceof Error ? e.message : '試着に失敗しました')
      setTryonResults((prev) =>
        prev.map((x, i) => (indexes.includes(i) && x.status === 'loading' ? { status: 'failed' } : x))
      )
    }
  }

  // 「今日の服に決定」
  const handleConfirm = async () => {
    if (!suggestion) return
    setConfirming(true)
    setConfirmError('')
    // 固定 or pending のアイテムを保存（却下は除く）
    const clothIds = suggestion.itemIds.filter((id) => itemStatus[id] !== 'rejected')
    // 学習用：採用案以外の案の itemIds を「不採用」として記録（NOPE 学習）。
    // 採用案にも含まれる服は server 側で自動除外される
    const unchosenIds = suggestions
      .filter((_, i) => i !== selectedIndex)
      .flatMap((s) => s.itemIds || [])
    const result = await confirmTodayOutfitAction({
      cloth_ids: clothIds,
      unchosen_cloth_ids: unchosenIds,
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
  if (suggestions.length === 0 && !loading) {
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
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 6 }}>
          <b style={{ color: '#C4779B' }}>{displaySceneLabel}</b> 向けのコーデを
        </p>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 16 }}>
          AI が天気と相談しながら 3 案ご提案します
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
          {displaySceneLabel} のコーデを提案してもらう
        </button>
      </div>
    )
  }

  // ─── 3案リスト表示モード ───
  // 詳細モード（selectedIndex !== null）に入る前に、3案を見比べて選ばせる
  if (suggestions.length > 0 && selectedIndex === null && !loading) {
    return (
      <SuggestionsListView
        suggestions={suggestions}
        clothes={clothes}
        onSelect={handleSelectSuggestion}
        onRefresh={() => fetchSuggestion()}
        missingCategories={missingCategories}
        sceneLabel={displaySceneLabel}
        isAdmin={isAdmin}
        tryonResults={tryonResults}
        tryonError={tryonError}
        onTryon={handleTryon}
      />
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
      {/* ヘッダー：「← 別の案を見る」ボタン + テーマ名 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {suggestions.length > 1 && (
          <button
            onClick={handleBackToList}
            style={{
              background: 'transparent',
              border: '1.5px solid #E8A0BF',
              color: '#C4779B',
              borderRadius: 12,
              padding: '4px 10px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← 別の案を見る
          </button>
        )}
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C4779B' }}>
          {suggestion?.theme || 'AI コーデ提案'}
        </span>
        {suggestions.length > 1 && selectedIndex !== null && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.65rem',
              color: '#999',
              background: '#FFF0F6',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {selectedIndex + 1} / {suggestions.length} 案目
          </span>
        )}
      </div>

      {/* ⓪ 自分姿の試着画像（あれば最上部に。決定する瞬間に見えることが大事） */}
      {selectedIndex !== null && tryonResults[selectedIndex]?.status === 'succeeded' && tryonResults[selectedIndex].resultUrl && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tryonResults[selectedIndex].resultUrl}
            alt={`${suggestion?.theme || 'この案'} を着た姿`}
            style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 12, background: '#FFF0F6' }}
          />
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(255,255,255,0.92)',
              color: '#993556',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            自分姿
          </span>
        </div>
      )}

      {/* ① 服画像コラージュ */}
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
      {missingCategories.length > 0 && (
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
            <b>{missingCategories.join('・')}</b>がクローゼットに未登録です。登録するとコーデの幅が広がります。
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

// ─────────────────────────────
// 3案リスト表示モード
// 「A案 / B案 / C案」をカード形式で並べて、ユーザーに選ばせる
// ─────────────────────────────
function SuggestionsListView({
  suggestions,
  clothes,
  onSelect,
  onRefresh,
  missingCategories,
  sceneLabel,
  isAdmin,
  tryonResults,
  tryonError,
  onTryon,
}: {
  suggestions: OutfitSuggestion[]
  clothes: ClothingItem[]
  onSelect: (idx: number) => void
  onRefresh: () => void
  missingCategories: string[]
  sceneLabel?: string
  isAdmin?: boolean
  tryonResults?: TryonState[]
  tryonError?: string
  onTryon?: (indexes?: number[]) => void
}) {
  const results = tryonResults || []
  const anyLoading = results.some((r) => r.status === 'loading')
  const aDone = results[0]?.status === 'succeeded'
  const bcIdle = (results[1]?.status === 'idle' || !results[1]) && (results[2]?.status === 'idle' || !results[2])
  const restIndexes = suggestions.map((_, i) => i).filter((i) => i > 0)
  // フェーズ判定：「まだ何もしてない」「A 案完了済で B/C 未生成」「全部完了 or 一部失敗」
  const phase: 'initial' | 'after-a' | 'all-done' =
    !aDone ? 'initial' : aDone && bcIdle && restIndexes.length > 0 ? 'after-a' : 'all-done'
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#C4779B' }}>
          {sceneLabel ? `${sceneLabel} 向け` : '今日のコーデ'} {suggestions.length}案
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.66rem',
            color: '#999',
          }}
        >
          気になる案をタップ
        </span>
      </div>

      {/* 不足カテゴリ案内（リスト表示でも見せる） */}
      {missingCategories.length > 0 && (
        <div
          style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#7B5B00', lineHeight: 1.5 }}>
            💡 <b>{missingCategories.join('・')}</b>未登録 → 登録すると幅が広がります
          </div>
        </div>
      )}

      {/* 3案カード */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestions.map((s, idx) => (
          <SuggestionListItem
            key={idx}
            index={idx}
            suggestion={s}
            clothes={clothes}
            onClick={() => onSelect(idx)}
            tryonResult={tryonResults?.[idx]}
            onRetryTryon={onTryon ? () => onTryon([idx]) : undefined}
          />
        ))}
      </div>

      {/* コーデ試着（管理者ベータ・プログレッシブ）
          コピーは実態（トップス or ワンピース1点の合成）に忠実にする。
          「コーデ全体を着た姿」と期待させると初回でがっかりされるため */}
      {isAdmin && onTryon && (
        <div style={{ marginTop: 14 }}>
          {phase !== 'all-done' && (
            <button
              onClick={() => onTryon(phase === 'after-a' ? restIndexes : [0])}
              disabled={anyLoading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                color: '#fff',
                border: 'none',
                borderRadius: 18,
                padding: 12,
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: anyLoading ? 'wait' : 'pointer',
                opacity: anyLoading ? 0.6 : 1,
              }}
            >
              {anyLoading
                ? '🪄 あなたの姿を生成中…（30〜60秒）'
                : phase === 'after-a'
                ? `📸 B / C のトップスも見比べる（+${restIndexes.length * TRYON_COST_JPY}円）`
                : `📸 A案のトップスを自分の姿で見る（${TRYON_COST_JPY}円）`}
            </button>
          )}
          {phase === 'initial' && !anyLoading && (
            <p style={{ fontSize: '0.66rem', color: '#999', marginTop: 4, textAlign: 'center', lineHeight: 1.6 }}>
              コーデの主役（トップス or ワンピース）1点を、登録した全身写真に合成します
            </p>
          )}
          {tryonError && (
            <p style={{ fontSize: '0.72rem', color: '#C44', marginTop: 6, textAlign: 'center' }}>
              {tryonError}
            </p>
          )}
        </div>
      )}

      {/* 全部やり直し */}
      <button
        onClick={onRefresh}
        style={{
          width: '100%',
          marginTop: 14,
          background: 'transparent',
          color: '#bbb',
          border: 'none',
          padding: 6,
          fontSize: '0.74rem',
          cursor: 'pointer',
        }}
      >
        🔄 別の3案を生成する
      </button>
    </div>
  )
}

/** 1案分のカード（テーマ名 + コラージュ + アイテム名 + これにするボタン） */
function SuggestionListItem({
  index,
  suggestion,
  clothes,
  onClick,
  tryonResult,
  onRetryTryon,
}: {
  index: number
  suggestion: OutfitSuggestion
  clothes: ClothingItem[]
  onClick: () => void
  tryonResult?: TryonState
  onRetryTryon?: () => void
}) {
  const items = (suggestion.itemIds || [])
    .map((id) => clothes.find((c) => c.id === id))
    .filter((c): c is ClothingItem => !!c)

  const labels = ['A', 'B', 'C', 'D', 'E']
  const planLabel = labels[index] || String(index + 1)

  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        border: '2px solid #FFE4F0',
        borderRadius: 14,
        padding: 12,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#E8A0BF'
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(232,160,191,0.22)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#FFE4F0'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* ヘッダー：プラン名 + テーマ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.85rem',
          }}
        >
          {planLabel}
        </span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333', flex: 1 }}>
          {suggestion.theme || `案 ${index + 1}`}
        </span>
        <span
          style={{
            color: '#C4779B',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          →
        </span>
      </div>

      {/* 自分姿の試着結果（あれば優先表示） */}
      {tryonResult && tryonResult.status !== 'idle' && (
        <div
          style={{
            position: 'relative',
            background: '#FFF0F6',
            borderRadius: 10,
            marginBottom: 10,
            padding: 8,
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {tryonResult.status === 'loading' && (
            <div style={{ textAlign: 'center', color: '#999', fontSize: '0.78rem' }}>
              🪄 自分姿で生成中…
            </div>
          )}
          {tryonResult.status === 'failed' && (
            <div style={{ textAlign: 'center', color: '#C44', fontSize: '0.78rem' }}>
              生成失敗{tryonResult.error ? `（${tryonResult.error}）` : ''}
              {onRetryTryon && (
                // 親カード全体が <button> なので button の入れ子は不可 → span で代替
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRetryTryon()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onRetryTryon()
                    }
                  }}
                  style={{
                    display: 'block',
                    marginTop: 8,
                    color: '#C4779B',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  🔄 この案だけ再試着する
                </span>
              )}
            </div>
          )}
          {tryonResult.status === 'succeeded' && tryonResult.resultUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tryonResult.resultUrl}
                alt={`${suggestion.theme || `案 ${index + 1}`} を着た姿`}
                style={{
                  width: '100%',
                  maxHeight: 360,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  background: 'rgba(255,255,255,0.92)',
                  color: '#993556',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                自分姿
              </span>
            </>
          )}
        </div>
      )}

      {/* 画像コラージュ（小さめ） */}
      {items.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginBottom: 10,
            background: 'linear-gradient(180deg, #FFF0F6 0%, #FFE4F0 100%)',
            borderRadius: 10,
            padding: 10,
            overflowX: 'auto',
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                width: 60,
                height: 80,
                background: '#fff',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(196,121,155,0.2)',
                flexShrink: 0,
              }}
            >
              {item.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
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
                    fontSize: '1.4rem',
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
            background: '#FFF8FB',
            borderRadius: 8,
            padding: 14,
            textAlign: 'center',
            color: '#bbb',
            fontSize: '0.78rem',
            marginBottom: 10,
          }}
        >
          アイテム情報なし
        </div>
      )}

      {/* 説明（1行に圧縮） */}
      <p
        style={{
          fontSize: '0.78rem',
          color: '#666',
          lineHeight: 1.5,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {suggestion.suggestion}
      </p>
    </button>
  )
}
