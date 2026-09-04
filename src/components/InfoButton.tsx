import { useEffect, useState } from 'react'

interface InfoButtonProps {
  /** What the explanation is about — shown as the popover heading. */
  label: string
  text: string
}

const POPOVER_WIDTH = 300

/**
 * Small "i" button that opens a short explanation of a field or dataset.
 * The popover is position: fixed so it escapes the horizontally scrolling
 * table container instead of being clipped by it.
 */
export function InfoButton({ label, text }: InfoButtonProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    // Table rows and theme cards have their own click handlers.
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8),
    })
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className="info-button"
        aria-label={`Uitleg over ${label}`}
        aria-expanded={open}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={toggle}
      >
        i
      </button>
      {open && pos && (
        <span
          className="info-popover"
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="info-popover-title">{label}</span>
          <span className="info-popover-text">{text}</span>
        </span>
      )}
    </>
  )
}
