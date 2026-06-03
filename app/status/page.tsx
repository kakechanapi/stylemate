// 開発状況ダッシュボード（公開・認証不要）
// 友達やテスターと URL ひとつで進捗共有するための専用ページ。
// 内容を更新するときは下の sections 配列を編集する。

export const metadata = {
  title: 'StyleMate 開発状況',
  description: 'AI ファッションコーデ × 本人試着アプリの開発進捗ダッシュボード',
}

type Status = 'done' | 'partial' | 'todo'

interface Item {
  label: string
  status: Status
  note?: string
}

interface Section {
  title: string
  emoji: string
  percent: number
  items: Item[]
}

// ─── 表示内容（編集ポイント） ───
const LAST_UPDATED = '2026-06-01'

const sections: Section[] = [
  {
    title: '基本機能（ホーム）',
    emoji: '🏠',
    percent: 100,
    items: [
      { label: '天気表示', status: 'done', note: '体感温度・風速・現在地' },
      { label: '服装指数（0-100 + 5段階）', status: 'done', note: '体感温度ベース' },
      { label: 'AI コーデ提案', status: 'done', note: '天気・TPO・予定・嗜好・性別考慮' },
      { label: '直近の予定表示', status: 'done' },
    ],
  },
  {
    title: 'クローゼット管理',
    emoji: '👔',
    percent: 95,
    items: [
      { label: '服の登録（手動）', status: 'done' },
      { label: '楽天検索から登録', status: 'partial', note: '現状 demo data、楽天APIキー未取得' },
      { label: '画像アップロード', status: 'done', note: 'Supabase Storage' },
      { label: 'カテゴリフィルタ（即時切替）', status: 'done' },
      { label: '編集・削除（長押し）', status: 'done' },
    ],
  },
  {
    title: '予定・カレンダー',
    emoji: '📅',
    percent: 100,
    items: [
      { label: '予定登録（日時・TPO・誰と）', status: 'done' },
      { label: '着用記録', status: 'done' },
      { label: 'iOS式 3ヶ月ストリップ', status: 'done', note: '指でスワイプ' },
      { label: '編集・削除', status: 'done' },
    ],
  },
  {
    title: '友人 + 自分プロフィール',
    emoji: '👥',
    percent: 90,
    items: [
      { label: '自分登録（マイページ統合）', status: 'done', note: '名前・身長・体型・性別' },
      { label: '会う相手登録', status: 'done' },
      { label: 'マルチ写真選択（5-30枚）', status: 'done', note: '自動品質判定' },
      { label: '詳細ページの編集UI', status: 'todo', note: '現状は閲覧のみ' },
    ],
  },
  {
    title: 'AI コーデ提案',
    emoji: '🤖',
    percent: 95,
    items: [
      { label: '天気・TPO 考慮', status: 'done' },
      { label: '服装指数 反映', status: 'done', note: '新規' },
      { label: '性別・体型・身長 反映', status: 'done', note: '新規' },
      { label: '予定・誰と 考慮', status: 'done' },
      { label: '被り回避（同じ相手と最近着た服を除外）', status: 'done' },
      { label: '嗜好（スワイプ学習）', status: 'done' },
      { label: '中身レイヤー提案', status: 'done', note: 'ヒートテック+白T+カーディガン等' },
      { label: '503エラー自動リトライ + フォールバック', status: 'done', note: '新規' },
      { label: 'お気に入り保存', status: 'todo' },
    ],
  },
  {
    title: 'AI 試着（IDM-VTON）',
    emoji: '👗',
    percent: 80,
    items: [
      { label: '友人 + 服を選んで試着', status: 'done' },
      { label: '結果保存', status: 'done', note: 'Supabase Storage' },
      { label: '本人モード（LoRA）', status: 'todo', note: 'Phase 5。コアバリュー' },
      { label: '360° VR', status: 'todo', note: 'Phase 9' },
    ],
  },
  {
    title: '嗜好学習（Tinderスワイプ）',
    emoji: '💞',
    percent: 100,
    items: [
      { label: 'ドラッグスワイプ', status: 'done', note: '指追従・次カード浮き上がり' },
      { label: 'Gemini で系統推定', status: 'done', note: 'カラー・パターン・シルエット' },
      { label: 'AI提案に自動付与', status: 'done' },
    ],
  },
  {
    title: '認証・基盤',
    emoji: '🔐',
    percent: 100,
    items: [
      { label: 'Google ログイン', status: 'done' },
      { label: 'メールマジックリンク', status: 'done', note: 'エラー視認性UP済' },
      { label: 'RLS（自分のデータしか見えない）', status: 'done' },
      { label: 'Vercel 自動デプロイ', status: 'done', note: 'git push で自動反映' },
    ],
  },
  {
    title: '公開準備',
    emoji: '📋',
    percent: 30,
    items: [
      { label: '本番デプロイ稼働', status: 'done' },
      { label: '自動デプロイ', status: 'done' },
      { label: '利用規約', status: 'todo', note: '公開必須' },
      { label: 'プライバシーポリシー', status: 'todo', note: '公開必須' },
      { label: 'アプリ名確定（StyleMate は仮）', status: 'todo' },
      { label: '楽天 API キー取得', status: 'todo', note: 'アプリ名確定後' },
      { label: 'オンボーディング画面', status: 'todo' },
    ],
  },
  {
    title: 'iOS化準備',
    emoji: '📱',
    percent: 25,
    items: [
      { label: '戦略方針確定（Swift native ハイブリッド）', status: 'done' },
      { label: 'アーキテクチャ設計', status: 'done' },
      { label: 'Phase 5 (LoRA) 完成', status: 'todo', note: 'iOS着手前提' },
      { label: 'Xcode 環境準備', status: 'todo', note: '20GB+' },
      { label: 'Apple Developer Program ($99/年)', status: 'todo' },
      { label: 'Bundle ID 決定', status: 'todo', note: 'アプリ名確定後' },
    ],
  },
]

