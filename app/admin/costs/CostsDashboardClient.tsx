'use client'

import { useEffect, useState, useTransition } from 'react'
import type { DashboardSummary } from '@/lib/admin-costs-shared'
import { getServiceLabel } from '@/lib/admin-costs-shared'
import { refreshDashboardAction } from './actions'

const REFRESH_INTERVAL_MS = 30_000

export default function CostsDashboardClient({ initial }: { initial: DashboardSummary }) {
  const [data, setData] = useState<DashboardSummary>(initial)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [auto, setAuto] = useState(true)
  const [, startTransition] = useTransition()

  const refresh = () => {
    startTransition(async () => {
      const next = await refreshDashboardAction()
      setData(next)
      setLastUpdated(new Date())
    })
  }

  useEffect(() => {
    if (!auto) return
    const t = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  const maxDaily = Math.max(1, ...data.daily.map((d) => d.cost))

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#333' }}>💰 コストダッシュボード</h1>
        <div style={{ fontSize: '0.7rem', color: '#999' }}>
          {lastUpdated.toLocaleTimeString('ja-JP')} 更新
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={refresh}
          style={{
            background: '#fff',
            color: '#C4779B',
            border: '2px solid #E8A0BF',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🔄 今すぐ更新
        </button>
        <label style={{ fontSize: '0.78rem', color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          30秒ごとに自動更新
        </label>
      </div>

      {/* 大きな数字：今日と今月 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <BigStat label="今日" value={data.todayTotal} highlight={data.todayTotal > 100} />
        <BigStat label="今月" value={data.monthTotal} highlight={data.monthTotal > 1000} />
      </div>

      {/* サービス別内訳 */}
      <Card title="サービス別（今月）">
        {Object.keys(data.byService).length === 0 ? (
          <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>
            まだ使用ログがありません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.byService)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([service, agg]) => (
                <div
                  key={service}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#FFF8FB',
                    borderRadius: 10,
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ color: '#333' }}>{getServiceLabel(service)}</span>
                  <span>
                    <span style={{ color: '#999', marginRight: 8 }}>
                      {agg.count}回
                    </span>
                    <span style={{ color: '#C4779B', fontWeight: 700 }}>
                      ¥{agg.cost.toLocaleString()}
                    </span>
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* ユーザー別トップ10 */}
      <Card title="ユーザー別（今月 Top10）">
        {data.topUsers.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>
            該当ユーザーなし
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.topUsers.map((u, i) => (
              <div
                key={u.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: '#FFF8FB',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ fontWeight: 800, color: '#C4779B', width: 24 }}>{i + 1}</span>
                <span style={{ flex: 1, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.username || u.user_id.slice(0, 8)}
                </span>
                <span style={{ color: '#999' }}>{u.count}回</span>
                <span style={{ color: '#C4779B', fontWeight: 700, width: 80, textAlign: 'right' }}>
                  ¥{u.cost.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 過去30日のトレンド */}
      <Card title="過去30日のコスト推移">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
          {data.daily.map((d) => {
            const h = (d.cost / maxDaily) * 100
            return (
              <div
                key={d.date}
                title={`${d.date}: ¥${d.cost.toLocaleString()}`}
                style={{
                  flex: 1,
                  minWidth: 4,
                  background: d.cost > 0 ? 'linear-gradient(to top, #E8A0BF, #C4779B)' : '#FFE4F0',
                  height: `${Math.max(2, h)}%`,
                  borderRadius: 2,
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#bbb', marginTop: 6 }}>
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </Card>

      {/* 直近20件 */}
      <Card title="直近の呼び出し">
        {data.recent.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>
            データなし
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.recent.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  color: '#666',
                }}
              >
                <span style={{ color: '#bbb', fontFamily: 'monospace', width: 64 }}>
                  {new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ flex: 1, color: '#333' }}>{getServiceLabel(r.service)}</span>
                <span style={{ color: '#999' }}>{r.username || (r.user_id || '?').slice(0, 6)}</span>
                <span style={{ color: '#C4779B', fontWeight: 700, width: 60, textAlign: 'right' }}>
                  ¥{r.cost.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p style={{ fontSize: '0.7rem', color: '#bbb', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
        ※ コストは推定値です。正確な金額は Replicate / Google Cloud Console でご確認ください。
        <br />
        ※ デフォルト月間上限：管理者 1,500円 / その他 300円（profiles.monthly_cap_jpy_override で個別調整可）
      </p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #FFE4F0',
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          color: '#999',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function BigStat({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div
      style={{
        background: highlight
          ? 'linear-gradient(135deg, #E8A0BF, #C4779B)'
          : 'linear-gradient(135deg, #BAD7E9, #E8A0BF)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.9, letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, marginTop: 4 }}>
        ¥{value.toLocaleString()}
      </div>
    </div>
  )
}
