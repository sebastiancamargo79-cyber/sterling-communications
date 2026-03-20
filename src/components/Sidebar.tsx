'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'

const mainNav = [
  { href: '/clients', label: 'Clients' },
  { href: '/brand-studio', label: 'Brand Studio' },
  { href: '/admin', label: 'Admin' },
]

const subNav = (clientId: string) => [
  { href: `/clients/${clientId}/newsletter/editor`, label: 'Editor' },
  { href: `/clients/${clientId}/newsletter/preview`, label: 'Preview' },
  { href: `/clients/${clientId}/newsletter/editions`, label: 'Editions' },
  { href: `/clients/${clientId}/brand-kit`, label: 'Brand Kit' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const params = useParams()

  if (
    pathname === '/login' ||
    pathname.includes('/delivery/') ||
    pathname.endsWith('/newsletter/preview')
  ) {
    return null
  }

  const clientId = params?.id as string | undefined
  const isClientRoute = !!clientId && pathname.startsWith(`/clients/${clientId}`)

  const itemStyle = (isActive: boolean, indent = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: indent ? '8px 16px 8px 24px' : '10px 16px',
    fontSize: indent ? '0.8rem' : '0.875rem',
    textDecoration: 'none',
    color: isActive ? 'var(--sidebar-text)' : 'var(--sidebar-muted)',
    background: isActive ? 'var(--sidebar-active)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--sidebar-accent)' : '3px solid transparent',
    fontWeight: isActive ? 600 : 400,
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 16px 16px',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: 'var(--sidebar-text)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        Sterling
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
        {mainNav.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname.startsWith('/admin')
            : item.href === '/brand-studio'
              ? pathname.startsWith('/brand-studio')
              : pathname.startsWith('/clients')
          return (
            <Link key={item.href} href={item.href} style={itemStyle(isActive && pathname.startsWith(item.href))}>
              {item.label}
            </Link>
          )
        })}

        {isClientRoute && (
          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <Link href="/clients" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              fontSize: '0.8rem',
              textDecoration: 'none',
              color: 'var(--sidebar-muted)',
            }}>
              ← Clients
            </Link>
            {subNav(clientId).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '?')
              return (
                <Link key={item.href} href={item.href} style={itemStyle(isActive, true)}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>
    </aside>
  )
}
