// AI コーデ提案
// - 天気 / TPO / 予定 を考慮
// - 「同じ相手と最近着た服」を自動で除外（被り回避）
// - スワイプで学習したユーザー嗜好を自動付与

import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/app-events'
import { generateOutfitSuggestion } from '@/lib/gemini'
import { recentClothesWithFriends } from '@/lib/events'
import { recentlyWornClothIds } from '@/lib/outfits'
import { getStyleProfile } from '@/lib/style'
import { getMe } from '@/lib/friends'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // 認証必須：Gemini（Vision 画像12枚込み）を叩く有料エンドポイント。
  // middleware は /api/* を素通しにするので、ここで自前ガードしないと
  // 未ログインの誰でも叩ける AI プロキシになってしまう
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  // 被り回避：eventId or friend_ids から「最近この人と着た服」を取得
  let recentClothIds: string[] = body.recentClothIds || []
  let scheduleTitle: string | undefined = body.scheduleTitle
  let tpo = body.tpo || 'casual'

  if (body.eventId && !recentClothIds.length) {
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

  // マンネリ防止：直近1週間で着た服も「最近使った」枠に統合して AI に渡す
  // 同じ提案が繰り返されるのを防ぐ。
  const recentlyWorn = await recentlyWornClothIds(7)
  const mergedRecent = Array.from(new Set([...recentClothIds, ...recentlyWorn]))
  recentClothIds = mergedRecent

  // 嗜好タグ：明示指定がなければ style_profiles から自動取得
  let styleTags: string[] | undefined = body.styleTags
  if (!styleTags) {
    const profile = await getStyleProfile()
    if (profile && profile.tags && profile.tags.length > 0) {
      styleTags = profile.tags
    }
  }

  // 自分のプロフィール（性別・身長・体型）→ 提案精度UP
  // 性別マッチしない服を提案しないように Gemini に伝える
  const me = await getMe()
  const meContext = me
    ? {
        gender: me.gender,
        height_cm: me.height_cm,
        body_type: me.body_type,
      }
    : undefined

  const result = await generateOutfitSuggestion(body.clothes || [], {
    weather: body.weather || null,
    tpo,
    scheduleTitle,
    styleTags,
    recentClothIds,
    fixedItemIds: Array.isArray(body.fixedItemIds) ? body.fixedItemIds : undefined,
    excludedItemIds: Array.isArray(body.excludedItemIds) ? body.excludedItemIds : undefined,
    me: meContext,
  })
  // 計測：提案生成（クローゼット規模別の提案品質・ファネル分析用）
  await logEvent('outfit_suggested', {
    clothesCount: Array.isArray(body.clothes) ? body.clothes.length : 0,
    suggestionCount: result.suggestions?.length || 0,
    tpo,
    hasEvent: !!body.eventId,
  })
  return NextResponse.json({ ...result, recentClothIds, scheduleTitle, styleTags })
}
