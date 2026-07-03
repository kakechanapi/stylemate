'use client'

// オンボーディング：初回ログイン後の一本道
//   Step1 あなたのこと（性別・身長・体型）
//   Step2 写真AIで3着登録（撮る→AIが全部入力→追加、を3回）
//   Step3 完了 → ホームで即3案提案（/?suggest=1）
//
// 設計方針：
// - 「5分で魔法（自分の服で提案）を見せる」ことが唯一の目的。項目は最小限
// - マウント時に cookie を立てるので、途中離脱してもリダイレクトループしない
// - スキップ可。押し付けない（離脱計測は app_events で見る）

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadClothingImage } from '@/lib/storage'
import { saveClothingAction } from '@/app/register/actions'
import { SCENE_LABEL } from '@/components/TPOSelector'
import { saveMeProfileAction, logOnboardingEventAction } from './actions'
import type { Gender, BodyType, Category } from '@/types/fashion'

const CATEGORY_LABEL: Record<string, string> = {
  tops: 'トップス',
  bottoms: 'ボトムス',
  outerwear: '羽織り・アウター',
  dress: 'ワンピース',
  shoes: '靴',
  bag: 'バッグ',
  accessory: 'アクセサリー',
  other: 'その他',
}

const SEASON_LABEL: Record<string, string> = {
  spring: '🌸 春',
  summer: '☀️ 夏',
  autumn: '🍂 秋',
  winter: '⛄ 冬',
  all: '🌐 通年',
}

const TARGET_COUNT = 3

