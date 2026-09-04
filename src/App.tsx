import { useCallback, useRef, useState } from 'react'
import { StreetSearch } from './components/StreetSearch'
import { StreetSummary } from './components/StreetSummary'
import { StreetMap } from './components/StreetMap'
import { WegvakTable } from './components/WegvakTable'
import { SelectionBar } from './components/SelectionBar'
import { WkdThemesPanel } from './components/WkdThemesPanel'
import { RijkswegPanel } from './components/RijkswegPanel'
import { InfoButton } from './components/InfoButton'
import { APP_INFO } from './lib/infoTexts'
import { fetchWegvakkenForPlace } from './api/nwb'
import { fetchMaxSnelheden } from './api/maxSnelheid'
import { fetchWkdThemes, type WkdThemeResult } from './api/wkd'
import { fetchRijkswegDetails, type RijkswegDetails } from './api/weggeg'
import type { LookupDoc, WegvakFeatureCollection } from './types/nwb'
import type { MaxSnelheidRecord } from './types/arcgis'
import './App.css'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const EMPTY_RIJKSWEG_DETAILS: RijkswegDetails = {
  maxSnelheden: new Map(),
  rijstroken: new Map(),
  overgeslagen: 0,
}

function App() {
  const [place, setPlace] = useState<LookupDoc | null>(null)
  const [data, setData] = useState<WegvakFeatureCollection | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  /** Geselecteerde wegvakken, op wvk_id — de sleutel waarmee alle bronnen koppelen. */
  const [selectedWvkIds, setSelectedWvkIds] = useState<Set<number>>(new Set())

  const [maxSnelheden, setMaxSnelheden] = useState<Map<number, MaxSnelheidRecord[]>>(new Map())
  const [wkdThemes, setWkdThemes] = useState<WkdThemeResult[]>([])
  const [rijkswegDetails, setRijkswegDetails] = useState<RijkswegDetails>(EMPTY_RIJKSWEG_DETAILS)

  // Guards the extra (WKD/speed/rijksweg) fetches against a stale search overwriting a newer one.
  const searchTokenRef = useRef(0)

  const toggleWegvak = useCallback((wvkId: number) => {
    setSelectedWvkIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(wvkId)) next.add(wvkId)
      return next
    })
  }, [])

  /** Zet een reeks wegvakken in één keer aan of uit (shift-klik, "alles selecteren"). */
  const setWegvakkenSelected = useCallback((wvkIds: number[], selected: boolean) => {
    setSelectedWvkIds((prev) => {
      const next = new Set(prev)
      for (const id of wvkIds) {
        if (selected) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedWvkIds(new Set()), [])

  async function handleSelect(doc: LookupDoc) {
    const token = ++searchTokenRef.current
    setPlace(doc)
    setSelectedWvkIds(new Set())
    setStatus('loading')
    setMaxSnelheden(new Map())
    setWkdThemes([])
    setRijkswegDetails(EMPTY_RIJKSWEG_DETAILS)

    try {
      const result = await fetchWegvakkenForPlace(doc)
      if (token !== searchTokenRef.current) return
      setData(result)
      setStatus('ready')

      const wvkIds = result.features.map((f) => f.properties.wvk_id)
      // WEGGEG wordt afgekapt, dus zet de hoofdrijbanen (bst_code 'HR') vooraan:
      // die dragen de betekenisvolle rijstrook- en snelheidsconfiguratie.
      const rijkFeatures = result.features.filter((f) => f.properties.wegbehsrt === 'R')
      const rijkWvkIds = [
        ...rijkFeatures.filter((f) => f.properties.bst_code === 'HR'),
        ...rijkFeatures.filter((f) => f.properties.bst_code !== 'HR'),
      ].map((f) => f.properties.wvk_id)

      // Deze zijn aanvullend: als er één faalt of afkapt op de time-out blijft
      // de rest van de pagina gewoon staan. Zonder catch zou een afgebroken
      // request als unhandled rejection in de console belanden.
      fetchMaxSnelheden(wvkIds)
        .then((m) => {
          if (token === searchTokenRef.current) setMaxSnelheden(m)
        })
        .catch(() => {})
      fetchWkdThemes(wvkIds, (theme) => {
        if (token === searchTokenRef.current) setWkdThemes((prev) => [...prev, theme])
      }).catch(() => {})
      if (rijkWvkIds.length > 0) {
        fetchRijkswegDetails(rijkWvkIds)
          .then((details) => {
            if (token === searchTokenRef.current) setRijkswegDetails(details)
          })
          .catch(() => {})
      }
    } catch {
      if (token !== searchTokenRef.current) return
      setData(null)
      setStatus('error')
    }
  }

  return (
    <div className="app">
      <header>
        <h1>
          NWB Straatzoeker
          <InfoButton label="Over deze pagina" text={APP_INFO} />
        </h1>
        <p className="subtitle">
          Alle gegevens die het Nationaal Wegenbestand en aanverwante Rijkswaterstaat-databases kennen over een
          straat — alleen op basis van de straatnaam.
        </p>
      </header>

      <StreetSearch onSelect={handleSelect} disabled={status === 'loading'} />

      {status === 'loading' && <p className="status-text">Wegvakken ophalen…</p>}
      {status === 'error' && <p className="error-text">Er ging iets mis bij het ophalen van de gegevens.</p>}

      {status === 'ready' && place && data && (
        <>
          {data.features.length === 0 ? (
            <p className="status-text">Geen wegvakken gevonden in het NWB voor deze straat.</p>
          ) : (
            <>
              <StreetSummary place={place} features={data.features} />
              <StreetMap
                datasetKey={`${place.gemeentenaam}-${place.straatnaam}`}
                data={data}
                selectedWvkIds={selectedWvkIds}
                onToggle={toggleWegvak}
              />
              <SelectionBar
                features={data.features}
                selectedWvkIds={selectedWvkIds}
                onSetSelected={setWegvakkenSelected}
                onClear={clearSelection}
              />
              <WegvakTable
                features={data.features}
                selectedWvkIds={selectedWvkIds}
                onToggle={toggleWegvak}
                onSetSelected={setWegvakkenSelected}
                maxSnelheden={maxSnelheden}
              />
              <RijkswegPanel details={rijkswegDetails} />
              <WkdThemesPanel themes={wkdThemes} totalWegvakken={data.features.length} />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
