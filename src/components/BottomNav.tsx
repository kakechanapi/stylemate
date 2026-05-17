'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/closet', label: 'クローゼット', icon: '👗' },
  { href: '/register', label: '登録', icon: '➕' },
  { href: '/calendar', label: 'カレンダー', icon: '📅' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid #F5C6D8',
      display: 'flex',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {navItems.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} style={{
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
          }}>
            <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
