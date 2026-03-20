'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import styles from './sidebar.module.css'

const mainNav = [
  { href: '/clients', label: 'Clients' },
  { href: '/admin', label: 'Admin' },
]

const subNav = (clientId: string) => [
  { href: `/clients/${clientId}/newsletter/editor`, label: 'Editor' },
  { href: `/clients/${clientId}/newsletter/preview`, label: 'Preview' },
  { href: `/clients/${clientId}/newsletter/editions`, label: 'Editions' },
  { href: `/clients/${clientId}/brand-studio`, label: 'Brand Studio' },
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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>SC</div>
        <span className={styles.brandName}>Sterling</span>
      </div>

      <nav className={styles.nav}>
        {mainNav.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              {item.label}
            </Link>
          )
        })}

        {isClientRoute && (
          <div className={styles.subNavGroup}>
            <Link href="/clients" className={styles.backLink}>
              ← Clients
            </Link>
            {subNav(clientId).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '?')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navSubItem} ${isActive ? styles.navSubItemActive : ''}`}
                >
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
