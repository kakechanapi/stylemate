// PWA マニフェスト用アイコン（512px・maskable 兼用）
import { renderAppIcon } from '@/lib/pwa-icon'

export const dynamic = 'force-static'

export async function GET() {
  return renderAppIcon(512)
}
