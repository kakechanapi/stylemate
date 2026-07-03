// プライバシーポリシー（暫定版）
// 公開前の必須ページ。人物写真の取扱い（端末内保存・試着時のみ送信）が中核。
// 実装と食い違う記載をしないこと：
// - 人物写真の原本は IndexedDB（src/lib/self-photo-db.ts）
// - 試着結果は private バケット + 期限付き URL（app/api/coord-tryon/route.ts）
// - 位置情報は天気 API 呼び出しのみに使用・保存なし（OutfitSuggestionCard）
import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | StyleMate',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333', marginBottom: 6 }}>
        {title}
      </h2>
      <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

const CONTACT_EMAIL = 'kakeruha0602@gmail.com'

export default function PrivacyPage() {
  return (
    <div style={{ padding: '24px 16px 60px', maxWidth: 640, margin: '0 auto' }}>
      <Link href="/my" style={{ fontSize: '0.8rem', color: '#C4779B', textDecoration: 'none', fontWeight: 700 }}>
        ← マイページへ戻る
      </Link>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', margin: '16px 0 4px' }}>
        プライバシーポリシー
      </h1>
      <p style={{ fontSize: '0.7rem', color: '#999', marginBottom: 20 }}>
        最終更新日：2026年7月3日（暫定版）
      </p>

      <p style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.8, marginBottom: 20 }}>
        StyleMate（仮称・以下「本サービス」）における、ユーザーの個人情報・画像データの取扱いについて、以下のとおり定めます。
      </p>

      <Section title="1. 取り扱う情報">
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>アカウント情報（メールアドレス、Google アカウントの基本情報）</li>
          <li>登録された服の情報・画像（クローゼット）</li>
          <li>予定・着用記録・お相手（友人）として登録された情報</li>
          <li>好み学習のためのスワイプ履歴</li>
          <li>人物（ご本人・お相手）の写真</li>
          <li>位置情報（天気取得のため・任意）</li>
          <li>AI 生成機能の利用ログ（回数・概算コスト）</li>
        </ul>
      </Section>

      <Section title="2. 人物写真の取扱いについて（重要）">
        人物の写真は本サービスの試着機能に必要な範囲でのみ利用し、以下を遵守します。
        <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>
            写真の原本は<b>ユーザー端末内のブラウザストレージ（IndexedDB）にのみ保存</b>し、当方のサーバーには永続的に保存しません
          </li>
          <li>
            試着画像の生成時にのみ、写真を外部 AI サービス（Replicate Inc.）へ一時的に送信します。生成処理後、当方が原本をサーバーに保持することはありません
          </li>
          <li>
            生成された試着画像（顔が映る画像）は、<b>ご本人のみがアクセスできる非公開領域</b>に保存し、期限付き URL でのみ表示します
          </li>
          <li>顔認証・本人特定の目的では利用しません</li>
          <li>第三者への提供・販売は行いません</li>
          <li>端末内の写真は、アプリ内の「削除」操作で即座に消去できます</li>
        </ul>
        ご本人または明示的に同意を得た方の写真のみアップロードしてください。
      </Section>

      <Section title="3. クラウドに保存する情報">
        服の画像・コーディネート記録・予定・スワイプ履歴等は、サービス提供のためクラウド（Supabase）に保存します。これらはアカウントごとに隔離されており、アカウントの削除にともない消去されます。
      </Section>

      <Section title="4. 外部サービスへの送信">
        本サービスは以下の外部サービスを利用します。
        <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>
            <b>Replicate Inc.（米国）</b>：試着画像の生成のため、人物写真・服の画像を送信します
          </li>
          <li>
            <b>Google Gemini API（米国）</b>：コーディネート提案・画像解析のため、服の画像・関連テキストを送信します
          </li>
          <li>
            <b>Supabase Inc.（米国）</b>：データベース・認証・画像ストレージ
          </li>
          <li>
            <b>Vercel Inc.（米国）</b>：本サービスのホスティング
          </li>
          <li>
            <b>Open-Meteo</b>：天気情報の取得のため、位置座標のみを送信します（保存しません）
          </li>
          <li>
            <b>各 EC サイト（楽天市場等）</b>：商品リンクのクリック時に各社サイトへ遷移します。遷移後の情報取扱いは各社のポリシーに従います
          </li>
        </ul>
      </Section>

      <Section title="5. 位置情報">
        天気に応じたコーディネート提案のため、ユーザーの許可を得た場合にのみ位置情報を取得します。座標は天気情報の取得のみに利用し、当方のサーバーには保存しません。許可しない場合は既定の地域（東京）の天気が使用されます。
      </Section>

      <Section title="6. アフィリエイトについて">
        本サービスは「楽天アフィリエイト」に参加しており、商品リンクを経由して商品が購入された場合、当方が紹介料を受け取ることがあります。
      </Section>

      <Section title="7. Cookie・アクセス解析">
        ログイン状態の維持のために Cookie を使用します。個人を特定する目的の Cookie・広告トラッキングは使用しません。
      </Section>

      <Section title="8. データの削除・退会">
        登録した服・記録等はアプリ内の削除操作でいつでも削除できます。アカウント自体の削除（退会）をご希望の場合は、下記の連絡先までご連絡ください。確認のうえ、クラウドに保存されたデータを削除します。
      </Section>

      <Section title="9. ポリシーの改定">
        本ポリシーは、法令の変更やサービス内容の変更にともない改定されることがあります。重要な変更がある場合は、本ページの更新をもってお知らせします。
      </Section>

      <Section title="10. お問い合わせ">
        本ポリシーおよび個人情報の取扱いに関するお問い合わせは、
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4779B' }}>
          {CONTACT_EMAIL}
        </a>
        までお願いします。
      </Section>

      <p style={{ fontSize: '0.7rem', color: '#999', lineHeight: 1.8, marginTop: 24 }}>
        ※ 本ページは暫定版です。正式版公開時に内容を更新します。
      </p>
    </div>
  )
}
