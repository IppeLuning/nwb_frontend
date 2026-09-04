import { fetchWithTimeout } from './http'
import type { LookupDoc, LookupResponse, SuggestDoc, SuggestResponse } from '../types/nwb'

const BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1'

/** Live autocomplete suggestions for street names, via the PDOK Locatieserver. */
export async function suggestStreets(term: string, signal?: AbortSignal): Promise<SuggestDoc[]> {
  const url = `${BASE}/suggest?q=${encodeURIComponent(term)}&fq=type:weg&rows=10`
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Locatieserver suggest failed: ${res.status}`)
  const data: SuggestResponse = await res.json()
  return data.response.docs
}

/** Resolves a suggestion id to the exact street name + municipality needed to query the NWB. */
export async function lookupStreet(id: string, signal?: AbortSignal): Promise<LookupDoc> {
  const url = `${BASE}/lookup?id=${encodeURIComponent(id)}`
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`Locatieserver lookup failed: ${res.status}`)
  const data: LookupResponse = await res.json()
  const doc = data.response.docs[0]
  if (!doc) throw new Error('No lookup result for this suggestion')
  return doc
}
