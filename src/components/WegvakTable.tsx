import { useRef } from 'react'
import type { WegvakFeature } from '../types/nwb'
import type { MaxSnelheidRecord } from '../types/arcgis'
import {
  formatHuisnummers,
  formatLength,
  formatMaxSnelheid,
  formatRouteNumbers,
  rijrichtngLabel,
  wegbehsrtLabel,
} from '../lib/fieldLabels'
import { TABLE_COLUMN_INFO } from '../lib/infoTexts'
import { InfoButton } from './InfoButton'

const COLUMNS = [
  'Wegvak',
  'Wegbeheerder',
  'Type',
  'Wegnummer',
  'Route(s)',
  'Richting',
  'Huisnrs links',
  'Huisnrs rechts',
  'Lengte',
  'Snelheidslimiet',
  'Bronjaar',
]

interface WegvakTableProps {
  features: WegvakFeature[]
  selectedWvkIds: Set<number>
  onToggle: (wvkId: number) => void
  onSetSelected: (wvkIds: number[], selected: boolean) => void
  maxSnelheden: Map<number, MaxSnelheidRecord[]>
}

export function WegvakTable({
  features,
  selectedWvkIds,
  onToggle,
  onSetSelected,
  maxSnelheden,
}: WegvakTableProps) {
  // Ankerrij voor shift-klik: zo kun je een aaneengesloten stuk weg selecteren.
  const lastToggledIndex = useRef<number | null>(null)

  const allSelected = features.length > 0 && features.every((f) => selectedWvkIds.has(f.properties.wvk_id))
  const someSelected = features.some((f) => selectedWvkIds.has(f.properties.wvk_id))

  function handleRowSelect(index: number, wvkId: number, shiftKey: boolean) {
    const anchor = lastToggledIndex.current
    if (shiftKey && anchor !== null && anchor !== index) {
      const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
      const range = features.slice(from, to + 1).map((f) => f.properties.wvk_id)
      // Het bereik krijgt de toestand die de aangeklikte rij zou krijgen.
      onSetSelected(range, !selectedWvkIds.has(wvkId))
    } else {
      onToggle(wvkId)
    }
    lastToggledIndex.current = index
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="select-cell">
              <input
                type="checkbox"
                aria-label={allSelected ? 'Alles deselecteren' : 'Alles selecteren'}
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={() =>
                  onSetSelected(
                    features.map((f) => f.properties.wvk_id),
                    !allSelected,
                  )
                }
              />
            </th>
            {COLUMNS.map((column) => (
              <th key={column}>
                {column}
                {TABLE_COLUMN_INFO[column] && <InfoButton label={column} text={TABLE_COLUMN_INFO[column]} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f, index) => {
            const p = f.properties
            const isSelected = selectedWvkIds.has(p.wvk_id)
            return (
              <tr
                key={f.id}
                className={isSelected ? 'selected' : undefined}
                aria-selected={isSelected}
                onClick={(e) => handleRowSelect(index, p.wvk_id, e.shiftKey)}
              >
                <td className="select-cell">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    aria-label={`Wegvak ${p.wvk_id} selecteren`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      handleRowSelect(index, p.wvk_id, (e.nativeEvent as MouseEvent).shiftKey)
                    }
                  />
                </td>
                <td>{p.wvk_id}</td>
                <td>
                  {p.wegbehnaam || '—'}
                  <span className="muted"> ({wegbehsrtLabel(p.wegbehsrt)})</span>
                </td>
                <td>{p.wgtype_oms || '—'}</td>
                <td>{p.wegnummer || '—'}</td>
                <td>{formatRouteNumbers(p)}</td>
                <td>{rijrichtngLabel(p.rijrichtng)}</td>
                <td>{formatHuisnummers(p.l_hnr_lnks, p.e_hnr_lnks)}</td>
                <td>{formatHuisnummers(p.l_hnr_rhts, p.e_hnr_rhts)}</td>
                <td>{formatLength(p.st_lengthshape)}</td>
                <td>{formatMaxSnelheid(maxSnelheden.get(p.wvk_id))}</td>
                <td>{p.bronjaar ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
