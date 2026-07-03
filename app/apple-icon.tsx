// iOS「ホーム画面に追加」用アイコン（Next.js ファイル規約で自動リンクされる）
import { renderAppIcon } from '@/lib/pwa-icon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return renderAppIcon(180)
}
