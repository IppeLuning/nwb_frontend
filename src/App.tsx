import { useState } from 'react'
import { StreetSearch } from './components/StreetSearch'
import { StreetSummary } from './components/StreetSummary'
import { StreetMap } from './components/StreetMap'
import { WegvakTable } from './components/WegvakTable'
import { fetchWegvakken } from './api/nwb'
import type { LookupDoc, WegvakFeatureCollection } from './types/nwb'
import './App.css'

type Status = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const [place, setPlace] = useState<LookupDoc | null>(null)
  const [data, setData] = useState<WegvakFeatureCollection | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function handleSelect(doc: LookupDoc) {
    setPlace(doc)
    setSelectedId(null)
    setStatus('loading')
    try {
      const result = await fetchWegvakken(doc.straatnaam, doc.gemeentenaam)
      setData(result)
      setStatus('ready')
    } catch {
      setData(null)
      setStatus('error')
    }
  }

  return (
    <div className="app">
      <header>
        <h1>NWB Straatzoeker</h1>
        <p className="subtitle">
          Alle gegevens die het Nationaal Wegenbestand kent over een straat — alleen op basis van de straatnaam.
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
              <WegvakTable features={data.features} selectedId={selectedId} onSelect={setSelectedId} />
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
