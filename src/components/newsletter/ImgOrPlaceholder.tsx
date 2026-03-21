interface Props {
  src?: string | null
  alt?: string
  className?: string
}

/**
 * Renders an <img> when src is provided, otherwise a styled placeholder div.
 * The placeholder inherits the same className so layout dimensions stay intact.
 */
export default function ImgOrPlaceholder({ src, alt, className }: Props) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} className={className} />
  }
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ececec',
        color: '#aaa',
        fontSize: '0.7rem',
        fontStyle: 'italic',
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.02em',
      }}
    >
      Image placeholder
    </div>
  )
}
