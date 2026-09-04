import { useCallback, useState } from 'react'
import { StreetSearch } from './components/StreetSearch'
import { StreetMap, type FocusRequest } from './components/StreetMap'
import { SelectionBar } from './components/SelectionBar'
import { RoadSection } from './components/RoadSection'
import { RoadsOverview } from './components/RoadsOverview'
import { InfoButton } from './components/InfoButton'
import { APP_INFO } from './lib/infoTexts'
import { nextRoadColor } from './lib/roadColors'
import { fetchWegvakkenForPlace } from './api/nwb'
import { fetchMaxSnelheden } from './api/maxSnelheid'
import { fetchWkdThemes } from './api/wkd'
import { fetchRijkswegDetails, type RijkswegDetails } from './api/weggeg'
import type { LookupDoc } from './types/nwb'
import type { RoadEntry } from './types/road'
import './App.css'

const EMPTY_RIJKSWEG_DETAILS: RijkswegDetails = {
  maxSnelheden: new Map(),
  rijstroken: new Map(),
  overgeslagen: 0,
}

function App() {
  /** De stapel opgezochte wegen; ze staan allemaal tegelijk op de kaart. */
  const [roads, setRoads] = useState<RoadEntry[]>([])
  /** Geselecteerde wegvakken, op wvk_id — uniek over alle wegen heen. */
  const [selectedWvkIds, setSelectedWvkIds] = useState<Set<number>>(new Set())

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

  // Wegen kunnen ver uit elkaar liggen; dan is uitzoomen naar alles onbruikbaar
  // en wil je op één weg kunnen inzoomen.
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const focusRoad = useCallback((roadId: string) => {
    setFocusRequest((prev) => ({ roadId, nonce: (prev?.nonce ?? 0) + 1 }))
  }, [])

  /** Werkt één weg in de stapel bij, mits die er nog in zit (kan verwijderd zijn). */
  const updateRoad = useCallback((roadId: string, patch: (road: RoadEntry) => RoadEntry) => {
    setRoads((prev) => prev.map((r) => (r.id === roadId ? patch(r) : r)))
  }, [])

  const removeRoad = useCallback((roadId: string) => {
    setRoads((prev) => {
      const road = prev.find((r) => r.id === roadId)
      if (road) {
        // Laat geen selectie achter van wegvakken die niet meer zichtbaar zijn.
        const gone = new Set(road.features.map((f) => f.properties.wvk_id))
        setSelectedWvkIds((sel) => new Set([...sel].filter((id) => !gone.has(id))))
      }
      return prev.filter((r) => r.id !== roadId)
    })
  }, [])

  async function handleSelect(doc: LookupDoc) {
    // Dezelfde weg niet twee keer aan de stapel toevoegen.
    if (roads.some((r) => r.id === doc.id)) return

    setRoads((prev) => [
      ...prev,
      {
        id: doc.id,
        place: doc,
        color: nextRoadColor(prev.map((r) => r.color)),
        status: 'loading',
        features: [],
        maxSnelheden: new Map(),
        wkdThemes: [],
        rijkswegDetails: EMPTY_RIJKSWEG_DETAILS,
        loading: { maxSnelheden: true, rijksweg: true, wkdDone: 0, wkdTotal: 0 },
      },
    ])

    try {
      const result = await fetchWegvakkenForPlace(doc)
      updateRoad(doc.id, (r) => ({ ...r, status: 'ready', features: result.features }))

      const wvkIds = result.features.map((f) => f.properties.wvk_id)
      // Een nieuwe weg komt volledig geselecteerd binnen: meestal wil je de hele
      // weg, en met de kwast haal je er sneller stukken uit dan dat je ze er
      // stuk voor stuk bij klikt.
      setWegvakkenSelected(wvkIds, true)

      // WEGGEG wordt afgekapt, dus zet de hoofdrijbanen (bst_code 'HR') vooraan:
      // die dragen de betekenisvolle rijstrook- en snelheidsconfiguratie.
      const rijkFeatures = result.features.filter((f) => f.properties.wegbehsrt === 'R')
      const rijkWvkIds = [
        ...rijkFeatures.filter((f) => f.properties.bst_code === 'HR'),
        ...rijkFeatures.filter((f) => f.properties.bst_code !== 'HR'),
      ].map((f) => f.properties.wvk_id)

      // Deze zijn aanvullend: als er één faalt of afkapt op de time-out blijft
      // de rest van de pagina gewoon staan. Zonder catch zou een afgebroken
      // request als unhandled rejection in de console belanden. updateRoad is
      // een no-op als de weg intussen is verwijderd.
      fetchMaxSnelheden(wvkIds)
        .then((m) => updateRoad(doc.id, (r) => ({ ...r, maxSnelheden: m })))
        .catch(() => {})
        .finally(() =>
          updateRoad(doc.id, (r) => ({ ...r, loading: { ...r.loading, maxSnelheden: false } })),
        )

      fetchWkdThemes(
        wvkIds,
        (theme) => updateRoad(doc.id, (r) => ({ ...r, wkdThemes: [...r.wkdThemes, theme] })),
        undefined,
        (done, total) =>
          updateRoad(doc.id, (r) => ({ ...r, loading: { ...r.loading, wkdDone: done, wkdTotal: total } })),
      ).catch(() => {})

      if (rijkWvkIds.length > 0) {
        fetchRijkswegDetails(rijkWvkIds)
          .then((details) => updateRoad(doc.id, (r) => ({ ...r, rijkswegDetails: details })))
          .catch(() => {})
          .finally(() => updateRoad(doc.id, (r) => ({ ...r, loading: { ...r.loading, rijksweg: false } })))
      } else {
        updateRoad(doc.id, (r) => ({ ...r, loading: { ...r.loading, rijksweg: false } }))
      }
    } catch {
      updateRoad(doc.id, (r) => ({
        ...r,
        status: 'error',
        loading: { maxSnelheden: false, rijksweg: false, wkdDone: 0, wkdTotal: 0 },
      }))
    }
  }

  const allFeatures = roads.flatMap((r) => r.features)

  return (
    <div className="app">
      <header>
        <h1>
          NWB Straatzoeker
          <InfoButton label="Over deze pagina" text={APP_INFO} />
        </h1>
        <p className="subtitle">
          Alle gegevens die het Nationaal Wegenbestand en aanverwante Rijkswaterstaat-databases kennen over een
          straat — alleen op basis van de straatnaam. Zoek meerdere wegen om ze samen op de kaart te zetten.
        </p>
      </header>

      <StreetSearch onSelect={handleSelect} />

      {/* Vlak onder de zoekbalk, want de sectie van de nieuwe weg staat bij een
          tweede weg al onder de vouw — daar zie je een spinner dus niet. */}
      {roads.some((r) => r.status === 'loading') && (
        <p className="adding-indicator" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          {roads
            .filter((r) => r.status === 'loading')
            .map((r) => r.place.straatnaam)
            .join(', ')}{' '}
          toevoegen…
        </p>
      )}

      {roads.length > 0 && (
        <>
          <RoadsOverview
            roads={roads}
            selectedWvkIds={selectedWvkIds}
            onFocus={focusRoad}
            onRemove={removeRoad}
          />
          <StreetMap
            roads={roads}
            selectedWvkIds={selectedWvkIds}
            onToggle={toggleWegvak}
            onSetSelected={setWegvakkenSelected}
            focusRequest={focusRequest}
          />
          <SelectionBar
            features={allFeatures}
            selectedWvkIds={selectedWvkIds}
            onSetSelected={setWegvakkenSelected}
            onClear={clearSelection}
          />
          {roads.map((road) => (
            <RoadSection
              key={road.id}
              road={road}
              selectedWvkIds={selectedWvkIds}
              onToggle={toggleWegvak}
              onSetSelected={setWegvakkenSelected}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default App
