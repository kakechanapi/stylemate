// 自分の全身写真を端末内 IndexedDB に保存。
// プライバシー方針：サーバーに永続保存しない。
// コーデ試着 API 呼び出し時のみ base64 で送信し、生成後は Replicate 側で削除される想定。

const DB_NAME = 'stylemate'
const STORE = 'user-photos'
const KEY = 'self-fullbody'
const KEY_VERSION = 'self-fullbody-version'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSelfPhoto(base64: string): Promise<number> {
  const db = await openDB()
  // 既存 version を取得し +1。試着結果キャッシュの無効化キーになる。
  const currentVersion = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(KEY_VERSION)
    req.onsuccess = () => resolve((req.result as number) || 0)
    req.onerror = () => reject(req.error)
  })
  const nextVersion = currentVersion + 1
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(base64, KEY)
    tx.objectStore(STORE).put(nextVersion, KEY_VERSION)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return nextVersion
}

export async function loadSelfPhoto(): Promise<{ base64: string; version: number } | null> {
  try {
    const db = await openDB()
    const result = await new Promise<{ base64: string; version: number } | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const store = tx.objectStore(STORE)
        const photoReq = store.get(KEY)
        const versionReq = store.get(KEY_VERSION)
        tx.oncomplete = () => {
          const base64 = (photoReq.result as string) || null
          const version = (versionReq.result as number) || 0
          resolve(base64 ? { base64, version } : null)
        }
        tx.onerror = () => reject(tx.error)
      }
    )
    db.close()
    return result
  } catch {
    return null
  }
}

/** 互換維持：base64 のみ欲しい時用 */
export async function loadSelfPhotoBase64(): Promise<string | null> {
  const p = await loadSelfPhoto()
  return p?.base64 || null
}

export async function clearSelfPhoto(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    // version は残す（再登録で必ず +1 されてキャッシュ無効化が継続される）
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function hasSelfPhoto(): Promise<boolean> {
  const photo = await loadSelfPhoto()
  return !!photo
}
