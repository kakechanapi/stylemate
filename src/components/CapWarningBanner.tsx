// 月間使用量が上限の80%を超えた時に表示する警告バナー
// 100%超過時は試着・LoRA訓練がブロックされる旨を明示する。

import { getCapStatus } from '@/lib/usage-cost'

export default async function CapWarningBanner() {
  const status = await getCapStatus()
  if (status.warningLevel === 0) return null

  const isBlocked = status.warningLevel === 2
  const percent = Math.min(999, Math.round(status.ratio * 100))

  return (
    <div
      style={{
        background: isBlocked ? '#FFE5E5' : '#FFF3CD',
        border: `2px solid ${isBlocked ? '#F87171' : '#FFE08A'}`,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        fontSize: '0.78rem',
        color: isBlocked ? '#991b1b' : '#856404',
        lineHeight: 1.6,
      }}
    >
      {isBlocked ? '🛑 ' : '⚠️ '}
      <strong>
        {isBlocked
          ? '今月の使用上限に達しました'
          : '今月の使用上限に近づいています'}
      </strong>
      <br />
      使用量：{status.used.toLocaleString()}円 /{' '}
      {status.cap.toLocaleString()}円（{percent}%）
      <br />
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 3,
          margin: '6px 0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, status.ratio * 100)}%`,
            background: isBlocked ? '#EF4444' : '#F59E0B',
            borderRadius: 3,
          }}
        />
      </div>
      {isBlocked ? (
        <>試着・本人モード訓練は来月までお待ちください。コーデ提案は引き続きご利用いただけます。</>
      ) : (
        <>残り {status.remaining.toLocaleString()}円分です。試着・本人モード訓練の利用にご注意ください。</>
      )}
    </div>
  )
}
