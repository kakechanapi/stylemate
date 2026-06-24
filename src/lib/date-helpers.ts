// 日付ヘルパー：タイムゾーン問題を一箇所に集約
//
// Next.js の Server Action は Vercel の UTC タイムゾーンで動くため、
// `new Date().toISOString().slice(0, 10)` を使うと
// 日本時間の早朝（UTC でまだ前日）に「今日のコーデ」が前日として
// 保存される不具合が起きていた。
//
// このアプリは日本ユーザー前提なので、Asia/Tokyo 固定で日付を扱う。

const APP_TZ = 'Asia/Tokyo'

/**
 * JST（日本時間）での YYYY-MM-DD 文字列を返す。
 * - サーバー（UTC）で実行しても、クライアント（JST）で実行しても結果は同じ
 * - 'en-CA' locale は YYYY-MM-DD 形式を返すという小技を利用
 */
export function toJSTDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** N 日前の JST 日付を YYYY-MM-DD で返す */
export function jstDateStrDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return toJSTDateStr(d)
}
