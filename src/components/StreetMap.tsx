import { useEffect, useRef } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer, PathOptions } from 'leaflet'
import type { WegvakFeature, WegvakFeatureCollection } from '../types/nwb'
import { formatLength, rijrichtngLabel, wegbehsrtLabel } from '../lib/fieldLabels'

const TILE_URL = 'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'

const SELECTED: PathOptions = { color: '#e8590c', weight: 6, opacity: 1 }
const UNSELECTED: PathOptions = { color: '#1c7ed6', weight: 4, opacity: 1 }
// Zodra er iets geselecteerd is, vervaagt de rest zodat de selectie opvalt.
const DIMMED: PathOptions = { color: '#1c7ed6', weight: 3, opacity: 0.35 }

interface StreetMapProps {
  datasetKey: string
  data: WegvakFeatureCollection
  selectedWvkIds: Set<number>
  onToggle: (wvkId: number) => void
}

export function StreetMap({ datasetKey, data, selectedWvkIds, onToggle }: StreetMapProps) {
  const layerRef = useRef<L.GeoJSON | null>(null)

  // Het klikhandler wordt één keer aan elke feature gehangen, dus lees de
  // actuele callback via een ref in plaats van hem in de closure te vangen.
  const onToggleRef = useRef(onToggle)
  useEffect(() => {
    onToggleRef.current = onToggle
  }, [onToggle])

  function styleFor(wvkId: number | undefined): PathOptions {
    if (wvkId != null && selectedWvkIds.has(wvkId)) return SELECTED
    return selectedWvkIds.size > 0 ? DIMMED : UNSELECTED
  }

  // Opnieuw stylen zonder de laag te remounten: bij een rijksweg zijn dat
  // honderden features, die wil je niet bij elke klik opnieuw opbouwen.
  useEffect(() => {
    layerRef.current?.eachLayer((layer) => {
      const feature = (layer as Layer & { feature?: WegvakFeature }).feature
      const path = layer as L.Path
      if (feature && typeof path.setStyle === 'function') {
        path.setStyle(styleFor(feature.properties?.wvk_id))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWvkIds, data])

  return (
    <div className="map-wrap">
      <MapContainer center={[52.1, 5.3]} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE_URL} attribution="Kaartgegevens &copy; Kadaster" maxZoom={19} />
        <FitToData data={data} />
        <GeoJSON
          key={datasetKey}
          ref={layerRef}
          data={data as unknown as GeoJSON.GeoJsonObject}
          style={(feature) => styleFor((feature as WegvakFeature | undefined)?.properties?.wvk_id)}
          onEachFeature={(feature, layer: Layer) => {
            const f = feature as unknown as WegvakFeature
            const p = f.properties
            layer.bindPopup(
              `<strong>${p.stt_naam || p.wegnummer || 'Wegvak'}</strong> (wegvak ${p.wvk_id})<br/>` +
                `${wegbehsrtLabel(p.wegbehsrt)} — ${p.wegbehnaam || 'onbekend'}<br/>` +
                `${p.wgtype_oms || 'onbekend wegtype'}<br/>` +
                `Richting: ${rijrichtngLabel(p.rijrichtng)}<br/>` +
                `Lengte: ${formatLength(p.st_lengthshape)}`,
            )
            layer.on('click', () => onToggleRef.current(p.wvk_id))
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
