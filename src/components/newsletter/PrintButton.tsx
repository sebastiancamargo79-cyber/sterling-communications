'use client'

import styles from './PrintButton.module.css'

export function PrintButton() {
  return (
    <button className={styles.btn} onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  )
}
