import { useEffect, useRef, useState } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer, PathOptions } from 'leaflet'
import type { WegvakFeature } from '../types/nwb'
import type { RoadEntry } from '../types/road'
import { formatLength, rijrichtngLabel, wegbehsrtLabel } from '../lib/fieldLabels'
import { BrushPainter, BrushToolbar, type BrushMode } from './MapBrush'

const TILE_URL = 'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'

/**
 * Elke weg houdt zijn eigen kleur, ook als er iets geselecteerd is — anders
 * kun je bij meerdere wegen niet meer zien welk wegvak bij welke weg hoort.
 * Selectie wordt daarom met dikte en doorzichtigheid aangegeven.
 */
function styleFor(color: string, isSelected: boolean, hasSelection: boolean): PathOptions {
  if (isSelected) return { color, weight: 7, opacity: 1 }
  return hasSelection ? { color, weight: 3, opacity: 0.3 } : { color, weight: 4, opacity: 1 }
}

/** Leaflet-laag van één wegvak, met de laatst toegepaste stijl erop onthouden. */
type StyledLayer = Layer & { feature?: WegvakFeature; __styleKey?: string }

export interface FocusRequest {
  roadId: string
  /** Loopt op bij elke klik, zodat twee keer dezelfde weg ook opnieuw inzoomt. */
  nonce: number
}

interface StreetMapProps {
  roads: RoadEntry[]
  selectedWvkIds: Set<number>
  onToggle: (wvkId: number) => void
  onSetSelected: (wvkIds: number[], selected: boolean) => void
  focusRequest: FocusRequest | null
}

export function StreetMap({ roads, selectedWvkIds, onToggle, onSetSelected, focusRequest }: StreetMapProps) {
  // Wegvak voor wegvak aanklikken is bewerkelijk; met de kwast sleep je een
  // selectie in één keer aan of uit.
  const [brushMode, setBrushMode] = useState<BrushMode>('off')
  const [brushRadius, setBrushRadius] = useState(24)
  const cursorRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className={`map-wrap${brushMode === 'off' ? '' : ' brushing'}`}>
      <MapContainer center={[52.1, 5.3]} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE_URL} attribution="Kaartgegevens &copy; Kadaster" maxZoom={19} />
        <FitToRoads roads={roads} />
        <FocusRoad roads={roads} request={focusRequest} />
        {roads.map((road) => (
          <RoadLayer key={road.id} road={road} selectedWvkIds={selectedWvkIds} onToggle={onToggle} />
        ))}
        <BrushPainter
          mode={brushMode}
          radius={brushRadius}
          onPaint={onSetSelected}
          cursorRef={cursorRef}
          onExit={() => setBrushMode('off')}
        />
      </MapContainer>

      {/* Buiten de MapContainer, anders vangt Leaflet de klikken op de knoppen af. */}
      <BrushToolbar
        mode={brushMode}
        radius={brushRadius}
        onModeChange={setBrushMode}
        onRadiusChange={setBrushRadius}
      />
      <div
        ref={cursorRef}
        className="brush-cursor"
        data-mode={brushMode}
        style={{ width: brushRadius * 2, height: brushRadius * 2 }}
        hidden
        aria-hidden="true"
      />
    </div>
  )
}

/** Zoomt in op één weg — nodig zodra er wegen ver uit elkaar op de kaart staan. */
function FocusRoad({ roads, request }: { roads: RoadEntry[]; request: FocusRequest | null }) {
  const map = useMap()

  useEffect(() => {
    if (!request) return
    const road = roads.find((r) => r.id === request.roadId)
    if (!road || road.features.length === 0) return
    const bounds = L.geoJSON({
      type: 'FeatureCollection',
      features: road.features,
    } as unknown as GeoJSON.GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.roadId, request?.nonce])

  return null
}

function RoadLayer({
  road,
  selectedWvkIds,
  onToggle,
}: {
  road: RoadEntry
  selectedWvkIds: Set<number>
  onToggle: (wvkId: number) => void
}) {
  const layerRef = useRef<L.GeoJSON | null>(null)

  // De klikhandler wordt één keer per feature gebonden, dus lees de actuele
  // callback via een ref in plaats van hem in de closure te vangen.
  const onToggleRef = useRef(onToggle)
  useEffect(() => {
    onToggleRef.current = onToggle
  }, [onToggle])

  // Opnieuw stylen zonder remount: bij een rijksweg zijn dat honderden
  // features, die wil je niet bij elke klik opnieuw opbouwen. De kwast stuurt
  // bovendien tijdens het slepen updates, dus sla setStyle over voor wegvakken
  // die er hetzelfde uit blijven zien.
  useEffect(() => {
    const hasSelection = selectedWvkIds.size > 0
    layerRef.current?.eachLayer((layer) => {
      const styled = layer as StyledLayer
      const path = layer as L.Path
      const wvkId = styled.feature?.properties?.wvk_id
      if (wvkId == null || typeof path.setStyle !== 'function') return
      const isSelected = selectedWvkIds.has(wvkId)
      const key = `${road.color}|${isSelected}|${hasSelection}`
      if (styled.__styleKey === key) return
      styled.__styleKey = key
      path.setStyle(styleFor(road.color, isSelected, hasSelection))
    })
  }, [selectedWvkIds, road.color, road.features])

  if (road.features.length === 0) return null

  const collection = { type: 'FeatureCollection' as const, features: road.features }

  return (
    <GeoJSON
      ref={layerRef}
      data={collection as unknown as GeoJSON.GeoJsonObject}
      style={(feature) => {
        const wvkId = (feature as WegvakFeature | undefined)?.properties?.wvk_id
        return styleFor(road.color, wvkId != null && selectedWvkIds.has(wvkId), selectedWvkIds.size > 0)
      }}
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
  )
}

/** Zoomt uit naar alle wegen samen zodra er een weg bij komt of afvalt. */
function FitToRoads({ roads }: { roads: RoadEntry[] }) {
  const map = useMap()
  const fingerprint = roads.map((r) => `${r.id}:${r.features.length}`).join('|')

  useEffect(() => {
    const all = roads.flatMap((r) => r.features)
    if (all.length === 0) return
    const bounds = L.geoJSON({ type: 'FeatureCollection', features: all } as unknown as GeoJSON.GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint])

  return null
}
