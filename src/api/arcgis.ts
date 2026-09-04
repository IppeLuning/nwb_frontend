import { fetchWithTimeout } from './http'
import type { ArcgisFeatureCollection } from '../types/arcgis'

/**
 * Queries a Rijkswaterstaat ArcGIS MapServer layer for every feature whose
 * `wvk_id` is in the given list (the same join key NWB wegvakken expose).
 * Shared by the max-speed layer and every Wegkenmerkendatabase (WKD) theme —
 * they're all the same ArcGIS REST query shape.
 */
export async function queryArcgisLayer<P = Record<string, unknown>>(
  serviceUrl: string,
  layerId: number,
  wvkIds: number[],
  signal?: AbortSignal,
): Promise<ArcgisFeatureCollection<P>> {
  if (wvkIds.length === 0) return { type: 'FeatureCollection', features: [] }
  const where = `wvk_id IN (${wvkIds.join(',')})`
  const url = `${serviceUrl}/${layerId}/query?where=${encodeURIComponent(where)}&outFields=*&f=geojson`
  const res = await fetchWithTimeout(url, signal)
  if (!res.ok) throw new Error(`ArcGIS query failed (${serviceUrl}/${layerId}): ${res.status}`)
  return res.json()
}
