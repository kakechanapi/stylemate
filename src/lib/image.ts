// 画像処理ユーティリティ
// - iPhone 標準の HEIC を JPEG に自動変換
// - 大きすぎる画像を AI 送信前にリサイズ
// - base64 data URL として返す

const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_MIME = /^image\/(heic|heif|heic-sequence|heif-sequence)$/i;

function isHeic(file: File): boolean {
  return HEIC_EXT.test(file.name) || HEIC_MIME.test(file.type);
}

async function heicToJpegBlob(file: File): Promise<Blob> {
  // 動的 import：HEIC でない場合は heic2any を読み込まない（バンドル軽量化）
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });
  return Array.isArray(out) ? out[0] : (out as Blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 画像を最大辺で指定サイズに収まるようリサイズし、JPEG として data URL を返す。
 * 元画像が既に小さければそのまま返す（無駄な再エンコードを避ける）。
 */
async function resizeIfNeeded(
  dataUrl: string,
  maxSize: number,
  quality = 0.88
): Promise<string> {
  const img = await loadImage(dataUrl);
  if (img.width <= maxSize && img.height <= maxSize) return dataUrl;

  const scale = maxSize / Math.max(img.width, img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export interface ProcessImageOptions {
  /** リサイズ後の最大辺（px）。default 1024 */
  maxSize?: number;
  /** JPEG 品質 0〜1。default 0.88 */
  quality?: number;
}

export interface ProcessedImage {
  /** 処理済み画像の base64 data URL */
  dataUrl: string;
  /** HEIC → JPEG 変換を行ったか */
  converted: boolean;
  /** リサイズを行ったか */
  resized: boolean;
}

/**
 * アップロードファイルを処理：
 *   1. HEIC なら JPEG に変換
 *   2. 最大辺 > maxSize ならリサイズ
 *   3. base64 data URL として返す
 *
 * すべての写真アップロード入り口（友達追加・服アップロード等）で使う。
 */
export async function processUploadedImage(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessedImage> {
  const { maxSize = 1024, quality = 0.88 } = options;

  let blob: Blob = file;
  let converted = false;

  if (isHeic(file)) {
    try {
      blob = await heicToJpegBlob(file);
      converted = true;
    } catch (e) {
      throw new Error(
        "HEIC画像の変換に失敗しました。設定 → カメラ → フォーマット → 互換性優先 にしてからお試しください"
      );
    }
  }

  const rawDataUrl = await blobToDataUrl(blob);
  const resizedDataUrl = await resizeIfNeeded(rawDataUrl, maxSize, quality);
  const resized = resizedDataUrl !== rawDataUrl;

  return { dataUrl: resizedDataUrl, converted, resized };
}

// ─────────────────────────────────────────────────
// 写真品質チェック（LoRA訓練の素材選定用）
// ─────────────────────────────────────────────────

export type PhotoQualityReason =
  | "too_small" // 解像度が低すぎる
  | "too_blurry" // ボケすぎている
  | "ok";

export interface PhotoQuality {
  width: number;
  height: number;
  /** 値が大きいほどシャープ（Laplacian variance, 0〜数千） */
  sharpness: number;
  isUsable: boolean;
  reason: PhotoQualityReason;
}

/**
 * 画像のシャープネスを Laplacian variance で評価する。
 * - グレースケール化 → 3x3 Laplacian で2次微分 → 分散
 * - ピントが合っていれば高い値、ボケていれば低い値
 *
 * 軽量・依存ゼロで動作。10〜30枚を選んだ時のクライアント側フィルタ用。
 */
function computeSharpness(img: HTMLImageElement): number {
  // 256x256 にダウンサンプルして計算高速化（精度は十分）
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  // グレースケール配列
  const gray = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }

  // Laplacian: lap = g(x-1,y) + g(x+1,y) + g(x,y-1) + g(x,y+1) - 4*g(x,y)
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      const lap =
        gray[i - 1] + gray[i + 1] + gray[i - SIZE] + gray[i + SIZE] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return variance;
}

/**
 * data URL を分析して LoRA素材として使えるかを判定。
 * - 解像度（短辺 512px 以上推奨）
 * - シャープネス（Laplacian variance 60 以上）
 */
export async function analyzeFacePhoto(dataUrl: string): Promise<PhotoQuality> {
  const img = await loadImage(dataUrl);
  const minSide = Math.min(img.width, img.height);
  const sharpness = computeSharpness(img);

  let reason: PhotoQualityReason = "ok";
  if (minSide < 384) reason = "too_small";
  else if (sharpness < 60) reason = "too_blurry";

  return {
    width: img.width,
    height: img.height,
    sharpness: Math.round(sharpness),
    isUsable: reason === "ok",
    reason,
  };
}

export const QUALITY_REASON_TEXT: Record<PhotoQualityReason, string> = {
  ok: "OK",
  too_small: "解像度が低い",
  too_blurry: "ピントが甘い",
};
