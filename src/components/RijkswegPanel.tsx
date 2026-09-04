import { MAX_WEGGEG_WEGVAKKEN, type RijkswegDetails } from '../api/weggeg'
import { RIJKSWEG_PANEL_INFO, RIJSTROKEN_INFO, WEGGEG_SNELHEID_INFO } from '../lib/infoTexts'
import { InfoButton } from './InfoButton'

interface RijkswegPanelProps {
  details: RijkswegDetails
}

export function RijkswegPanel({ details }: RijkswegPanelProps) {
  const hasRijstroken = details.rijstroken.size > 0
  const hasMaxSnelheden = details.maxSnelheden.size > 0
  if (!hasRijstroken && !hasMaxSnelheden) return null

  return (
    <section className="rijksweg-panel">
      <h2>
        Rijksweg-detailgegevens (Weggegevens)
        <InfoButton label="Weggegevens (WEGGEG)" text={RIJKSWEG_PANEL_INFO} />
      </h2>
      <p className="subtitle">
        Rijstrookconfiguratie en tijdsafhankelijke snelheidslimieten van rijkswegen.
        {details.overgeslagen > 0 &&
          ` Alleen de eerste ${MAX_WEGGEG_WEGVAKKEN} wegvakken zijn opgevraagd (hoofdrijbanen eerst); ` +
            `${details.overgeslagen} overige wegvakken zijn overgeslagen.`}
      </p>

      {hasRijstroken && (
        <div className="rijksweg-block">
          <h3>
            Rijstroken
            <InfoButton label="Rijstroken" text={RIJSTROKEN_INFO} />
          </h3>
          <ul>
            {Array.from(details.rijstroken.entries()).map(([wvkId, records]) =>
              records.map((r, i) => (
                <li key={`${wvkId}-${i}`}>
                  Wegvak {wvkId}: {r.begafstand}–{r.endafstand} m — {r.omschr} rijstroken
                </li>
              )),
            )}
          </ul>
        </div>
      )}

      {hasMaxSnelheden && (
        <div className="rijksweg-block">
          <h3>
            Tijdsafhankelijke snelheidslimieten
            <InfoButton label="Tijdsafhankelijke snelheidslimieten" text={WEGGEG_SNELHEID_INFO} />
          </h3>
          <ul>
            {Array.from(details.maxSnelheden.entries()).map(([wvkId, records]) =>
              records.map((r, i) => (
                <li key={`${wvkId}-${i}`}>
                  Wegvak {wvkId}: {r.begafstand}–{r.endafstand} m — {r.omschr} km/h
                  {r.begintijd != null && r.eindtijd != null ? ` (${r.begintijd}:00–${r.eindtijd}:00)` : ''}
                </li>
              )),
            )}
          </ul>
        </div>
      )}
    </section>
  )
}
