import { queryArcgisLayer } from './arcgis'
import type { ArcgisFeature } from '../types/arcgis'

const SERVICE_URL = 'https://geo.rijkswaterstaat.nl/arcgis/rest/services/GDR/wkd_wegkenmerkendatabase/MapServer'

export interface WkdLayerConfig {
  id: number
  key: string
  label: string
}

// All 26 layers of the Wegkenmerkendatabase, confirmed against
// GDR/wkd_wegkenmerkendatabase/MapServer?f=json.
export const WKD_LAYERS: WkdLayerConfig[] = [
  { id: 0, key: 'aslastbeperkingen', label: 'Aslastbeperkingen' },
  { id: 1, key: 'asverspringingen', label: 'Asverspringingen' },
  { id: 2, key: 'bomen', label: 'Bomen' },
  { id: 3, key: 'fietsstrooiroutes', label: 'Fietsstrooiroutes' },
  { id: 4, key: 'fiets_suggestie_stroken', label: 'Fietssuggestiestroken' },
  { id: 5, key: 'geleiderails', label: 'Vangrails' },
  { id: 6, key: 'hoogtebeperkingen', label: 'Hoogtebeperkingen' },
  { id: 7, key: 'inritten', label: 'Inritten' },
  { id: 8, key: 'komgrenzen', label: 'Komgrenzen' },
  { id: 9, key: 'lastbeperkingen', label: 'Lastbeperkingen' },
  { id: 10, key: 'lengtebeperkingen', label: 'Lengtebeperkingen' },
  { id: 11, key: 'middenbermbreedte', label: 'Middenbermbreedte' },
  { id: 12, key: 'oversteekplaatsen', label: 'Oversteekplaatsen' },
  { id: 13, key: 'paaltjes', label: 'Paaltjes' },
  { id: 14, key: 'parkeerpunten', label: 'Parkeerpunten' },
  { id: 15, key: 'parkeervlakken', label: 'Parkeervlakken' },
  { id: 16, key: 'rijstroken', label: 'Rijstroken' },
  { id: 17, key: 'rvm', label: 'Reguleerbare verkeersmaatregelen' },
  { id: 18, key: 'schoolzone', label: 'Schoolzones' },
  { id: 19, key: 'verkeerstypen', label: 'Verkeerstypen' },
  { id: 20, key: 'verlichting', label: 'Verlichting' },
  { id: 21, key: 'voetgangersoversteekplaatsen', label: 'Voetgangersoversteekplaatsen' },
  { id: 22, key: 'vrachtwagentolheffingsnetwerk', label: 'Vrachtwagentolheffingsnetwerk' },
  { id: 23, key: 'wegbreedte', label: 'Wegbreedte' },
  { id: 24, key: 'wegcategorisering', label: 'Wegcategorisering' },
  { id: 25, key: 'wegversmallingen', label: 'Wegversmallingen' },
]

export interface WkdThemeResult {
  layer: WkdLayerConfig
  features: ArcgisFeature[]
}

/**
 * Alle 26 lagen worden parallel bevraagd. Bij een rijksweg met honderden
 * wegvakken zou elke laag ook nog eens in meerdere chunks uiteenvallen, wat
 * neerkomt op ruim honderd gelijktijdige requests — die verdringen elkaar en
 * lopen tegen de time-out aan, waardoor er juist lagen wegvallen. Daarom wordt
 * de lijst hier afgekapt op één chunk per laag.
 */
export const MAX_WKD_WEGVAKKEN = 120

/**
 * Fetches every WKD theme in parallel, calling `onThemeReady` as soon as each
 * one resolves with a match — most layers answer in a few seconds, and a
 * single slow or timed-out layer shouldn't delay showing the rest. The
 * returned promise resolves once every layer has settled, for callers that
 * need to know when fetching is fully done (e.g. to stop a loading indicator).
 */
export async function fetchWkdThemes(
  wvkIds: number[],
  onThemeReady: (result: WkdThemeResult) => void,
  signal?: AbortSignal,
  /** Wordt na elke afgehandelde laag aangeroepen — ook als die niets opleverde. */
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (wvkIds.length === 0) return
  const ids = wvkIds.slice(0, MAX_WKD_WEGVAKKEN)
  let done = 0

  await Promise.allSettled(
    WKD_LAYERS.map(async (layer) => {
      try {
        const collection = await queryArcgisLayer(SERVICE_URL, layer.id, ids, signal)
        if (collection.features.length > 0) {
          onThemeReady({ layer, features: collection.features })
        }
      } finally {
        done += 1
        onProgress?.(done, WKD_LAYERS.length)
      }
    }),
  )
}