// 全体進捗の概算
const overallPercent = Math.round(
  sections.reduce((sum, s) => sum + s.percent, 0) / sections.length
)

export default function StatusPage() {
  return (
    <div
      style={{
        background: '#FFF8FB',
        minHeight: '100vh',
        padding: '32px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* ヘッダー */}
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 4 }}>👗</div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#333',
              marginBottom: 4,
            }}
          >
            StyleMate 開発状況
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#888' }}>
            AI ファッションコーデ × 本人試着アプリ
          </p>
          <p style={{ fontSize: '0.7rem', color: '#bbb', marginTop: 6 }}>
            最終更新：{LAST_UPDATED}
          </p>
        </header>

        {/* 全体進捗 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
            borderRadius: 20,
            padding: 24,
            color: '#fff',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 700, letterSpacing: 2 }}>
            OVERALL
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginTop: 4 }}>
            {overallPercent}
            <span style={{ fontSize: '1rem', opacity: 0.85 }}>%</span>
          </div>
          <div
            style={{
              marginTop: 12,
              height: 8,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${overallPercent}%`,
                height: '100%',
                background: '#fff',
                borderRadius: 4,
              }}
            />
          </div>
          <p style={{ marginTop: 14, fontSize: '0.78rem', opacity: 0.95, lineHeight: 1.5 }}>
            本番稼働中・友達テスト中
            <br />
            次の山：Phase 5（LoRA本人モード）
          </p>
        </div>

        {/* セクション一覧 */}
        {sections.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}

        {/* CTA */}
        <div
          style={{
            marginTop: 28,
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #FFE4F0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 14 }}>
            実際に触ってみる
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #E8A0BF, #C4779B)',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 24,
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(196,121,155,0.3)',
            }}
          >
            アプリを開く →
          </a>
        </div>

        <p
          style={{
            marginTop: 24,
            fontSize: '0.7rem',
            color: '#bbb',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          このダッシュボードはテスター共有用です
          <br />
          フィードバックは開発者まで
        </p>
      </div>
    </div>
  )
}

function SectionCard({ section }: { section: Section }) {
  const doneCount = section.items.filter((i) => i.status === 'done').length
  const total = section.items.length

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #FFE4F0',
        padding: 18,
        marginBottom: 14,
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>{section.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#333',
              lineHeight: 1.2,
            }}
          >
            {section.title}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 2 }}>
            {doneCount} / {total} 完了
          </div>
        </div>
        <div
          style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: percentColor(section.percent),
          }}
        >
          {section.percent}%
        </div>
      </div>

      {/* プログレスバー */}
      <div
        style={{
          height: 4,
          background: '#FFE4F0',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${section.percent}%`,
            height: '100%',
            background: percentColor(section.percent),
            borderRadius: 2,
          }}
        />
      </div>

      {/* 項目リスト */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {section.items.map((item) => (
          <li
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '6px 0',
              fontSize: '0.82rem',
              color: '#444',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: '0.95rem', lineHeight: 1.3 }}>
              {statusEmoji(item.status)}
            </span>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  textDecoration: item.status === 'done' ? 'none' : 'none',
                  color: item.status === 'todo' ? '#888' : '#333',
                }}
              >
                {item.label}
              </span>
              {item.note && (
                <span style={{ color: '#aaa', fontSize: '0.72rem', marginLeft: 6 }}>
                  ({item.note})
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function statusEmoji(status: Status): string {
  if (status === 'done') return '✅'
  if (status === 'partial') return '🟡'
  return '⚪️'
}

function percentColor(percent: number): string {
  if (percent >= 90) return '#34D399'
  if (percent >= 60) return '#C4779B'
  if (percent >= 30) return '#E8A0BF'
  return '#bbb'
}
