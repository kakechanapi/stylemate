// PWA マニフェスト：「ホーム画面に追加」で毎朝の再訪動線を作る。
// アイコンは ImageResponse で動的生成（app/icon-192.png/route.tsx 等）。
// パスに拡張子を含めているのは middleware の公開判定（pathname.includes('.')）を
// 通すため。変更時は src/lib/supabase/middleware.ts の PUBLIC 判定に注意。
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StyleMate — AIが毎朝コーデを提案',
    short_name: 'StyleMate',
    description:
      '持ってる服からAIが毎朝の最適コーデを提案。天気・予定・好みに合わせて、あなたの服で。',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF5F8',
    theme_color: '#C4779B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
