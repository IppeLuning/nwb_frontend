import type { LookupDoc, WegvakFeature } from '../types/nwb'
import { formatLength } from '../lib/fieldLabels'

interface StreetSummaryProps {
  place: LookupDoc
  features: WegvakFeature[]
}

export function StreetSummary({ place, features }: StreetSummaryProps) {
  const totalLength = features.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
  const roadTypes = uniqueNonEmpty(features.map((f) => f.properties.wgtype_oms))
  const authorities = uniqueNonEmpty(features.map((f) => f.properties.wegbehnaam))

  return (
    <section className="summary-card">
      <h2>
        {place.straatnaam}
        <span className="summary-place">, {place.woonplaatsnaam}</span>
      </h2>
      <dl className="summary-grid">
        <div>
          <dt>Gemeente</dt>
          <dd>{place.gemeentenaam}</dd>
        </div>
        <div>
          <dt>Provincie</dt>
          <dd>{place.provincienaam}</dd>
        </div>
        <div>
          <dt>Wegvakken</dt>
          <dd>{features.length}</dd>
        </div>
        <div>
          <dt>Totale lengte</dt>
          <dd>{formatLength(totalLength)}</dd>
        </div>
        <div>
          <dt>Wegtype(n)</dt>
          <dd>{roadTypes.length ? roadTypes.join(', ') : '—'}</dd>
        </div>
        <div>
          <dt>Wegbeheerder(s)</dt>
          <dd>{authorities.length ? authorities.join(', ') : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v && v.trim().length > 0)))
}
