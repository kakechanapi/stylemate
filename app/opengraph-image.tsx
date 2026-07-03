// OGP 画像（LINE / X 等でリンク共有した時のプレビュー）
// Next.js ファイル規約：og:image / twitter:image メタを自動付与
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'StyleMate — AIが毎朝、あなたの服からコーデを提案'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF5F8 0%, #FFE4F0 60%, #F5C6D8 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #E8A0BF 0%, #C4779B 100%)',
            color: '#fff',
            fontSize: 68,
            fontWeight: 700,
            marginBottom: 36,
          }}
        >
          S
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#993556' }}>
          StyleMate
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#7B5B6B', marginTop: 18 }}>
          AIが毎朝、あなたの服からコーデを提案
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: '#B08999', marginTop: 12 }}>
          天気 × 予定 × 好みで、今日のベストな一着を
        </div>
      </div>
    ),
    size
  )
}
