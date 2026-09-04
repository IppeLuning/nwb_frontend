import { useRef, useState } from 'react'
import { StreetSearch } from './components/StreetSearch'
import { StreetSummary } from './components/StreetSummary'
import { StreetMap } from './components/StreetMap'
import { WegvakTable } from './components/WegvakTable'
import { WkdThemesPanel } from './components/WkdThemesPanel'
import { RijkswegPanel } from './components/RijkswegPanel'
import { InfoButton } from './components/InfoButton'
import { APP_INFO } from './lib/infoTexts'
import { fetchWegvakken } from './api/nwb'
import { fetchMaxSnelheden } from './api/maxSnelheid'
import { fetchWkdThemes, type WkdThemeResult } from './api/wkd'
import { fetchRijkswegDetails, type RijkswegDetails } from './api/weggeg'
import type { LookupDoc, WegvakFeatureCollection } from './types/nwb'
import type { MaxSnelheidRecord } from './types/arcgis'
import './App.css'

type Status = 'idle' | 'loading' | 'ready' | 'error'

const EMPTY_RIJKSWEG_DETAILS: RijkswegDetails = { maxSnelheden: new Map(), rijstroken: new Map() }

function App() {
  const [place, setPlace] = useState<LookupDoc | null>(null)
  const [data, setData] = useState<WegvakFeatureCollection | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [maxSnelheden, setMaxSnelheden] = useState<Map<number, MaxSnelheidRecord[]>>(new Map())
  const [wkdThemes, setWkdThemes] = useState<WkdThemeResult[]>([])
  const [rijkswegDetails, setRijkswegDetails] = useState<RijkswegDetails>(EMPTY_RIJKSWEG_DETAILS)

  // Guards the extra (WKD/speed/rijksweg) fetches against a stale search overwriting a newer one.
  const searchTokenRef = useRef(0)

  async function handleSelect(doc: LookupDoc) {
    const token = ++searchTokenRef.current
    setPlace(doc)
    setSelectedId(null)
    setStatus('loading')
    setMaxSnelheden(new Map())
    setWkdThemes([])
    setRijkswegDetails(EMPTY_RIJKSWEG_DETAILS)

    try {
      const result = await fetchWegvakken(doc.straatnaam, doc.gemeentenaam)
      if (token !== searchTokenRef.current) return
      setData(result)
      setStatus('ready')

      const wvkIds = result.features.map((f) => f.properties.wvk_id)
      const rijkWvkIds = result.features
        .filter((f) => f.properties.wegbehsrt === 'R')
        .map((f) => f.properties.wvk_id)

      fetchMaxSnelheden(wvkIds).then((m) => {
        if (token === searchTokenRef.current) setMaxSnelheden(m)
      })
      fetchWkdThemes(wvkIds, (theme) => {
        if (token === searchTokenRef.current) setWkdThemes((prev) => [...prev, theme])
      })
      if (rijkWvkIds.length > 0) {
        fetchRijkswegDetails(rijkWvkIds).then((details) => {
          if (token === searchTokenRef.current) setRijkswegDetails(details)
        })
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
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <WegvakTable
                features={data.features}
                selectedId={selectedId}
                onSelect={setSelectedId}
                maxSnelheden={maxSnelheden}
              />
              <RijkswegPanel details={rijkswegDetails} />
              <WkdThemesPanel themes={wkdThemes} />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
