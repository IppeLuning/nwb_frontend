// PDOK Weggegevens (WEGGEG) — https://api.pdok.nl/rws/weggegevens/ogc/v1
// Rijkswegen (national highways) only.

export interface WeggegMaxSnelheidProperties {
  wvk_id: number
  begafstand: number
  endafstand: number
  begintijd: number | null
  eindtijd: number | null
  omschr: number // the speed limit itself, km/h
  kantcode: string
  izi_side: string
  [key: string]: unknown
}

export interface WeggegRijstrokenProperties {
  wvk_id: number
  begafstand: number
  endafstand: number
  omschr: string // e.g. "3 -> 3" (lane count, possibly changing along the segment)
  kantcode: string
  izi_side: string
  vnrwol: string
  [key: string]: unknown
}

export interface WeggegFeature<P> {
  type: 'Feature'
  id: string
  geometry: { type: string; coordinates: unknown }
  properties: P
}

export interface WeggegFeatureCollection<P> {
  type: 'FeatureCollection'
  features: WeggegFeature<P>[]
}
