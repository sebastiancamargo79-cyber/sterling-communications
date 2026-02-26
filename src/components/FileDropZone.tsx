'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import styles from './FileDropZone.module.css'

interface FileDropZoneProps {
  label: string
  accept?: string
  onChange?: (file: File | null) => void
  name?: string
  error?: string
}

export default function FileDropZone({ label, accept, onChange, name, error }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File | null) {
    setFileName(file?.name ?? null)
    onChange?.(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0] ?? null
    if (file && inputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      inputRef.current.files = dt.files
    }
    handleFile(file)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div
        className={`${styles.dropZone}${dragging ? ` ${styles.dragging}` : ''}${error ? ` ${styles.dropZoneError}` : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          name={name}
          className={styles.hiddenInput}
          onChange={handleChange}
        />
        {fileName ? (
          <span className={styles.fileName}>{fileName}</span>
        ) : (
          <span className={styles.placeholder}>
            Drop file here or <span className={styles.browse}>browse</span>
          </span>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