interface DraftCloth {
  imageUrl?: string
  previewUrl: string
  name: string
  brand?: string
  category: Category
  color?: string
  tpoTags: string[]
  seasonTags: string[]
  details: {
    material?: string
    silhouette?: string
    pattern?: string
    neckline?: string
    sleeve_type?: string
    length_type?: string
    transparency?: 'none' | 'slight' | 'significant'
    features?: string[]
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.replace(/^data:image\/[a-zA-Z]+;base64,/, ''))
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function OnboardingClient({
  hasMe,
  initialClothesCount,
}: {
  hasMe: boolean
  initialClothesCount: number
}) {
  const router = useRouter()
  // 自分プロフィール済みなら Step1 を飛ばす
  const [step, setStep] = useState<1 | 2 | 3>(hasMe ? 2 : 1)
  const [savedCount, setSavedCount] = useState(initialClothesCount)

  // マウント時：リダイレクトループ防止 cookie + 開始イベント
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    document.cookie = 'sm_onboarded=1; path=/; max-age=31536000'
    void logOnboardingEventAction('onboarding_started')
  }, [])

  // ─── Step1 state ───
  const [gender, setGender] = useState<Gender | null>(null)
  const [heightCm, setHeightCm] = useState('')
  const [bodyType, setBodyType] = useState<BodyType | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  const handleSaveProfile = async () => {
    if (!gender) return
    setSavingProfile(true)
    setProfileError('')
    const h = parseInt(heightCm, 10)
    const result = await saveMeProfileAction({
      gender,
      height_cm: Number.isFinite(h) && h > 80 && h < 250 ? h : undefined,
      body_type: bodyType || undefined,
    })
    setSavingProfile(false)
    if (result.ok) setStep(2)
    else setProfileError(result.error || '保存に失敗しました')
  }

  // ─── Step2 state ───
  const fileRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [draft, setDraft] = useState<DraftCloth | null>(null)
  const [savingCloth, setSavingCloth] = useState(false)
  const [clothError, setClothError] = useState('')

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAnalyzing(true)
    setClothError('')
    try {
      const previewUrl = URL.createObjectURL(file)
      // 画像アップロードと AI 分類を並列で
      const [base64, uploadResult] = await Promise.all([
        fileToBase64(file),
        uploadClothingImage(file),
      ])
      const res = await fetch('/api/classify-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg' }),
      })
      const data = await res.json()
      if (!data.ok) {
        setClothError(data.error || 'AI が画像を判定できませんでした。別の写真でお試しください。')
        return
      }
      setDraft({
        imageUrl: uploadResult.ok ? uploadResult.url : undefined,
        previewUrl,
        name: data.name || '服',
        brand: data.brand || undefined,
        category: (data.category as Category) || 'other',
        color: data.color,
        // AI は必ず1つ以上返す想定だが、空なら安全側のデフォルト
        tpoTags: Array.isArray(data.tpoTags) && data.tpoTags.length > 0 ? data.tpoTags : ['casual'],
        seasonTags:
          Array.isArray(data.seasonTags) && data.seasonTags.length > 0 ? data.seasonTags : ['all'],
        details: {
          material: data.material,
          silhouette: data.silhouette,
          pattern: data.pattern,
          neckline: data.neckline,
          sleeve_type: data.sleeveType,
          length_type: data.lengthType,
          transparency: data.transparency,
          features: data.features,
        },
      })
    } catch (err) {
      setClothError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveCloth = async () => {
    if (!draft) return
    setSavingCloth(true)
    setClothError('')
    const result = await saveClothingAction({
      name: draft.name.trim() || '服',
      brand: draft.brand,
      category: draft.category,
      color: draft.color,
      image_url: draft.imageUrl,
      tpo_tags: draft.tpoTags,
      season_tags: draft.seasonTags,
      ...draft.details,
    })
    setSavingCloth(false)
    if (!result.ok) {
      setClothError(result.error || '保存に失敗しました')
      return
    }
    const next = savedCount + 1
    setSavedCount(next)
    setDraft(null)
    if (next >= TARGET_COUNT) setStep(3)
  }

  const handleFinish = async () => {
    await logOnboardingEventAction('onboarding_completed', { clothesRegistered: savedCount })
    router.push('/?suggest=1')
  }

  const handleSkip = async () => {
    await logOnboardingEventAction('onboarding_skipped', {
      step,
      clothesRegistered: savedCount,
    })
    router.push('/')
  }

  // ─── 共通スタイル ───
  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
    color: '#fff',
    border: 'none',
    borderRadius: 18,
    padding: 14,
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
  }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: 14,
    border: `2px solid ${active ? '#E8A0BF' : '#eee'}`,
    background: active ? '#FFF0F6' : '#fff',
    color: active ? '#C4779B' : '#888',
    fontWeight: active ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  })

  return (
    <div style={{ padding: '28px 20px 60px' }}>
      {/* 進捗ドット */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            style={{
              width: s === step ? 22 : 8,
              height: 8,
              borderRadius: 999,
              background: s <= step ? '#C4779B' : '#eee',
              transition: 'width 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* ─── Step 1：あなたのこと ─── */}
      {step === 1 && (
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', marginBottom: 6 }}>
            はじめまして 👋
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.7, marginBottom: 24 }}>
            AI があなたに合うコーデを提案するために、
            <br />
            少しだけ教えてください（30秒で終わります）
          </p>

          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>
            性別 <span style={{ color: '#C4779B' }}>*</span>
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['女性', '男性', '指定しない'] as Gender[]).map((g) => (
              <button key={g} onClick={() => setGender(g)} style={{ ...chip(gender === g), flex: 1 }}>
                {g}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>
            身長（任意）
          </p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="158"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '2px solid #eee',
              fontSize: '1rem',
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />

          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', marginBottom: 8 }}>
            体型（任意）
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {(['スリム', 'ふつう', 'がっしり'] as BodyType[]).map((b) => (
              <button
                key={b}
                onClick={() => setBodyType(bodyType === b ? null : b)}
                style={{ ...chip(bodyType === b), flex: 1 }}
              >
                {b}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={!gender || savingProfile}
            style={{ ...primaryBtn, opacity: !gender || savingProfile ? 0.5 : 1 }}
          >
            {savingProfile ? '保存中…' : '次へ'}
          </button>
          {profileError && (
            <p style={{ fontSize: '0.75rem', color: '#C44', marginTop: 8, textAlign: 'center' }}>
              {profileError}
            </p>
          )}
        </div>
      )}

      {/* ─── Step 2：3着登録 ─── */}
      {step === 2 && (
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', marginBottom: 6 }}>
            よく着る服を {TARGET_COUNT} 着だけ 📷
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.7, marginBottom: 8 }}>
            写真を選ぶだけで、AI が名前・カテゴリ・シーズンまで全部入力します。
          </p>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#C4779B', marginBottom: 20 }}>
            {savedCount} / {TARGET_COUNT} 着 登録済み
          </p>

          {/* 分析中 */}
          {analyzing && (
            <div
              style={{
                background: '#FFF5F8',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: '0.85rem', color: '#C4779B', fontWeight: 700 }}>
                AI が服を見ています…
              </p>
            </div>
          )}

          {/* AI 結果の確認カード */}
          {draft && !analyzing && (
            <div
              style={{
                background: '#fff',
                border: '2px solid #FFE4F0',
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.previewUrl}
                  alt=""
                  style={{ width: 84, height: 112, objectFit: 'cover', borderRadius: 10 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.7rem', color: '#999', margin: '0 0 4px' }}>
                    ✨ AI が入力しました（名前は直せます）
                  </p>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '2px solid #eee',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                      marginBottom: 8,
                    }}
                  />
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '2px solid #eee',
                      fontSize: '0.85rem',
                      background: '#fff',
                    }}
                  >
                    {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* AI 判定のシーン・シーズン（表示のみ・詳細は後でクローゼットから編集可） */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {draft.tpoTags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: '#FFF0F6',
                      color: '#C4779B',
                      fontWeight: 700,
                    }}
                  >
                    {SCENE_LABEL[t] || t}
                  </span>
                ))}
                {draft.seasonTags.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: '#F0F6FF',
                      color: '#4A6FD6',
                      fontWeight: 700,
                    }}
                  >
                    {SEASON_LABEL[s] || s}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDraft(null)}
                  disabled={savingCloth}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#999',
                    border: '2px solid #ddd',
                    borderRadius: 14,
                    padding: 10,
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  撮り直す
                </button>
                <button
                  onClick={handleSaveCloth}
                  disabled={savingCloth}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    padding: 10,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    opacity: savingCloth ? 0.6 : 1,
                  }}
                >
                  {savingCloth ? '追加中…' : 'クローゼットに追加'}
                </button>
              </div>
            </div>
          )}

          {/* 撮影ボタン */}
          {!draft && !analyzing && (
            <button onClick={() => fileRef.current?.click()} style={primaryBtn}>
              📷 {savedCount + 1} 着目の写真を撮る・選ぶ
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoPick}
          />

          {clothError && (
            <p style={{ fontSize: '0.75rem', color: '#C44', marginTop: 10, textAlign: 'center' }}>
              {clothError}
            </p>
          )}

          <button
            onClick={handleSkip}
            style={{
              width: '100%',
              marginTop: 20,
              background: 'transparent',
              border: 'none',
              color: '#bbb',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            あとで登録する
          </button>
        </div>
      )}

      {/* ─── Step 3：完了 ─── */}
      {step === 3 && (
        <div style={{ textAlign: 'center', paddingTop: 24 }}>
          <div style={{ fontSize: '3.2rem', marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', marginBottom: 8 }}>
            準備完了！
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.8, marginBottom: 28 }}>
            {savedCount} 着の服が登録できました。
            <br />
            今日の天気に合わせて、AI がコーデを提案します。
          </p>
          <button onClick={handleFinish} style={primaryBtn}>
            ✨ 今日のコーデを提案してもらう
          </button>
          <p style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 14, lineHeight: 1.6 }}>
            服はいつでも「クローゼット」タブから追加できます。
            <br />
            増えるほど提案の幅が広がります。
          </p>
        </div>
      )}
    </div>
  )
}
