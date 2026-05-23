'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/closet', label: 'クローゼット', icon: '👗' },
  { href: '/friends', label: '友人', icon: '🙂' },
  { href: '/events', label: 'カレンダー', icon: '📅' },
  { href: '/my', label: 'マイ', icon: '👤' },
]

// ナビを隠すページ（ログイン関連など）
const HIDE_NAV_PATHS = ['/login', '/auth']

export default function BottomNav() {
  const pathname = usePathname()
  if (HIDE_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #F5C6D8',
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 0',
              color: active ? '#E8A0BF' : '#999',
              fontSize: '0.7rem',
              fontWeight: active ? 700 : 400,
              gap: '2px',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation', // ダブルタップ拡大を抑制し反応UP
              transition: 'color 0.1s',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
