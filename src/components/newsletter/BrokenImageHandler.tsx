'use client'

import { useEffect } from 'react'

export default function BrokenImageHandler() {
  useEffect(() => {
    const handler = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (img.tagName === 'IMG' && !img.dataset.fallback) {
        img.dataset.fallback = '1'
        img.style.display = 'none'
      }
    }
    document.addEventListener('error', handler, true)
    return () => document.removeEventListener('error', handler, true)
  }, [])

  return null
}
