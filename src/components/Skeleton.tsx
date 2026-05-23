'use client'
import { CSSProperties } from 'react'

export function SkeletonBox({
  width = '100%',
  height = 24,
  borderRadius = 8,
  style,
}: {
  width?: string | number
  height?: string | number
  borderRadius?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          'linear-gradient(90deg, #FFF5F8 0%, #FFE4F0 50%, #FFF5F8 100%)',
        backgroundSize: '200% 100%',
        animation: 'stylemate-shimmer 1.4s infinite linear',
        ...style,
      }}
    />
  )
}

// グローバルキーフレーム（1度だけ注入）
if (typeof document !== 'undefined' && !document.getElementById('stylemate-shimmer-style')) {
  const style = document.createElement('style')
  style.id = 'stylemate-shimmer-style'
  style.innerHTML = `@keyframes stylemate-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`
  document.head.appendChild(style)
}
