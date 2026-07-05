// マイページ：自分のプロフィール + 嗜好 + 会う相手 + 設定
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStyleProfile } from '@/lib/style'
import { listFriends } from '@/lib/friends'
import { checkAdmin } from '@/lib/admin'
import { signOut } from '../auth/actions'
import SelfPhotoRegister from '@/components/SelfPhotoRegister'
import NotificationSetupCard from '@/components/NotificationSetupCard'

// LoRA 状態バッジのスタイル
const LORA_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  none: { text: 'オンライン試着 通常', color: '#999', bg: '#f3f3f3' },
  pending: { text: 'よりリアルに 準備中', color: '#C4779B', bg: '#FFE4F0' },
  training: { text: 'セットアップ中…', color: '#1F75D6', bg: '#E1EEFF' },
  ready: { text: '✓ よりリアルに試着OK', color: '#0E9F6E', bg: '#E6F9F0' },
  failed: { text: 'セットアップ失敗', color: '#D63A3A', bg: '#FFE5E5' },
}

const GENDER_SYMBOL: Record<string, { symbol: string; color: string }> = {
  '男性': { symbol: '♂', color: '#4A6FD6' },
  '女性': { symbol: '♀', color: '#C4779B' },
}

function formatBirthday(bday?: string): string {
  if (!bday) return ''
  const [, m, d] = bday.split('-')
  if (!m || !d) return ''
  return `🎂 ${parseInt(m, 10)}/${parseInt(d, 10)}`
}

