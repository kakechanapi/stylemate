#!/usr/bin/env node
/**
 * 楽天/Yahoo 商品検索 API の動作確認スクリプト
 *
 * 使い方:
 *   npm run test:product-search ニット
 *   node scripts/test-product-search.mjs ジーンズ
 *
 * 動作:
 *   1. .env.local から認証情報を読み込み
 *      - RAKUTEN_APPLICATION_ID（20桁の数字。webservice.rakuten.co.jp/app/list で確認）
 *      - RAKUTEN_ACCESS_KEY（pk_... 形式。同管理画面に表示）
 *      - YAHOO_SHOPPING_APP_ID（Yahoo!デベロッパーネットワーク）
 *   2. 楽天は複数のスキームを順番に試す
 *      新エンドポイント: openapi.rakuten.co.jp/ichibams/api/.../20260401
 *      旧エンドポイント: app.rakuten.co.jp/services/api/.../20220601
 *   3. Yahoo は appid クエリで叩く
 *   4. レスポンス（HTTP・エラー詳細・上位3件）を色付き表示
 *
 * 楽天の新仕様（2026-04-01〜）:
 *   - applicationId + accessKey の両方が必須
 *   - accessKey はクエリ or HTTP ヘッダー（ヘッダー名は試行錯誤中）
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

// .env.local を簡易パース（dotenv 依存を避ける）
async function loadEnv() {
  try {
    const text = await readFile(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i)
      if (!m) continue
      const [, key, raw] = m
      const value = raw.replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = value
    }
  } catch (e) {
    console.warn('[env] .env.local 読み込み失敗:', e.message)
  }
}

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function header(label) {
  console.log()
  console.log(`${C.bold}${C.cyan}━━━ ${label} ━━━${C.reset}`)
}

function ok(msg) {
  console.log(`  ${C.green}✓${C.reset} ${msg}`)
}
function ng(msg) {
  console.log(`  ${C.red}✗${C.reset} ${msg}`)
}
function info(msg) {
  console.log(`  ${C.dim}${msg}${C.reset}`)
}

function maskKey(key) {
  if (!key) return '(未設定)'
  if (key.length <= 10) return `${key.slice(0, 4)}…(${key.length}文字)`
  return `${key.slice(0, 8)}…${key.slice(-4)} (${key.length}文字)`
}

async function safeFetch(url, init) {
  try {
    const res = await fetch(url, init)
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    return { ok: res.ok, status: res.status, body }
  } catch (e) {
    return { ok: false, status: 0, body: { fetchError: e.message } }
  }
}

function snippet(body) {
  const str = typeof body === 'object' ? JSON.stringify(body) : String(body)
  return str.length > 220 ? `${str.slice(0, 220)}…` : str
}

async function tryRakuten(keyword) {
  header('楽天市場 IchibaItem Search')
  const accessKey = process.env.RAKUTEN_ACCESS_KEY
  const appId = process.env.RAKUTEN_APPLICATION_ID
  info(`accessKey (pk_...): ${maskKey(accessKey)}`)
  info(`applicationId:     ${maskKey(appId)}`)

  if (!accessKey && !appId) {
    ng('RAKUTEN_ACCESS_KEY / RAKUTEN_APPLICATION_ID どちらも未設定')
    return
  }

  // 新エンドポイント（2026-04-01）と旧エンドポイントの両方を試す
  const newEndpoint =
    'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401'
  const oldEndpoint =
    'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601'

  const schemes = []

  // ── 新仕様（推奨）：applicationId + accessKey の両方
  if (appId && accessKey) {
    schemes.push({
      name: '【新】両キー・クエリ',
      build: () => {
        const u = new URL(newEndpoint)
        u.searchParams.set('applicationId', appId)
        u.searchParams.set('accessKey', accessKey)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: {} }
      },
    })
    schemes.push({
      name: '【新】applicationIdクエリ + accessKey ヘッダー(Authorization Bearer)',
      build: () => {
        const u = new URL(newEndpoint)
        u.searchParams.set('applicationId', appId)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return {
          url: u.toString(),
          init: { headers: { Authorization: `Bearer ${accessKey}` } },
        }
      },
    })
    schemes.push({
      name: '【新】applicationIdクエリ + X-Rakuten-AccessKey ヘッダー',
      build: () => {
        const u = new URL(newEndpoint)
        u.searchParams.set('applicationId', appId)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return {
          url: u.toString(),
          init: { headers: { 'X-Rakuten-AccessKey': accessKey } },
        }
      },
    })
  }

  // ── accessKey 単独で新エンドポイントを叩く（applicationId 不要の可能性チェック）
  if (accessKey && !appId) {
    schemes.push({
      name: '【新】accessKey 単独・クエリ（applicationId 未取得時の試行）',
      build: () => {
        const u = new URL(newEndpoint)
        u.searchParams.set('accessKey', accessKey)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: {} }
      },
    })
  }

  // ── 旧仕様の互換性チェック（applicationId のみ）
  if (appId) {
    schemes.push({
      name: '【旧】applicationId クエリ（互換性チェック）',
      build: () => {
        const u = new URL(oldEndpoint)
        u.searchParams.set('applicationId', appId)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: {} }
      },
    })
  }

  // ── 現コードと同じ（旧エンドポイント + ESA ヘッダー）
  if (accessKey) {
    schemes.push({
      name: '【旧コード】Authorization: ESA',
      build: () => {
        const u = new URL(oldEndpoint)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return {
          url: u.toString(),
          init: { headers: { Authorization: `ESA ${accessKey}` } },
        }
      },
    })
  }

  let anySuccess = false
  for (const s of schemes) {
    const { url, init } = s.build()
    const r = await safeFetch(url, init)
    if (r.ok && Array.isArray(r.body?.Items) && r.body.Items.length > 0) {
      ok(`${s.name} → HTTP ${r.status} · ${r.body.Items.length}件`)
      r.body.Items.slice(0, 3).forEach((it, i) => {
        info(`   ${i + 1}. ${(it.Item?.itemName || '').slice(0, 60)}`)
      })
      anySuccess = true
    } else {
      ng(`${s.name} → HTTP ${r.status} · ${snippet(r.body)}`)
    }
  }

  if (!anySuccess) {
    console.log()
    info('💡 全スキーム失敗。')
    if (!appId) {
      info('   applicationId（20桁数字）が未設定です。')
      info('   https://webservice.rakuten.co.jp/app/list でアプリ詳細を開いて確認、')
      info('   .env.local に RAKUTEN_APPLICATION_ID=... を追加してください。')
    } else {
      info('   キーが両方揃っていて全失敗の場合：')
      info('   - 数字とpk_が逆になっていないか確認')
      info('   - アプリのステータスが「公開」になっているか確認')
    }
  }
}

async function tryYahoo(keyword) {
  header('Yahoo!ショッピング ItemSearch V3')
  const key = process.env.YAHOO_SHOPPING_APP_ID
  info(`キー: ${maskKey(key)}`)
  if (!key) {
    ng('YAHOO_SHOPPING_APP_ID が未設定（取得後 .env.local に追加してください）')
    return
  }

  const u = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch')
  u.searchParams.set('appid', key)
  u.searchParams.set('query', keyword)
  u.searchParams.set('results', '3')
  u.searchParams.set('in_stock', 'true')
  u.searchParams.set('image_size', '300')

  const r = await safeFetch(u.toString())
  if (r.ok && Array.isArray(r.body?.hits) && r.body.hits.length > 0) {
    ok(`HTTP ${r.status} · ${r.body.hits.length}件`)
    r.body.hits.slice(0, 3).forEach((it, i) => {
      info(`   ${i + 1}. ${(it.name || '').slice(0, 60)}`)
    })
  } else {
    ng(`HTTP ${r.status} · ${snippet(r.body)}`)
  }
}

const keyword = process.argv[2] || 'ニット'

await loadEnv()
console.log(`${C.bold}🔍 検索キーワード: "${keyword}"${C.reset}`)

await tryRakuten(keyword)
await tryYahoo(keyword)

console.log()
console.log(`${C.dim}使い方: npm run test:product-search [キーワード]${C.reset}`)
console.log(`${C.dim}例:     npm run test:product-search ジーンズ${C.reset}`)
console.log()
