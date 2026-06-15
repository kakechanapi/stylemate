"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Plus, X, Check, AlertTriangle, Sparkles } from "lucide-react";
import {
  processUploadedImage,
  analyzeFacePhoto,
  QUALITY_REASON_TEXT,
  PhotoQuality,
} from "@/lib/image";

export interface FacePhoto {
  /** 一意ID（IndexedDB key にもなる） */
  id: string;
  /** プレビュー用 data URL（IndexedDB保存は親側で行う） */
  dataUrl: string;
  /** 品質チェック結果 */
  quality: PhotoQuality;
}

export interface FacePhotoPickerHandle {
  /** 親（円形ボタン等）からファイル選択ダイアログを開く */
  openFileDialog: () => void;
}

interface Props {
  photos: FacePhoto[];
  onChange: (photos: FacePhoto[]) => void;
  /** 最大枚数（推奨は20）。デフォルト30 */
  max?: number;
  /** グリッド内の「+」追加タイルを表示するか。デフォルト true */
  showAddTile?: boolean;
}

const MIN_USABLE = 5; // LoRA訓練に必要な最低枚数（おおよそ）

const FacePhotoPicker = forwardRef<FacePhotoPickerHandle, Props>(function FacePhotoPicker(
  { photos, onChange, max = 30, showAddTile = true },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(0); // 0〜100

  useImperativeHandle(ref, () => ({
    openFileDialog: () => inputRef.current?.click(),
  }));

  const usableCount = photos.filter((p) => p.quality.isUsable).length;
  const remaining = max - photos.length;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const slots = files.slice(0, remaining);
    const total = slots.length;
    let done = 0;
    setProcessing(1);

    const newPhotos: FacePhoto[] = [];
    for (const file of slots) {
      try {
        const { dataUrl } = await processUploadedImage(file, { maxSize: 1024 });
        const quality = await analyzeFacePhoto(dataUrl);
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dataUrl,
          quality,
        });
      } catch (err) {
        console.warn("[FacePhotoPicker] skip file:", file.name, err);
      }
      done++;
      setProcessing(Math.round((done / total) * 100));
    }

    onChange([...photos, ...newPhotos]);
    setProcessing(0);
    // 同じファイルを再選択できるよう値をリセット
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeOne = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* ヒント */}
      <div className="bg-gradient-to-br from-terracotta/10 to-gold/10 border border-gold rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-terracotta" strokeWidth={2.2} />
          <span className="text-[12px] font-bold text-terracotta tracking-wider">
            よりリアルにオンライン試着
          </span>
        </div>
        <p className="text-[11px] text-ink-soft leading-relaxed mb-2">
          複数枚の写真があると AI がその人を正確に学習し、
          <b className="text-ink">自分そっくり</b>にオンライン試着できます。
        </p>
        <ul className="text-[11px] text-ink-soft leading-relaxed space-y-0.5">
          <li>・ <b className="text-ink">5〜20枚</b>あると効果大</li>
          <li>・ <b className="text-ink">正面・斜め・横顔</b>を混ぜる</li>
          <li>・ <b className="text-ink">笑顔・無表情</b>の両方</li>
          <li>
            ・ iPhone は「写真」→「<b className="text-ink">人物</b>」アルバムから一括選択が便利
          </li>
        </ul>
      </div>

      {/* グリッド */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-line"
          >
            <img
              src={p.dataUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* 削除 */}
            <button
              type="button"
              onClick={() => removeOne(p.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="削除"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            {/* 品質バッジ */}
            {p.quality.isUsable ? (
              <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                OK
              </div>
            ) : (
              <div className="absolute bottom-1 left-1 right-1 flex items-center gap-0.5 bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
                <span className="truncate">
                  {QUALITY_REASON_TEXT[p.quality.reason]}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* 追加ボタン（親が円形ボタンで代用する場合は非表示） */}
        {showAddTile && photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing > 0}
            className="aspect-square rounded-xl border-2 border-dashed border-gold bg-cream-light flex flex-col items-center justify-center gap-1 text-terracotta active:opacity-70 disabled:opacity-50"
          >
            <Plus className="w-7 h-7" strokeWidth={2} />
            <span className="text-[10px] font-bold">
              {processing > 0 ? `${processing}%` : "追加"}
            </span>
          </button>
        )}
      </div>

      {/* 処理中の進捗（+タイルを隠している時に見えるよう独立表示） */}
      {!showAddTile && processing > 0 && (
        <div className="text-[11px] text-terracotta font-semibold text-center">
          処理中… {processing}%
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* カウンター */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-soft">
            選択 <b className="text-ink">{photos.length}</b> 枚
            <span className="mx-1.5 text-line">/</span>
            使用可能{" "}
            <b
              className={
                usableCount >= MIN_USABLE
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            >
              {usableCount}
            </b>{" "}
            枚
          </span>
          {usableCount < MIN_USABLE && (
            <span className="text-amber-600 font-semibold">
              あと {MIN_USABLE - usableCount} 枚で十分な品質
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default FacePhotoPicker;
