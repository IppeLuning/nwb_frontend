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
  selectedId: string | null
  onSelect: (id: string | null) => void
  maxSnelheden: Map<number, MaxSnelheidRecord[]>
}

export function WegvakTable({ features, selectedId, onSelect, maxSnelheden }: WegvakTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column}>
                {column}
                {TABLE_COLUMN_INFO[column] && <InfoButton label={column} text={TABLE_COLUMN_INFO[column]} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => {
            const p = f.properties
            const isSelected = f.id === selectedId
            return (
              <tr
                key={f.id}
                className={isSelected ? 'selected' : undefined}
                onClick={() => onSelect(isSelected ? null : f.id)}
              >
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
