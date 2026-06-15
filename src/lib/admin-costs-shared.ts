// クライアント・サーバー共有の型・純粋関数
// admin-costs.ts は createSupabaseServerClient を使うため
// クライアントコンポーネントから直接 import すると next/headers エラーになる。
// 型と表示用ラベル関数はこちらに分離。

import { SERVICE_COSTS_JPY } from './usage-cost-constants'

export interface DashboardSummary {
  todayTotal: number
  monthTotal: number
  byService: Record<string, { count: number; cost: number }>
  topUsers: { user_id: string; email: string | null; username: string | null; cost: number; count: number }[]
  daily: { date: string; cost: number }[]
  recent: {
    id: string
    user_id: string | null
    username: string | null
    service: string
    cost: number
    created_at: string
  }[]
}

export function getServiceLabel(serviceId: string): string {
  const map: Record<string, string> = {
    replicate_tryon: '試着（IDM-VTON）',
    replicate_lora_train: 'LoRA訓練',
    replicate_sv3d: '360°回転',
    gemini_outfit_suggest: 'コーデ提案',
    gemini_style_classify: '好み分類',
    gemini_style_profile: '好みプロフィール更新',
  }
  return map[serviceId] || serviceId
}

export function getServiceUnitCost(serviceId: string): number {
  return SERVICE_COSTS_JPY[serviceId] || 0
}
