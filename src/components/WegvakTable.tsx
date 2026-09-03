import type { WegvakFeature } from '../types/nwb'
import { formatHuisnummers, formatLength, formatRouteNumbers, rijrichtngLabel, wegbehsrtLabel } from '../lib/fieldLabels'

interface WegvakTableProps {
  features: WegvakFeature[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function WegvakTable({ features, selectedId, onSelect }: WegvakTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Wegvak</th>
            <th>Wegbeheerder</th>
            <th>Type</th>
            <th>Wegnummer</th>
            <th>Route(s)</th>
            <th>Richting</th>
            <th>Huisnrs links</th>
            <th>Huisnrs rechts</th>
            <th>Lengte</th>
            <th>Bronjaar</th>
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
                <td>{p.bronjaar ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
