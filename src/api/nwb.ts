import type { WegvakFeatureCollection } from '../types/nwb'

const BASE = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1'

/**
 * Fetches every NWB road segment (wegvak) for a street.
 * `stt_naam` matching is exact and case-sensitive, and `gme_naam` is required
 * to disambiguate street names that occur in more than one municipality —
 * both values must come from a Locatieserver lookup, not free user input.
 */
export async function fetchWegvakken(
  straatnaam: string,
  gemeentenaam: string,
  signal?: AbortSignal,
): Promise<WegvakFeatureCollection> {
  const url =
    `${BASE}/collections/wegvakken/items` +
    `?stt_naam=${encodeURIComponent(straatnaam)}` +
    `&gme_naam=${encodeURIComponent(gemeentenaam)}` +
    `&f=json&limit=1000`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`NWB wegvakken request failed: ${res.status}`)
  return res.json()
}
