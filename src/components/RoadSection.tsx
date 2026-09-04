import { useState } from 'react'
import { StreetSummary } from './StreetSummary'
import { WegvakTable } from './WegvakTable'
import { WkdThemesPanel } from './WkdThemesPanel'
import { RijkswegPanel } from './RijkswegPanel'
import { formatLength } from '../lib/fieldLabels'
import type { RoadEntry } from '../types/road'

interface RoadSectionProps {
  road: RoadEntry
  selectedWvkIds: Set<number>
  onToggle: (wvkId: number) => void
  onSetSelected: (wvkIds: number[], selected: boolean) => void
}

export function RoadSection({ road, selectedWvkIds, onToggle, onSetSelected }: RoadSectionProps) {
  // Standaard ingeklapt: het overzicht bovenaan is het uitgangspunt, de details
  // vraag je per weg op.
  const [expanded, setExpanded] = useState(false)
  const totalLength = road.features.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
  const selectedCount = road.features.filter((f) => selectedWvkIds.has(f.properties.wvk_id)).length

  return (
    <section className="road-section">
      <button
        type="button"
        className="road-section-header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="road-chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="road-swatch" style={{ background: road.color }} aria-hidden="true" />
        <h2>
          {road.place.straatnaam}
          {road.place.woonplaatsnaam && <span className="road-place">, {road.place.woonplaatsnaam}</span>}
        </h2>
        <span className="road-meta muted">
          {road.status === 'loading' && (
            <>
              <span className="spinner" aria-hidden="true" /> wegvakken ophalen…
            </>
          )}
          {road.status === 'error' && 'ophalen mislukt'}
          {road.status === 'ready' &&
            `${road.features.length} wegvakken · ${formatLength(totalLength)}` +
              (selectedCount > 0 ? ` · ${selectedCount} geselecteerd` : '')}
        </span>
      </button>

      {!expanded ? null : (
        <RoadDetails
          road={road}
          selectedWvkIds={selectedWvkIds}
          onToggle={onToggle}
          onSetSelected={onSetSelected}
        />
      )}
    </section>
  )
}

function RoadDetails({
  road,
  selectedWvkIds,
  onToggle,
  onSetSelected,
}: Pick<RoadSectionProps, 'road' | 'selectedWvkIds' | 'onToggle' | 'onSetSelected'>) {
  return (
    <>
      {road.status === 'loading' && (
        <div className="road-skeleton" role="status" aria-live="polite">
          <span className="skeleton-line" style={{ width: '100%', height: 90 }} />
          <span className="skeleton-line" style={{ width: '70%' }} />
          <span className="skeleton-line" style={{ width: '55%' }} />
        </div>
      )}

      {road.status === 'error' && (
        <p className="error-text">Er ging iets mis bij het ophalen van deze weg.</p>
      )}

      {road.status === 'ready' && road.features.length === 0 && (
        <p className="status-text">Geen wegvakken gevonden in het NWB voor deze weg.</p>
      )}

      {road.status === 'ready' && road.features.length > 0 && (
        <>
          <StreetSummary place={road.place} features={road.features} />
          <ExtraDataProgress road={road} />
          <WegvakTable
            features={road.features}
            selectedWvkIds={selectedWvkIds}
            onToggle={onToggle}
            onSetSelected={onSetSelected}
            maxSnelheden={road.maxSnelheden}
            maxSnelhedenLoading={road.loading.maxSnelheden}
          />
          <RijkswegPanel details={road.rijkswegDetails} loading={road.loading.rijksweg} />
          <WkdThemesPanel
            themes={road.wkdThemes}
            totalWegvakken={road.features.length}
            loadingDone={road.loading.wkdDone}
            loadingTotal={road.loading.wkdTotal}
          />
        </>
      )}
    </>
  )
}

/**
 * De wegvakken zijn er al, maar de aanvullende bronnen laden nog door. Zonder
 * dit lijkt de pagina klaar terwijl er nog tientallen requests lopen — en dat
 * valt vooral op bij een tweede weg, die om dezelfde verbindingen concurreert.
 */
function ExtraDataProgress({ road }: { road: RoadEntry }) {
  const wkdBusy = road.loading.wkdTotal === 0 || road.loading.wkdDone < road.loading.wkdTotal
  const busy: string[] = []
  if (road.loading.maxSnelheden) busy.push('snelheidslimieten')
  // Het precieze aantal lagen staat in het WKD-blok zelf, hier alleen de bron.
  if (wkdBusy) busy.push('wegkenmerken')
  if (road.loading.rijksweg) busy.push('rijksweggegevens')
  if (busy.length === 0) return null

  return (
    <p className="extra-progress" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      Nog bezig met {busy.join(', ')}…
    </p>
  )
}
