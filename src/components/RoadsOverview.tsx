import { formatBreedte, formatLength, summarizeBreedte } from '../lib/fieldLabels'
import type { RoadEntry } from '../types/road'

interface RoadsOverviewProps {
  roads: RoadEntry[]
  selectedWvkIds: Set<number>
  onFocus: (roadId: string) => void
  onRemove: (roadId: string) => void
}

/**
 * Compact overzicht van alle wegen op de kaart; tevens legenda bij de kleuren.
 * Lengte en breedte gaan over de geselecteerde wegvakken, zodat je met de
 * kwast direct ziet wat je selectie waard is.
 */
export function RoadsOverview({ roads, selectedWvkIds, onFocus, onRemove }: RoadsOverviewProps) {
  return (
    <section className="roads-overview">
      <h2>Wegen op de kaart ({roads.length})</h2>
      <table>
        <thead>
          <tr>
            <th className="select-cell" aria-label="Kleur" />
            <th>Weg</th>
            <th>Gemeente</th>
            <th className="num">Wegvakken</th>
            <th className="num">Lengte</th>
            <th className="num">Breedte</th>
            <th aria-label="Acties" />
          </tr>
        </thead>
        <tbody>
          {roads.map((road) => {
            const selectedFeatures = road.features.filter((f) => selectedWvkIds.has(f.properties.wvk_id))
            const selectedLength = selectedFeatures.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
            const totalLength = road.features.reduce((sum, f) => sum + (f.properties.st_lengthshape ?? 0), 0)
            const allSelected = selectedFeatures.length === road.features.length
            const breedte = summarizeBreedte(
              road.wkdThemes.find((t) => t.layer.key === 'wegbreedte')?.features,
              selectedWvkIds,
            )
            const wkdBusy = road.loading.wkdTotal === 0 || road.loading.wkdDone < road.loading.wkdTotal
            const extrasBusy =
              road.status === 'ready' && (road.loading.maxSnelheden || road.loading.rijksweg || wkdBusy)

            return (
              <tr key={road.id}>
                <td className="select-cell">
                  <span className="road-swatch" style={{ background: road.color }} aria-hidden="true" />
                </td>
                <td>
                  {road.place.straatnaam}
                  {road.place.woonplaatsnaam && <span className="muted">, {road.place.woonplaatsnaam}</span>}
                </td>
                <td>{road.place.gemeentenaam}</td>
                {road.status === 'ready' ? (
                  <>
                    <td className="num">
                      {allSelected ? (
                        road.features.length
                      ) : (
                        <span title={`${road.features.length} wegvakken in totaal`}>
                          {selectedFeatures.length}
                          <span className="muted"> / {road.features.length}</span>
                        </span>
                      )}
                    </td>
                    <td className="num" title={allSelected ? undefined : `Hele weg: ${formatLength(totalLength)}`}>
                      {formatLength(selectedLength)}
                    </td>
                    <td className="num">
                      {breedte ? (
                        <span
                          title={
                            `Lengtegewogen gemiddelde over ${formatLength(breedte.bekendeMeters)} ` +
                            `van de ${formatLength(selectedLength)} selectie`
                          }
                        >
                          {formatBreedte(breedte.gemiddeld)}
                          {breedte.max - breedte.min >= 0.1 && (
                            <span className="muted">
                              {' '}
                              ({breedte.min.toFixed(1)}–{breedte.max.toFixed(1)})
                            </span>
                          )}
                        </span>
                      ) : wkdBusy ? (
                        <span className="spinner" aria-hidden="true" title="Breedte wordt nog opgehaald" />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </>
                ) : (
                  <td className="num" colSpan={3}>
                    {road.status === 'error' ? (
                      <span className="error-text">ophalen mislukt</span>
                    ) : (
                      <span className="muted">
                        <span className="spinner" aria-hidden="true" />
                        laden…
                      </span>
                    )}
                  </td>
                )}
                <td className="roads-overview-actions">
                  {extrasBusy && <span className="spinner" aria-hidden="true" title="Aanvullende gegevens laden" />}
                  {road.features.length > 0 && (
                    <button type="button" onClick={() => onFocus(road.id)} title="Zoom de kaart in op deze weg">
                      Inzoomen
                    </button>
                  )}
                  <button
                    type="button"
                    className="road-remove"
                    aria-label={`${road.place.straatnaam} van de kaart verwijderen`}
                    onClick={() => onRemove(road.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
