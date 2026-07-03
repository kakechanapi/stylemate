// PWA マニフェスト用アイコン（192px）
// フォルダ名に .png を含めることで middleware の公開判定を通し、
// 未ログインでも取得できるようにしている
import { renderAppIcon } from '@/lib/pwa-icon'

export const dynamic = 'force-static'

export async function GET() {
  return renderAppIcon(192)
}
