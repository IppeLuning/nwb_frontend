import { queryArcgisLayer } from './arcgis'
import type { MaxSnelheidProperties, MaxSnelheidRecord } from '../types/arcgis'

const SERVICE_URL = 'https://geo.rijkswaterstaat.nl/arcgis/rest/services/GDR/maximum_snelheden_wegen/MapServer'
const LAYER_ID = 8 // max_snelheden_per_wegvak — nationwide, not just highways

/** Speed limit(s) per wegvak. A wegvak can have more than one van/tot sub-segment. */
export async function fetchMaxSnelheden(
  wvkIds: number[],
  signal?: AbortSignal,
): Promise<Map<number, MaxSnelheidRecord[]>> {
  const collection = await queryArcgisLayer<MaxSnelheidProperties>(SERVICE_URL, LAYER_ID, wvkIds, signal)
  const byWvkId = new Map<number, MaxSnelheidRecord[]>()
  for (const f of collection.features) {
    const p = f.properties
    const list = byWvkId.get(p.wvk_id) ?? []
    list.push({ vanaf: p.van, tot: p.naar, snelheid: p.maxshd, richting: p.kenm_richt })
    byWvkId.set(p.wvk_id, list)
  }
  return byWvkId
}
