// AI コーデ提案
// - 天気 / TPO / 予定 を考慮
// - 「同じ相手と最近着た服」を自動で除外（被り回避）
//   eventId が渡されれば、その予定の friend_ids から recent を引く

import { NextResponse } from 'next/server'
import { generateOutfitSuggestion } from '@/lib/gemini'
import { recentClothesWithFriends } from '@/lib/events'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()

  // 被り回避：eventId or friend_ids から「最近この人と着た服」を取得
  let recentClothIds: string[] = body.recentClothIds || []
  let scheduleTitle: string | undefined = body.scheduleTitle
  let tpo = body.tpo || 'casual'

  if (body.eventId && !recentClothIds.length) {
    const supabase = await createSupabaseServerClient()
    const { data: ev } = await supabase
      .from('events')
      .select('title, tpo, friend_ids')
      .eq('id', body.eventId)
      .single()
    if (ev) {
      scheduleTitle = scheduleTitle || ev.title
      tpo = ev.tpo || tpo
      if (ev.friend_ids && ev.friend_ids.length > 0) {
        recentClothIds = await recentClothesWithFriends(ev.friend_ids, 5)
      }
    }
  } else if (
    body.friend_ids &&
    Array.isArray(body.friend_ids) &&
    body.friend_ids.length > 0 &&
    !recentClothIds.length
  ) {
    recentClothIds = await recentClothesWithFriends(body.friend_ids, 5)
  }

  const result = await generateOutfitSuggestion(body.clothes || [], {
    weather: body.weather || null,
    tpo,
    scheduleTitle,
    styleTags: body.styleTags,
    recentClothIds,
  })
  return NextResponse.json({ ...result, recentClothIds, scheduleTitle })
}
