import { fetchWithTimeout } from './http'
import type {
  WeggegFeatureCollection,
  WeggegMaxSnelheidProperties,
  WeggegRijstrokenProperties,
} from '../types/weggeg'

const BASE = 'https://api.pdok.nl/rws/weggegevens/ogc/v1'

// Only wvk_id (one value per request — no IN/comma-list support) is filterable.
async function fetchByWvkId<P>(collection: string, wvkId: number, signal?: AbortSignal) {
  const url = `${BASE}/collections/${collection}/items?wvk_id=${wvkId}&f=json`
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Weggegevens ${collection} request failed: ${res.status}`)
  const data: WeggegFeatureCollection<P> = await res.json()
  return data.features
}

export interface RijkswegDetails {
  maxSnelheden: Map<number, WeggegMaxSnelheidProperties[]>
  rijstroken: Map<number, WeggegRijstrokenProperties[]>
  /** Aantal wegvakken dat is overgeslagen door de limiet hieronder. */
  overgeslagen: number
}

/**
 * WEGGEG kan maar op één wvk_id tegelijk worden bevraagd, dus elk wegvak kost
 * twee requests. Een rijksweg binnen één gemeente kan honderden wegvakken
 * hebben (de A10 in Amsterdam heeft er 363), en die zijn allemaal Rijk-beheerd.
 * Zonder limiet zouden dat 726 requests zijn, dus wordt er afgekapt.
 */
export const MAX_WEGGEG_WEGVAKKEN = 25

/**
 * Fetches highway-only lane and time-variable speed detail for the given wegvakken.
 * Only call this for wvk_ids belonging to wegvakken with wegbehsrt === 'R' —
 * ordinary (non-Rijk) wegvakken never have data here.
 */
export async function fetchRijkswegDetails(wvkIds: number[], signal?: AbortSignal): Promise<RijkswegDetails> {
  const maxSnelheden = new Map<number, WeggegMaxSnelheidProperties[]>()
  const rijstroken = new Map<number, WeggegRijstrokenProperties[]>()
  const overgeslagen = Math.max(0, wvkIds.length - MAX_WEGGEG_WEGVAKKEN)
  if (wvkIds.length === 0) return { maxSnelheden, rijstroken, overgeslagen }

  const results = await Promise.allSettled(
    wvkIds.slice(0, MAX_WEGGEG_WEGVAKKEN).flatMap((wvkId) => [
      fetchByWvkId<WeggegMaxSnelheidProperties>('wegvak_max_snelheden', wvkId, signal).then((features) => ({
        wvkId,
        kind: 'snelheid' as const,
        features,
      })),
      fetchByWvkId<WeggegRijstrokenProperties>('wegvak_rijstroken', wvkId, signal).then((features) => ({
        wvkId,
        kind: 'rijstrook' as const,
        features,
      })),
    ]),
  )

  for (const outcome of results) {
    if (outcome.status !== 'fulfilled' || outcome.value.features.length === 0) continue
    const { wvkId, kind, features } = outcome.value
    if (kind === 'snelheid') {
      maxSnelheden.set(wvkId, features.map((f) => f.properties))
    } else {
      rijstroken.set(wvkId, features.map((f) => f.properties))
    }
  }

  return { maxSnelheden, rijstroken, overgeslagen }
}
