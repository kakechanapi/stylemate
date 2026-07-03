'use server'

// オンボーディング用サーバーアクション
// - 自分プロフィール（性別・身長・体型）の upsert
// - ファネル計測イベント

import { getMe, createFriend, updateFriend } from '@/lib/friends'
import { logEvent } from '@/lib/app-events'
import type { Gender, BodyType } from '@/types/fashion'

export async function saveMeProfileAction(input: {
  gender: Gender
  height_cm?: number
  body_type?: BodyType
}): Promise<{ ok: boolean; error?: string }> {
  const me = await getMe()
  if (me) {
    return updateFriend(me.id, {
      gender: input.gender,
      height_cm: input.height_cm ?? null,
      body_type: input.body_type,
    })
  }
  const result = await createFriend({
    name: '自分',
    gender: input.gender,
    height_cm: input.height_cm,
    body_type: input.body_type,
    relationship: '自分',
    is_me: true,
  })
  return { ok: result.ok, error: result.error }
}

export async function logOnboardingEventAction(
  event: 'onboarding_started' | 'onboarding_completed' | 'onboarding_skipped',
  meta?: { step?: number; clothesRegistered?: number }
): Promise<void> {
  await logEvent(event, meta)
}
