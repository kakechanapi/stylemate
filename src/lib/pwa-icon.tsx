// PWA アイコンの共通デザイン（ImageResponse 用 JSX）
// アプリ名確定・ロゴ制作までの暫定：ブランドカラーのグラデ + 「S」
import { ImageResponse } from 'next/og'

export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8A0BF 0%, #C4779B 100%)',
          borderRadius: size * 0.22,
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: size * 0.58,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            display: 'flex',
          }}
        >
          S
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
