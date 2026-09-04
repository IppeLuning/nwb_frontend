import { fetchWithTimeout } from './http'
import type { LookupDoc, WegvakFeatureCollection } from '../types/nwb'

const BASE = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1'

async function fetchItems(params: string, signal?: AbortSignal): Promise<WegvakFeatureCollection> {
  const res = await fetchWithTimeout(`${BASE}/collections/wegvakken/items?${params}&f=json&limit=1000`, signal)
  if (!res.ok) throw new Error(`NWB wegvakken request failed: ${res.status}`)
  return res.json()
}

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
  return fetchItems(
    `stt_naam=${encodeURIComponent(straatnaam)}&gme_naam=${encodeURIComponent(gemeentenaam)}`,
    signal,
  )
}

/**
 * Rijkswegen staan in het NWB niet onder hun wegnummer als straatnaam, maar in
 * het veld WEGNUMMER — en dan zonder letter en met nullen aangevuld tot drie
 * tekens. Zoeken op stt_naam='A10' levert daarom niets op; wegnummer='010' wel.
 */
export async function fetchWegvakkenByWegnummer(
  wegnummer: string,
  gemeentenaam: string,
  signal?: AbortSignal,
): Promise<WegvakFeatureCollection> {
  return fetchItems(
    `wegnummer=${encodeURIComponent(wegnummer)}&gme_naam=${encodeURIComponent(gemeentenaam)}`,
    signal,
  )
}

/**
 * De Locatieserver levert twee soorten treffers: gewone straten (bron
 * 'BAG/NWB', met woonplaats) en wegnummers zoals A2 of N57 (bron 'NWB', zonder
 * woonplaats). Alleen die tweede soort moet op wegnummer worden opgezocht.
 */
export function isWegnummerEntry(doc: LookupDoc): boolean {
  return doc.bron === 'NWB' && /^[A-Z]\d+$/i.test(doc.straatnaam.trim())
}

/** 'A10' → '010', 'N57' → '057'. */
export function toWegnummer(roadNumber: string): string {
  return roadNumber.replace(/\D/g, '').padStart(3, '0')
}

/** Kiest automatisch de juiste zoekwijze voor een Locatieserver-treffer. */
export async function fetchWegvakkenForPlace(
  doc: LookupDoc,
  signal?: AbortSignal,
): Promise<WegvakFeatureCollection> {
  return isWegnummerEntry(doc)
    ? fetchWegvakkenByWegnummer(toWegnummer(doc.straatnaam), doc.gemeentenaam, signal)
    : fetchWegvakken(doc.straatnaam, doc.gemeentenaam, signal)
}
