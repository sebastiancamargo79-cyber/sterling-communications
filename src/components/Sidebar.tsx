'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  LayoutDashboard, Users, Settings, ChevronLeft,
  FileEdit, Eye, BookOpen, Palette, Sun, Moon
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import styles from './sidebar.module.css'

interface ClientInfo { name: string; primaryColor: string | null }

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
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)

  const clientId = params?.id as string | undefined

  useEffect(() => {
    if (!clientId) { setClientInfo(null); return }
    fetch(`/api/clients/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setClientInfo({ name: data.client.name, primaryColor: data.brandKit?.primaryColor ?? null })
      })
      .catch(() => {})
  }, [clientId])

  if (
    pathname === '/login' ||
    pathname.includes('/delivery/') ||
    pathname.endsWith('/newsletter/preview')
  ) {
    return null
  }

  const isClientRoute = !!clientId && pathname.startsWith(`/clients/${clientId}`)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1 L13.5 7 L0.5 7 Z" fill="white"/>
            <path d="M0.5 7 L13.5 7 L7 16 Z" fill="white" opacity="0.55"/>
            <line x1="0.5" y1="7" x2="13.5" y2="7" stroke="#818CF8" strokeWidth="0.75"/>
          </svg>
        </div>
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
            {clientInfo && (
              <div className={styles.clientContext}>
                <div
                  className={styles.clientContextAvatar}
                  style={{ background: clientInfo.primaryColor ?? 'var(--primary)' }}
                >
                  {clientInfo.name.charAt(0).toUpperCase()}
                </div>
                <span className={styles.clientContextName}>{clientInfo.name}</span>
              </div>
            )}
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
