// IndexedDB ベースの Blob ストア
// 大容量データ（試着画像・ダンス動画）を保存する
// localStorage は文字列メタデータ（ID・名前等）のみに使う

import { openDB, DBSchema, IDBPDatabase } from "idb";

const DB_NAME = "giftwear_blobs";
const DB_VERSION = 1;
const STORE = "blobs";

interface BlobEntry {
  id: string;
  blob: Blob;
  contentType: string;
  size: number;
  createdAt: number;
}

interface GiftWearDB extends DBSchema {
  blobs: {
    key: string;
    value: BlobEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<GiftWearDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<GiftWearDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/** base64 data URL を Blob に変換 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const match = header.match(/data:([^;]+);base64/);
  const contentType = match ? match[1] : "application/octet-stream";
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

/** 外部URL からダウンロードして Blob にする */
export async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.blob();
}

/** Blob を IndexedDB に保存 */
export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put(STORE, {
    id,
    blob,
    contentType: blob.type,
    size: blob.size,
    createdAt: Date.now(),
  });
}

/** Blob を取得して Object URL を返す（components で <img src> に使う） */
export async function getBlobUrl(id: string): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  const entry = await db.get(STORE, id);
  if (!entry) return null;
  return URL.createObjectURL(entry.blob);
}

/** Object URL を解放 */
export function revokeBlobUrl(url: string) {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

/** Blob を削除（試着・ダンス削除時に呼ぶ） */
export async function deleteBlob(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE, id);
}

/** 全 Blob のサイズ合計を取得 */
export async function getStorageStats(): Promise<{
  count: number;
  totalBytes: number;
}> {
  const db = await getDB();
  if (!db) return { count: 0, totalBytes: 0 };
  const all = await db.getAll(STORE);
  return {
    count: all.length,
    totalBytes: all.reduce((s, e) => s + e.size, 0),
  };
}

/**
 * 画像 ref（data: URL / http URL / IndexedDB key）を data URL に解決する。
 * API ペイロード（Replicate 等）に画像を直接埋め込みたい時に使う。
 */
export async function resolveToDataUrl(ref: string): Promise<string> {
  if (ref.startsWith("data:")) return ref;
  if (ref.startsWith("http")) {
    const blob = await urlToBlob(ref);
    return await blobToDataUrl(blob);
  }
  // IndexedDB key
  const db = await getDB();
  if (!db) throw new Error("IndexedDB not available");
  const entry = await db.get(STORE, ref);
  if (!entry) throw new Error("Blob not found in IDB: " + ref);
  return await blobToDataUrl(entry.blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** ID 一覧（リスト表示用） */
export async function listBlobIds(): Promise<string[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAllKeys(STORE);
}

/** 開発デバッグ用：全件削除 */
export async function clearAllBlobs(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.clear(STORE);
}
