// 利用規約（暫定版）
// 公開前の必須ページ。正式リリース時に事業者情報等を追記して更新する。
import Link from 'next/link'

export const metadata = {
  title: '利用規約 | StyleMate',
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

export default function TermsPage() {
  return (
    <div style={{ padding: '24px 16px 60px', maxWidth: 640, margin: '0 auto' }}>
      <Link href="/my" style={{ fontSize: '0.8rem', color: '#C4779B', textDecoration: 'none', fontWeight: 700 }}>
        ← マイページへ戻る
      </Link>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#333', margin: '16px 0 4px' }}>
        利用規約
      </h1>
      <p style={{ fontSize: '0.7rem', color: '#999', marginBottom: 20 }}>
        最終更新日：2026年7月3日（暫定版）
      </p>

      <p style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.8, marginBottom: 20 }}>
        この利用規約（以下「本規約」）は、StyleMate（仮称・以下「本サービス」）の提供条件および本サービスの利用に関する当方とユーザーとの間の権利義務関係を定めるものです。本サービスを利用する前に必ずお読みください。
      </p>

      <Section title="第1条（適用）">
        本規約は、ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されます。本サービスを利用した時点で、本規約に同意したものとみなします。
      </Section>

      <Section title="第2条（サービスの概要）">
        本サービスは、ユーザーが登録した服の情報をもとに、AI 技術によるコーディネート提案・試着画像の生成・関連商品の紹介等を行うものです。本サービスは現在ベータ版として無料で提供していますが、AI 生成機能には利用回数の上限があります。生成結果の品質・正確性は保証されません。
      </Section>

      <Section title="第3条（アカウント）">
        本サービスの利用には、Google アカウントまたはメールアドレスによる登録が必要です。アカウントの管理はユーザー自身の責任で行うものとし、第三者による不正利用について当方は責任を負いません。
      </Section>

      <Section title="第4条（禁止事項）">
        ユーザーは、以下の行為をしてはなりません。
        <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>ご本人または明示的な同意を得ていない第三者の写真をアップロードする行為</li>
          <li>未成年者の写真を保護者の同意なくアップロードする行為</li>
          <li>公序良俗に反する画像（わいせつ・差別・暴力的内容等）の生成・共有</li>
          <li>有名人その他の他人になりすます目的での利用</li>
          <li>本サービスの生成機能を自動化・大量利用するなど、運営を妨害する行為</li>
          <li>不正アクセス、リバースエンジニアリングその他法令に違反する行為</li>
        </ul>
      </Section>

      <Section title="第5条（広告・アフィリエイトについて）">
        本サービスは「楽天アフィリエイト」をはじめとするアフィリエイト・プログラムに参加しており、本サービス内の商品リンクを経由して商品が購入された場合、当方が紹介料を受け取ることがあります。商品の購入契約は、ユーザーと各 EC サイト運営者との間で成立するものであり、商品・取引に関するトラブルについて当方は責任を負いません。
      </Section>

      <Section title="第6条（知的財産権）">
        本サービスのコンテンツ・デザイン・コードに関する権利は当方または正当な権利者に帰属します。ユーザーが生成した画像の利用権は原則ユーザーに帰属しますが、第三者の肖像権・著作権を侵害しないことはユーザー自身の責任です。
      </Section>

      <Section title="第7条（生成物の取り扱い）">
        AI が生成するコーディネート提案・試着画像は、実在の衣服の色味・サイズ感・着用イメージと異なる場合があります。商品の購入判断にあたっては、生成物が実物と異なる可能性があることをご了承ください。
      </Section>

      <Section title="第8条（サービスの変更・中止）">
        当方は、ユーザーに通知することなく本サービスの内容を変更・中止することができ、これによりユーザーに生じた損害について一切の責任を負いません。
      </Section>

      <Section title="第9条（免責事項）">
        当方は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しません。本サービスの利用に起因してユーザーに生じたあらゆる損害について、当方の故意または重過失による場合を除き、責任を負いません。
      </Section>

      <Section title="第10条（規約の変更）">
        当方は、必要と判断した場合には、本規約を変更できるものとします。変更後の本規約は本ページに掲示した時点から効力を生じます。
      </Section>

      <Section title="第11条（準拠法・裁判管轄）">
        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当方の所在地を管轄する裁判所を専属的合意管轄とします。
      </Section>

      <p style={{ fontSize: '0.7rem', color: '#999', lineHeight: 1.8, marginTop: 24 }}>
        ※ 本ページは暫定版です。正式版公開時に内容を更新します。お問い合わせは
        プライバシーポリシー記載の連絡先までお願いします。
      </p>
    </div>
  )
}
