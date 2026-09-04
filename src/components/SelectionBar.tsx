import { useEffect, useState } from 'react'
import type { WegvakFeature } from '../types/nwb'
import { formatLength } from '../lib/fieldLabels'

interface SelectionBarProps {
  features: WegvakFeature[]
  selectedWvkIds: Set<number>
  onSetSelected: (wvkIds: number[], selected: boolean) => void
  onClear: () => void
}

export function SelectionBar({ features, selectedWvkIds, onSetSelected, onClear }: SelectionBarProps) {
  const [copied, setCopied] = useState(false)

  const selected = features.filter((f) => selectedWvkIds.has(f.properties.wvk_id))
  const selectedLength = selected.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
  const allWvkIds = features.map((f) => f.properties.wvk_id)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  async function copyIds() {
    // Bewaar de volgorde van de tabel, niet die van de Set.
    const ids = selected.map((f) => f.properties.wvk_id).join(',')
    try {
      await navigator.clipboard.writeText(ids)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="selection-bar">
      <span className="selection-count">
        {selected.length === 0 ? (
          <span className="muted">
            Geen wegvakken geselecteerd — klik of schilder op de kaart, of vink ze aan in de tabel
          </span>
        ) : (
          <>
            <strong>{selected.length}</strong> van {features.length} wegvakken geselecteerd ·{' '}
            {formatLength(selectedLength)}
          </>
        )}
      </span>

      <span className="selection-actions">
        <button
          type="button"
          onClick={() => onSetSelected(allWvkIds, true)}
          disabled={selected.length === features.length}
        >
          Alles selecteren
        </button>
        <button type="button" onClick={onClear} disabled={selected.length === 0}>
          Selectie wissen
        </button>
        <button type="button" onClick={copyIds} disabled={selected.length === 0}>
          {copied ? 'Gekopieerd' : "Kopieer wegvak-id's"}
        </button>
      </span>
    </div>
  )
}
