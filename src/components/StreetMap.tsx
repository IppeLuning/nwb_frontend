import { useEffect } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer } from 'leaflet'
import type { WegvakFeature, WegvakFeatureCollection } from '../types/nwb'
import { formatLength, rijrichtngLabel, wegbehsrtLabel } from '../lib/fieldLabels'

const TILE_URL = 'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'

interface StreetMapProps {
  datasetKey: string
  data: WegvakFeatureCollection
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function StreetMap({ datasetKey, data, selectedId, onSelect }: StreetMapProps) {
  return (
    <div className="map-wrap">
      <MapContainer center={[52.1, 5.3]} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE_URL} attribution="Kaartgegevens &copy; Kadaster" maxZoom={19} />
        <FitToData data={data} />
        <GeoJSON
          key={`${datasetKey}-${selectedId ?? 'none'}`}
          data={data as unknown as GeoJSON.GeoJsonObject}
          style={(feature) => ({
            color: feature?.id === selectedId ? '#e8590c' : '#1c7ed6',
            weight: feature?.id === selectedId ? 6 : 4,
          })}
          onEachFeature={(feature, layer: Layer) => {
            const f = feature as unknown as WegvakFeature
            const p = f.properties
            layer.bindPopup(
              `<strong>${p.stt_naam}</strong> (wegvak ${p.wvk_id})<br/>` +
                `${wegbehsrtLabel(p.wegbehsrt)} — ${p.wegbehnaam || 'onbekend'}<br/>` +
                `${p.wgtype_oms || 'onbekend wegtype'}<br/>` +
                `Richting: ${rijrichtngLabel(p.rijrichtng)}<br/>` +
                `Lengte: ${formatLength(p.st_lengthshape)}`,
            )
            layer.on('click', () => onSelect(f.id === selectedId ? null : f.id))
          }}
        />
      </MapContainer>
    </div>
  )
}

function FitToData({ data }: { data: WegvakFeatureCollection }) {
  const map = useMap()

  useEffect(() => {
    if (data.features.length === 0) return
    const bounds = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return null
}
