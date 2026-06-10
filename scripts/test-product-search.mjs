#!/usr/bin/env node
/**
 * 楽天/Yahoo 商品検索 API の動作確認スクリプト
 *
 * 使い方:
 *   npm run test:product-search ニット
 *   node scripts/test-product-search.mjs ジーンズ
 *
 * 動作:
 *   1. .env.local から RAKUTEN_ACCESS_KEY / YAHOO_SHOPPING_APP_ID を読み込み
 *   2. 楽天は 3つの認証スキームを順番に試す（旧 applicationId / Bearer / ESA）
 *   3. Yahoo は appid クエリで叩く
 *   4. 各 API のレスポンス（HTTP・エラー詳細・上位3件）を見やすく表示
 *
 * 新キー取得時の使い方:
 *   1. .env.local の RAKUTEN_ACCESS_KEY を新キーに書き換え
 *   2. このスクリプトを実行
 *   3. どのスキームで動いたか確認 → src/lib/product-search/sources/rakuten.ts を合わせる
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
  const key = process.env.RAKUTEN_ACCESS_KEY
  info(`キー: ${maskKey(key)}`)
  if (!key) {
    ng('RAKUTEN_ACCESS_KEY が未設定')
    return
  }

  const endpoint = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601'
  const schemes = [
    {
      name: 'applicationId クエリ（旧来）',
      build: () => {
        const u = new URL(endpoint)
        u.searchParams.set('applicationId', key)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: {} }
      },
    },
    {
      name: 'Authorization: ESA（現コード）',
      build: () => {
        const u = new URL(endpoint)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: { headers: { Authorization: `ESA ${key}` } } }
      },
    },
    {
      name: 'Authorization: Bearer',
      build: () => {
        const u = new URL(endpoint)
        u.searchParams.set('keyword', keyword)
        u.searchParams.set('hits', '3')
        return { url: u.toString(), init: { headers: { Authorization: `Bearer ${key}` } } }
      },
    },
  ]

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
    info(
      '💡 全スキーム失敗。新仕様の場合は楽天ドキュメントを再確認、'
    )
    info(
      '   または webservice.rakuten.co.jp でキーが現在も有効か確認してください。'
    )
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
