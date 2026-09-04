import type { LookupDoc, WegvakFeature } from '../types/nwb'
import { formatLength } from '../lib/fieldLabels'
import { SUMMARY_INFO } from '../lib/infoTexts'
import { InfoButton } from './InfoButton'

interface StreetSummaryProps {
  place: LookupDoc
  features: WegvakFeature[]
}

export function StreetSummary({ place, features }: StreetSummaryProps) {
  const totalLength = features.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
  const roadTypes = uniqueNonEmpty(features.map((f) => f.properties.wgtype_oms))
  const authorities = uniqueNonEmpty(features.map((f) => f.properties.wegbehnaam))

  const entries: [string, string][] = [
    ['Gemeente', place.gemeentenaam],
    ['Provincie', place.provincienaam],
    ['Wegvakken', String(features.length)],
    ['Totale lengte', formatLength(totalLength)],
    ['Wegtype(n)', roadTypes.length ? roadTypes.join(', ') : '—'],
    ['Wegbeheerder(s)', authorities.length ? authorities.join(', ') : '—'],
  ]

  return (
    <section className="summary-card">
      <h2>
        {place.straatnaam}
        <span className="summary-place">, {place.woonplaatsnaam}</span>
      </h2>
      <dl className="summary-grid">
        {entries.map(([label, value]) => (
          <div key={label}>
            <dt>
              {label}
              {SUMMARY_INFO[label] && <InfoButton label={label} text={SUMMARY_INFO[label]} />}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v && v.trim().length > 0)))
}
