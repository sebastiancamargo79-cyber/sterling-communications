'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  LayoutDashboard, Users, Settings, ChevronLeft,
  FileEdit, Eye, BookOpen, Palette, Sun, Moon
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import styles from './sidebar.module.css'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/admin', label: 'Admin', icon: Settings },
]

const subNav = (clientId: string) => [
  { href: `/clients/${clientId}/newsletter/editor`, label: 'Editor', icon: FileEdit },
  { href: `/clients/${clientId}/newsletter/preview`, label: 'Preview', icon: Eye },
  { href: `/clients/${clientId}/newsletter/editions`, label: 'Editions', icon: BookOpen },
  { href: `/clients/${clientId}/brand-studio`, label: 'Brand Studio', icon: Palette },
]

export default function Sidebar() {
  const pathname = usePathname()
  const params = useParams()
  const { theme, toggle } = useTheme()

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
        <div className={styles.brandText}>
          <span className={styles.brandName}>Sterling Communications</span>
          <span className={styles.brandTagline}>Newsletter Platform</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {mainNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}

        {isClientRoute && (
          <div className={styles.subNavGroup}>
            <Link href="/clients" className={styles.backLink}>
              <ChevronLeft size={13} />
              All Clients
            </Link>
            {subNav(clientId).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '?')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navSubItem} ${isActive ? styles.navSubItemActive : ''}`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.themeToggle} onClick={toggle}>
          {theme === 'dark'
            ? <><Sun size={14} /><span>Light mode</span></>
            : <><Moon size={14} /><span>Dark mode</span></>
          }
        </button>
      </div>
    </aside>
  )
}
