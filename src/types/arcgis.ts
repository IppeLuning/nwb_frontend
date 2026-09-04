// Generic shapes for Rijkswaterstaat's ArcGIS REST (MapServer) feature queries,
// requested with f=geojson so they already match the GeoJSON types used elsewhere.

export interface ArcgisFeature<P = Record<string, unknown>> {
  type: 'Feature'
  id?: number
  geometry: { type: string; coordinates: unknown } | null
  properties: P
}

export interface ArcgisFeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection'
  features: ArcgisFeature<P>[]
  exceededTransferLimit?: boolean
}

// GDR/maximum_snelheden_wegen/MapServer/8 (max_snelheden_per_wegvak)
export interface MaxSnelheidProperties {
  wvk_id: number
  van: number
  naar: number
  maxshd: string
  maxshd_alt: number
  maxshd_str: number
  maxshd_adv: number
  begintijd: number
  eindtijd: number
  kenm_richt: string
  betrwbheid: string
  bst_code: string
  [key: string]: unknown
}

export interface MaxSnelheidRecord {
  vanaf: number
  tot: number
  snelheid: string
  richting: string
}