/** ISO 文字列を「2分前」「3時間前」「2日前」等の相対表記に */
function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return 'たった今'
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}時間前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day}日前`
  const month = Math.floor(day / 30)
  return `${month}ヶ月前`
}

export default async function MyPage() {
  const supabase = await createSupabaseServerClient()

  const [userRes, styleProfile, friends, admin, clothesRes, outfitsRes] = await Promise.all([
    supabase.auth.getUser(),
    getStyleProfile(),
    listFriends(),
    checkAdmin(),
    supabase.from('clothes').select('*', { count: 'exact', head: true }),
    supabase.from('outfits').select('*', { count: 'exact', head: true }),
  ])
  const user = userRes.data.user
  const clothesCount = clothesRes.count || 0
  const outfitsCount = outfitsRes.count || 0
  const swipeCount = styleProfile?.swipe_count || 0

  // 「自分」と「会う相手」を分離
  const me = friends.find((f) => f.is_me) || null
  const others = friends.filter((f) => !f.is_me)
  // 上位3人（最近追加順）
  const topOthers = others.slice(0, 3)

  const gen = me?.gender ? GENDER_SYMBOL[me.gender] : null
  const bday = formatBirthday(me?.birthday)
  const lora = me ? LORA_LABEL[me.lora_status] || LORA_LABEL.none : null

  return (
    <div style={{ padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333', marginBottom: 20 }}>
        マイ
      </h1>

      {/* ─── 自分プロフィール（リッチ版） ─── */}
      <Link
        href={me ? `/friends/${me.id}` : '/friends/new?me=1'}
        style={{
          display: 'block',
          background: 'linear-gradient(135deg, #FFF0F6, #FFE4F0)',
          border: '1px solid #F5C6D8',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background:
                me?.thumb_url
                  ? `url(${me.thumb_url}) center/cover`
                  : 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              color: '#fff',
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            {!me?.thumb_url && (me?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {me ? (
              <>
                {/* 名前 + 性別 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#333',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {me.name}
                  </span>
                  {gen && (
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: gen.color,
                        lineHeight: 1,
                      }}
                      title={me.gender}
                    >
                      {gen.symbol}
                    </span>
                  )}
                </div>
                {/* 身長 · 体型 · 誕生日 */}
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: '#888',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span>{me.height_cm ? `${me.height_cm}cm` : '身長未入力'}</span>
                  <span style={{ color: '#ccc' }}>·</span>
                  <span>{me.body_type || '体型未設定'}</span>
                  {bday && (
                    <>
                      <span style={{ color: '#ccc' }}>·</span>
                      <span>{bday}</span>
                    </>
                  )}
                </div>
                {/* LoRA バッジ + 写真枚数 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {lora && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: lora.color,
                        background: lora.bg,
                        borderRadius: 6,
                        padding: '3px 8px',
                      }}
                    >
                      {lora.text}
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                    📸 {me.face_photo_count}枚
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333' }}>
                  自分を登録する
                </div>
                <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                  身長・体型・写真を登録してください
                </div>
              </>
            )}
          </div>
          <span style={{ color: '#bbb', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* 統計フッター */}
        {me && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid rgba(196,121,155,0.18)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            <StatCell icon="📦" label="保有服" value={clothesCount} />
            <StatCell icon="🎨" label="コーデ" value={outfitsCount} />
            <StatCell icon="💞" label="スワイプ" value={swipeCount} />
          </div>
        )}

        {user?.email && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid rgba(196,121,155,0.18)',
              fontSize: '0.7rem',
              color: '#999',
            }}
          >
            ✉ {user.email}
          </div>
        )}
      </Link>

      {/* ─── コーデ試着用の全身写真（管理者ベータ） ─── */}
      <SelfPhotoRegister show={admin.isAdmin} />

      {/* ─── 毎朝のコーデ通知 ─── */}
      <NotificationSetupCard variant="settings" />

      {/* ─── 嗜好カード ─── */}
      <Link
        href="/style"
        style={{
          display: 'block',
          background: '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>💞</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>
            あなたの好み
          </span>
          {styleProfile && styleProfile.tags.length > 0 && (
            <span
              style={{
                fontSize: '0.65rem',
                color: '#C4779B',
                background: '#FFF0F6',
                fontWeight: 700,
                borderRadius: 8,
                padding: '2px 8px',
              }}
            >
              {styleProfile.tags.length}タグ · {swipeCount}回
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: '1rem' }}>›</span>
        </div>
        {/* AI 学習の最終更新時刻 */}
        {styleProfile?.updated_at && (
          <div
            style={{
              fontSize: '0.66rem',
              color: '#999',
              marginBottom: 6,
            }}
          >
            🧠 最終更新：{formatRelative(styleProfile.updated_at)}
          </div>
        )}
        {styleProfile && styleProfile.tags.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {styleProfile.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    background: '#FFF0F6',
                    color: '#C4779B',
                    border: '1px solid #E8A0BF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {styleProfile.summary && (
              <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                {styleProfile.summary}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.78rem', color: '#999', lineHeight: 1.5 }}>
            服をスワイプして好みを教えると、AI コーデ提案の精度が上がります
          </p>
        )}
      </Link>

      {/* ─── 会う相手（被り回避用） ─── */}
      <Link
        href="/friends"
        style={{
          display: 'block',
          background: '#fff',
          border: '1px solid #FFE4F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🙂</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>
              会う相手
            </div>
            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>
              {others.length > 0
                ? `${others.length}人 登録 · 服かぶり防止のコーデ提案に使われます`
                : 'まだ登録なし · 予定タブで使えます'}
            </div>
          </div>
          {/* サムネ列 */}
          {topOthers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}>
              {topOthers.map((f, i) => (
                <div
                  key={f.id}
                  title={f.name}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: f.thumb_url
                      ? `url(${f.thumb_url}) center/cover`
                      : 'linear-gradient(135deg, #E8A0BF, #BAD7E9)',
                    border: '2px solid #fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    marginLeft: i === 0 ? 0 : -10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {!f.thumb_url && (f.name?.[0] || '?').toUpperCase()}
                </div>
              ))}
              {others.length > topOthers.length && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '2px solid #FFE4F0',
                    marginLeft: -10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    color: '#C4779B',
                    fontWeight: 700,
                  }}
                >
                  +{others.length - topOthers.length}
                </div>
              )}
            </div>
          )}
          <span style={{ color: '#bbb', fontSize: '1rem' }}>›</span>
        </div>
      </Link>

      {/* ─── 設定 ─── */}
      <section style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: '0.7rem',
            color: '#999',
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            paddingLeft: 4,
            marginBottom: 8,
          }}
        >
          設定
        </h2>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #F5C6D8' }}>
          <Link
            href="/terms"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid #F5C6D8',
              color: '#333',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.1rem', marginRight: 12 }}>📜</span>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>利用規約</span>
            <span style={{ color: '#bbb' }}>›</span>
          </Link>
          <Link
            href="/privacy"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid #F5C6D8',
              color: '#333',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.1rem', marginRight: 12 }}>🔒</span>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>プライバシーポリシー</span>
            <span style={{ color: '#bbb' }}>›</span>
          </Link>
          <MenuRow icon="❓" label="ヘルプ" disabled hint="準備中" last />
        </div>
      </section>

      {/* 管理者専用メニュー */}
      {admin.isAdmin && (
        <section style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#C4779B',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            管理者メニュー
          </h2>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #F5C6D8' }}>
            <Link
              href="/admin/costs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                color: '#333',
                textDecoration: 'none',
                fontSize: '0.95rem',
                borderBottom: '1px solid #F5C6D8',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>💰</span>
              <span style={{ flex: 1 }}>コストダッシュボード</span>
              <span style={{ color: '#bbb' }}>›</span>
            </Link>
            <Link
              href="/admin/seed-closet"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                color: '#333',
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🌱</span>
              <span style={{ flex: 1 }}>サンプル50着投入（検証用）</span>
              <span style={{ color: '#bbb' }}>›</span>
            </Link>
          </div>
        </section>
      )}

      {/* ログアウト */}
      <form action={signOut}>
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px',
            background: '#fff',
            border: '2px solid #ddd',
            color: '#999',
            borderRadius: 12,
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </form>
    </div>
  )
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: number
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: 10,
        padding: '8px 4px',
      }}
    >
      <div style={{ fontSize: '0.9rem', marginBottom: 1 }}>{icon}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#C4779B', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.62rem', color: '#999', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  disabled,
  hint,
  last,
}: {
  icon: string
  label: string
  disabled?: boolean
  hint?: string
  last?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid #F5C6D8',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: '1.1rem', marginRight: 12 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>{label}</span>
      {hint && (
        <span style={{ fontSize: '0.7rem', color: '#bbb' }}>{hint}</span>
      )}
    </div>
  )
}
