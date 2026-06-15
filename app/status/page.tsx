// 開発状況ダッシュボード（公開・認証不要）
// 友達やテスターと URL ひとつで進捗共有するための専用ページ。
// 内容を更新するときは下の sections 配列を編集する。

export const metadata = {
  title: 'StyleMate 開発状況',
  description: 'AI ファッションコーデ × オンライン試着アプリの開発進捗ダッシュボード',
}

type Status = 'done' | 'partial' | 'todo' | 'in-progress'

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
const LAST_UPDATED = '2026-06-13'

// 直近の "今やってること / 次やること" を一目で
const NOW_DOING = {
  title: 'UX磨き + 楽天検索が稼働開始',
  subtitle: '楽天API の新仕様（2026-04-01）に対応。本物の商品検索がローカルで動作確認済。Yahoo は制限解除待ち',
  current: 'Vercel 本番への RAKUTEN_APPLICATION_ID 環境変数追加 → 本番反映',
  next: 'Yahoo API 制限解除を待ちつつ、オンボーディング / 利用規約 などの公開準備へ',
}

const sections: Section[] = [
  {
    title: '基本機能（ホーム）',
    emoji: '🏠',
    percent: 100,
    items: [
      { label: '天気表示', status: 'done', note: '体感温度・風速・現在地' },
      { label: '服装指数（0-100 + 5段階）', status: 'done', note: '体感温度ベース' },
      { label: 'AI コーデ提案', status: 'done', note: '天気・シーン・予定・好み・性別考慮' },
      { label: '直近の予定表示', status: 'done' },
    ],
  },
  {
    title: 'クローゼット管理',
    emoji: '👔',
    percent: 95,
    items: [
      { label: '服の登録（手動）', status: 'done' },
      { label: '楽天/Yahoo検索から登録', status: 'in-progress', note: 'マルチソース基盤完成・API繋ぎ込み待ち' },
      { label: '商品名から自動判定（カテゴリ・色・シーン・シーズン）', status: 'done', note: '新規' },
      { label: '画像アップロード', status: 'done', note: 'Supabase Storage' },
      { label: '外部画像の自前ストレージ永続化', status: 'done', note: '新規・外部側で消えても残る' },
      { label: 'カテゴリフィルタ（即時切替）', status: 'done' },
      { label: '編集・削除（長押し）', status: 'done' },
      { label: '服削除→着用記録の整合性自動維持', status: 'done', note: '新規' },
    ],
  },
  {
    title: '予定・カレンダー',
    emoji: '📅',
    percent: 100,
    items: [
      { label: '予定登録（日時・シーン・誰と）', status: 'done' },
      { label: '着用記録', status: 'done' },
      { label: 'iOS式 3ヶ月ストリップ', status: 'done', note: '指でスワイプ' },
      { label: '編集・削除', status: 'done' },
    ],
  },
  {
    title: '友人 + 自分プロフィール',
    emoji: '👥',
    percent: 100,
    items: [
      { label: '自分登録（マイページ統合）', status: 'done', note: '名前・身長・体型・性別' },
      { label: '会う相手登録', status: 'done' },
      { label: 'マルチ写真選択（5-30枚）', status: 'done', note: '自動品質判定' },
      { label: '友達の編集ページ実装', status: 'done', note: '新規・性別/誕生日/関係性/写真/メモ' },
      { label: 'メモ自由記述欄', status: 'done', note: '新規' },
      { label: '友達のクイック追加（着用記録画面から）', status: 'done', note: '新規' },
      { label: '友達は身長/体型/オンライン試着なし', status: 'done', note: 'スコープ確定' },
    ],
  },
  {
    title: 'AI コーデ提案',
    emoji: '🤖',
    percent: 100,
    items: [
      { label: '天気・シーン 考慮', status: 'done' },
      { label: '服装指数 反映', status: 'done' },
      { label: '性別・体型・身長 反映', status: 'done' },
      { label: '予定・誰と 考慮', status: 'done' },
      { label: '服かぶり防止（同じ相手と最近着た服を除外）', status: 'done' },
      { label: '好み（スワイプ学習）', status: 'done' },
      { label: '中身レイヤー提案', status: 'done', note: 'ヒートテック+白T+カーディガン等' },
      { label: '503エラー自動リトライ + フォールバック', status: 'done' },
      { label: '画像コラージュ表示（着たイメージ Preview）', status: 'done', note: '新規' },
      { label: 'アイテム単位の固定/却下ボタン', status: 'done', note: '新規・好み学習と連携' },
      { label: '却下したアイテムだけ差し替え再提案', status: 'done', note: '新規' },
      { label: '今日の服に決定→outfits自動保存', status: 'done', note: '新規' },
      { label: '提案の永続化（タブ切替で消えない）', status: 'done', note: '新規・localStorage' },
    ],
  },
  {
    title: '商品検索（楽天/Yahoo マルチソース）',
    emoji: '🛍',
    percent: 85,
    items: [
      { label: 'マルチソース基盤実装', status: 'done', note: '新規・並列実行+重複排除+スコアソート' },
      { label: '楽天市場ソース', status: 'done', note: '✨新仕様2026-04-01対応・本番稼働中' },
      { label: 'Yahoo!ショッピングソース', status: 'in-progress', note: '実装済・新規ID制限解除待ち' },
      { label: 'ブランド・カテゴリエイリアス', status: 'done', note: 'ジーンズ↔デニム等' },
      { label: '本番demoフォールバック完全無効化', status: 'done', note: '偽データ表示事故防止' },
      { label: '検索結果がdemoの時の警告UI', status: 'done' },
      { label: '画像URL の自前永続化', status: 'done', note: '外部消失リスク対策' },
    ],
  },
  {
    title: '💰 コスト管理 + 管理者ダッシュボード',
    emoji: '💰',
    percent: 95,
    items: [
      { label: 'api_usage_logs テーブル', status: 'done', note: '新規・migration 0008' },
      { label: '管理者判定（環境変数+DB列の二段）', status: 'done', note: '新規・柔軟性確保' },
      { label: '使用ログ自動記録', status: 'done', note: 'オンライン試着/セットアップ/Geminiの4箇所' },
      { label: '月間上限管理', status: 'done', note: '管理者1500円/他300円・個別上書可' },
      { label: '上限超過時 オンライン試着/セットアップ 自動ブロック', status: 'done', note: 'HTTP 429' },
      { label: 'ユーザー警告バナー', status: 'done', note: '80%黄色/100%赤' },
      { label: '/admin/costs ダッシュボード', status: 'done', note: '30秒オートリフレッシュ' },
      { label: '今日/今月/サービス別/Top10/30日トレンド', status: 'done' },
      { label: 'Replicate Webhookで実コスト校正', status: 'todo', note: 'VoC段階では推定値で十分' },
    ],
  },
  {
    title: 'オンライン試着',
    emoji: '👗',
    percent: 85,
    items: [
      { label: '友人 + 服を選んでオンライン試着', status: 'done' },
      { label: '結果保存', status: 'done', note: 'Supabase Storage' },
      { label: 'よりリアルにオンライン試着（精度UP）', status: 'in-progress', note: 'Phase 5 実装中。下の詳細参照' },
      { label: '360° で見る', status: 'todo', note: 'Phase 9' },
    ],
  },
  {
    title: 'Phase 5: よりリアルにオンライン試着（自分のみ）',
    emoji: '🧬',
    percent: 55,
    items: [
      { label: '5-1 DB migration（0006_lora_training）', status: 'done' },
      { label: '5-2 セットアップAPI /api/lora-train', status: 'done', note: 'POST=開始 / GET=ポーリング' },
      { label: '5-3 セットアップUI LoraTrainingFlow', status: 'done', note: '自分プロフィールに移行予定' },
      { label: '5-3.5 手動セットアップ', status: 'done', note: 'Supabase / Replicate destination' },
      { label: '5-4 自分1人でセットアップを走らせる', status: 'in-progress', note: '実行中 or 直前' },
      { label: '5-5 リアル試着の2段階パイプ', status: 'todo', note: '次のタスク' },
      { label: '5-6 試着UIに「よりリアルに」トグル', status: 'todo' },
      { label: '5-7 試着10-20回でそっくり度評価', status: 'todo' },
      { label: '友達向けのリアル試着は提供しない', status: 'done', note: 'スコープ確定（2026-06-06）' },
    ],
  },
  {
    title: '好み学習（Tinderスワイプ）',
    emoji: '💞',
    percent: 100,
    items: [
      { label: 'ドラッグスワイプ', status: 'done', note: '指追従・次カード浮き上がり' },
      { label: 'Gemini でテイスト推定', status: 'done', note: 'カラー・パターン・シルエット' },
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
    percent: 55,
    items: [
      { label: '本番デプロイ稼働', status: 'done' },
      { label: '自動デプロイ', status: 'done' },
      { label: '楽天 API キー取得', status: 'done', note: '✨新仕様対応・本番稼働中' },
      { label: 'Yahoo!ショッピングAPIキー取得', status: 'in-progress', note: '新規ID制限の解除待ち（24-72h）' },
      { label: 'コスト爆発対策（上限/警告/ダッシュボード）', status: 'done', note: '新規' },
      { label: '本番でのダミーデータ事故防止', status: 'done', note: '新規' },
      { label: '利用規約', status: 'todo', note: '公開必須' },
      { label: 'プライバシーポリシー', status: 'todo', note: '公開必須' },
      { label: 'アプリ名確定（StyleMate は仮）', status: 'todo' },
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
      { label: 'Phase 5（よりリアルに試着）完成', status: 'todo', note: 'iOS着手前提' },
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
            AI ファッションコーデ × オンライン試着アプリ
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
            次の山：Phase 5（よりリアルにオンライン試着）
          </p>
        </div>

        {/* 今やってること / 次やること */}
        <div
          style={{
            background: '#fff',
            border: '2px solid #E8A0BF',
            borderRadius: 16,
            padding: 18,
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(232,160,191,0.15)',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#C4779B',
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            🎯 いま注力中
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#333',
              marginBottom: 4,
            }}
          >
            {NOW_DOING.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 14 }}>
            {NOW_DOING.subtitle}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                background: '#FFF8FB',
                borderRadius: 10,
                padding: '10px 12px',
                borderLeft: '3px solid #E8A0BF',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#C4779B', fontWeight: 700, marginBottom: 2 }}>
                🔄 今やってること
              </div>
              <div style={{ fontSize: '0.85rem', color: '#333' }}>{NOW_DOING.current}</div>
            </div>
            <div
              style={{
                background: '#F5F8FF',
                borderRadius: 10,
                padding: '10px 12px',
                borderLeft: '3px solid #6B8FE8',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#4A6FD6', fontWeight: 700, marginBottom: 2 }}>
                ⏭ 次やること
              </div>
              <div style={{ fontSize: '0.85rem', color: '#333' }}>{NOW_DOING.next}</div>
            </div>
          </div>
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
                  color: item.status === 'todo' ? '#888' : '#333',
                  fontWeight: item.status === 'in-progress' ? 700 : 400,
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
  if (status === 'in-progress') return '🔄'
  if (status === 'partial') return '🟡'
  return '⚪️'
}

function percentColor(percent: number): string {
  if (percent >= 90) return '#34D399'
  if (percent >= 60) return '#C4779B'
  if (percent >= 30) return '#E8A0BF'
  return '#bbb'
}
