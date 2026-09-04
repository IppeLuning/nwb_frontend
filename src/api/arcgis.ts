import { fetchWithTimeout } from './http'
import type { ArcgisFeatureCollection } from '../types/arcgis'

/**
 * Queries a Rijkswaterstaat ArcGIS MapServer layer for every feature whose
 * `wvk_id` is in the given list (the same join key NWB wegvakken expose).
 * Shared by the max-speed layer and every Wegkenmerkendatabase (WKD) theme —
 * they're all the same ArcGIS REST query shape.
 */
/**
 * De server kapt query strings af rond 2048 tekens en antwoordt dan met een
 * 404 (gemeten: 150 ids ≈ 1945 tekens werkt, 200 ids ≈ 2545 tekens niet). Een
 * rijksweg levert al snel honderden wegvakken op, dus wordt de lijst in
 * stukken opgeknipt en worden de resultaten samengevoegd.
 */
const MAX_IDS_PER_QUERY = 120

export async function queryArcgisLayer<P = Record<string, unknown>>(
  serviceUrl: string,
  layerId: number,
  wvkIds: number[],
  signal?: AbortSignal,
): Promise<ArcgisFeatureCollection<P>> {
  if (wvkIds.length === 0) return { type: 'FeatureCollection', features: [] }

  const chunks: number[][] = []
  for (let i = 0; i < wvkIds.length; i += MAX_IDS_PER_QUERY) {
    chunks.push(wvkIds.slice(i, i + MAX_IDS_PER_QUERY))
  }

  const collections = await Promise.all(
    chunks.map(async (chunk) => {
      const where = `wvk_id IN (${chunk.join(',')})`
      const url = `${serviceUrl}/${layerId}/query?where=${encodeURIComponent(where)}&outFields=*&f=geojson`
      const res = await fetchWithTimeout(url, signal)
      if (!res.ok) throw new Error(`ArcGIS query failed (${serviceUrl}/${layerId}): ${res.status}`)
      return (await res.json()) as ArcgisFeatureCollection<P>
    }),
  )

  return {
    type: 'FeatureCollection',
    features: collections.flatMap((c) => c.features ?? []),
  }
}
