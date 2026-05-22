"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  /** YYYY-MM-DD 形式 */
  value: string;
  /** 値が変わった時のコールバック（YYYY-MM-DD） */
  onChange: (value: string) => void;
  /** 表示用ラベル（プレースホルダ）*/
  placeholder?: string;
}

/**
 * iPhone 風のホイール日付ピッカー
 * - タップで下から3列ホイール（年・月・日）が出現
 * - 1925年〜今年まで選択可（100年範囲）
 * - 完了ボタンで確定、キャンセルで破棄
 */
export default function WheelDatePicker({
  value,
  onChange,
  placeholder = "タップして選択",
}: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const currentYear = today.getFullYear();

  // パース：value が空なら 2000年1月1日 をデフォルトに
  const parseValue = (v: string) => {
    if (!v) return { y: 2000, m: 1, d: 1 };
    const [y, m, d] = v.split("-").map(Number);
    return { y: y || 2000, m: m || 1, d: d || 1 };
  };

  const initial = parseValue(value);
  const [year, setYear] = useState<number>(initial.y);
  const [month, setMonth] = useState<number>(initial.m);
  const [day, setDay] = useState<number>(initial.d);

  // value 変更時に内部 state を同期
  useEffect(() => {
    const p = parseValue(value);
    setYear(p.y);
    setMonth(p.m);
    setDay(p.d);
  }, [value]);

  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 日付ピッカー外の Wrapper：日が月末を超えていたら自動で修正
  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [daysInMonth, day]);

  const formatLabel = () => {
    if (!value) return null;
    const p = parseValue(value);
    return `${p.y}年${p.m}月${p.d}日`;
  };

  const handleDone = () => {
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${year}-${m}-${d}`);
    setOpen(false);
  };

  const handleCancel = () => {
    // 編集を破棄して元に戻す
    const p = parseValue(value);
    setYear(p.y);
    setMonth(p.m);
    setDay(p.d);
    setOpen(false);
  };

  return (
    <>
      {/* トリガー（input 風） */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-line rounded-xl px-4 py-3.5 text-[15px] flex items-center justify-between focus:outline-none focus:border-terracotta"
      >
        <span className={value ? "text-ink" : "text-[#b8a890]"}>
          {formatLabel() || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-ink-soft" strokeWidth={2} />
      </button>

      {/* モーダル */}
      {open && (
        <>
          <div
            onClick={handleCancel}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl shadow-2xl pb-8">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <button
                onClick={handleCancel}
                className="text-[15px] text-ink-soft font-medium px-2 py-1"
              >
                キャンセル
              </button>
              <span className="text-[14px] font-bold text-ink">誕生日</span>
              <button
                onClick={handleDone}
                className="text-[15px] text-terracotta font-bold px-2 py-1"
              >
                完了
              </button>
            </div>

            {/* 3列ホイール */}
            <div className="flex items-center gap-2 px-4 pt-2 pb-3 relative">
              <Wheel
                items={years}
                value={year}
                onChange={setYear}
                unit="年"
              />
              <Wheel
                items={months}
                value={month}
                onChange={setMonth}
                unit="月"
              />
              <Wheel
                items={days}
                value={day}
                onChange={setDay}
                unit="日"
              />
              {/* 中央のセレクション帯 */}
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 h-10 bg-terracotta/8 border-y border-terracotta/20 rounded-md" />
            </div>
          </div>
        </>
      )}
    </>
  );
}

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;

function Wheel({
  items,
  value,
  onChange,
  unit,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // value 変更時にスクロール位置を合わせる
  useEffect(() => {
    if (!ref.current) return;
    const idx = items.indexOf(value);
    if (idx >= 0) {
      ref.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }
  }, [value, items]);

  // スクロール時にスナップ判定
  const handleScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const newVal = items[clamped];
      if (newVal !== value) onChange(newVal);
      // 位置を完全にスナップ
      ref.current.scrollTo({
        top: clamped * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }, 150);
  };

  return (
    <div className="flex-1 relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-[200px] overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{
          scrollPaddingTop: ITEM_HEIGHT * 2,
          paddingTop: ITEM_HEIGHT * 2,
          paddingBottom: ITEM_HEIGHT * 2,
        }}
      >
        {items.map((it) => (
          <div
            key={it}
            onClick={() => onChange(it)}
            className={`h-[40px] flex items-center justify-center text-[17px] snap-center cursor-pointer transition-all ${
              it === value
                ? "text-ink font-bold"
                : "text-ink-soft/60"
            }`}
          >
            {it}
            <span className="text-[11px] text-ink-soft/60 ml-0.5">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
