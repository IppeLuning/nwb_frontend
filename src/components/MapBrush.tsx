import { useEffect, useRef, type RefObject } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Layer } from 'leaflet'
import type { WegvakFeature } from '../types/nwb'

/** 'off' = klikken (met popup); anders schildert slepen wegvakken aan of uit. */
export type BrushMode = 'off' | 'add' | 'remove'

export const BRUSH_MIN_RADIUS = 8
export const BRUSH_MAX_RADIUS = 80

/** Eén wegvak zoals de kwast het nodig heeft. */
interface Candidate {
  wvkId: number
  /** Grove voorselectie: alleen wegvakken in de buurt van de kwast toetsen. */
  bounds: L.LatLngBounds
  lines: L.LatLng[][]
  /** Schermpunten van `lines`; vervalt zodra de kaart beweegt of zoomt. */
  projected: L.Point[][] | null
}

/**
 * getLatLngs() geeft LatLng[] voor een LineString en LatLng[][] (of dieper)
 * voor een MultiLineString; wegvakken komen in beide vormen binnen.
 */
function flattenLines(latlngs: unknown): L.LatLng[][] {
  const lines: L.LatLng[][] = []
  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return
    if (node[0] instanceof L.LatLng) lines.push(node as L.LatLng[])
    else node.forEach(walk)
  }
  walk(latlngs)
  return lines
}

/** Raakt de kwast (schermpunt `p`, straal in pixels) dit wegvak? */
function touches(candidate: Candidate, map: L.Map, p: L.Point, radius: number): boolean {
  if (!candidate.projected) {
    candidate.projected = candidate.lines.map((line) => line.map((ll) => map.latLngToContainerPoint(ll)))
  }
  for (const line of candidate.projected) {
    if (line.length === 1) {
      if (line[0].distanceTo(p) <= radius) return true
      continue
    }
    for (let i = 1; i < line.length; i += 1) {
      if (L.LineUtil.pointToSegmentDistance(p, line[i - 1], line[i]) <= radius) return true
    }
  }
  return false
}

interface BrushPainterProps {
  mode: BrushMode
  /** Straal in schermpixels. */
  radius: number
  onPaint: (wvkIds: number[], selected: boolean) => void
  /** Cirkel die de kwast op de kaart aanwijst; ligt buiten de Leaflet-container. */
  cursorRef: RefObject<HTMLDivElement | null>
  onExit: () => void
}

/**
 * Schildert een selectie over de wegvakken. Zit in de MapContainer zodat het bij
 * de kaart kan, maar tekent zelf niets: het leest de bestaande GeoJSON-lagen.
 */
export function BrushPainter({ mode, radius, onPaint, cursorRef, onExit }: BrushPainterProps) {
  const map = useMap()

  // De handlers hangen aan de DOM en worden niet opnieuw gebonden als alleen de
  // straal of de callback verandert, dus lees die via refs.
  const onPaintRef = useRef(onPaint)
  const radiusRef = useRef(radius)
  const modeRef = useRef(mode)
  const onExitRef = useRef(onExit)
  useEffect(() => {
    onPaintRef.current = onPaint
    radiusRef.current = radius
    modeRef.current = mode
    onExitRef.current = onExit
  }, [onPaint, radius, mode, onExit])

  useEffect(() => {
    const cursor = cursorRef.current
    if (mode === 'off') {
      if (cursor) cursor.hidden = true
      return
    }

    const container = map.getContainer()
    map.closePopup()
    map.dragging.disable()
    map.doubleClickZoom.disable()
    map.boxZoom.disable()

    /** Geometrie van de zichtbare wegvakken; wordt per streek opnieuw opgehaald. */
    let candidates: Candidate[] = []
    /** Wegvakken die deze streek al geraakt heeft — elk hoogstens één keer. */
    let painted = new Set<number>()
    let last: L.Point | null = null
    /** Richting van deze streek; Alt keert de knop uit de werkbalk om. */
    let strokeSelects = mode === 'add'

    const invalidateProjection = () => {
      for (const candidate of candidates) candidate.projected = null
    }
    map.on('zoomend moveend', invalidateProjection)

    function collect(): Candidate[] {
      const list: Candidate[] = []
      map.eachLayer((layer) => {
        const feature = (layer as Layer & { feature?: WegvakFeature }).feature
        const wvkId = feature?.properties?.wvk_id
        const poly = layer as L.Polyline
        if (wvkId == null || typeof poly.getLatLngs !== 'function') return
        list.push({ wvkId, bounds: poly.getBounds(), lines: flattenLines(poly.getLatLngs()), projected: null })
      })
      return list
    }

    function paintAt(p: L.Point) {
      const r = radiusRef.current
      const box = L.latLngBounds(
        map.containerPointToLatLng(L.point(p.x - r, p.y + r)),
        map.containerPointToLatLng(L.point(p.x + r, p.y - r)),
      )
      const fresh: number[] = []
      for (const candidate of candidates) {
        if (painted.has(candidate.wvkId)) continue
        if (!box.intersects(candidate.bounds)) continue
        if (!touches(candidate, map, p, r)) continue
        painted.add(candidate.wvkId)
        fresh.push(candidate.wvkId)
      }
      if (fresh.length > 0) onPaintRef.current(fresh, strokeSelects)
    }

    function moveCursor(event: PointerEvent) {
      if (!cursor) return
      const p = map.mouseEventToContainerPoint(event)
      cursor.hidden = false
      cursor.style.transform = `translate(${p.x}px, ${p.y}px)`
    }

    /** Zoomknoppen en attributie blijven gewoon klikbaar. */
    const onControl = (event: Event) => Boolean((event.target as Element | null)?.closest('.leaflet-control'))

    /**
     * Leaflet luistert op de container in de bubbelfase, dus hier in de
     * capture-fase afvangen houdt popups en de klik-toggle uit de weg.
     */
    const swallow = (event: Event) => {
      if (onControl(event)) return
      event.stopPropagation()
    }

    const onPointerMove = (event: PointerEvent) => {
      moveCursor(event)
      if (!last) return
      const current = map.mouseEventToContainerPoint(event)
      // Tussenpunten invullen: bij een snelle sleep zitten de pointer-events te
      // ver uit elkaar om alles ertussen te raken.
      const step = Math.max(radiusRef.current / 2, 4)
      const steps = Math.ceil(last.distanceTo(current) / step)
      for (let i = 1; i <= steps; i += 1) {
        paintAt(L.point(last.x + ((current.x - last.x) * i) / steps, last.y + ((current.y - last.y) * i) / steps))
      }
      last = current
    }

    const endStroke = () => {
      last = null
      candidates = []
      painted = new Set()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endStroke)
      window.removeEventListener('pointercancel', endStroke)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (onControl(event)) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      candidates = collect()
      painted = new Set()
      strokeSelects = event.altKey ? modeRef.current !== 'add' : modeRef.current === 'add'
      last = map.mouseEventToContainerPoint(event)
      moveCursor(event)
      paintAt(last)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', endStroke)
      window.addEventListener('pointercancel', endStroke)
    }

    const onHover = (event: PointerEvent) => {
      if (!last) moveCursor(event)
    }
    const onLeave = () => {
      if (cursor && !last) cursor.hidden = true
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExitRef.current()
    }

    container.addEventListener('pointerdown', onPointerDown, true)
    container.addEventListener('pointermove', onHover)
    container.addEventListener('pointerleave', onLeave)
    container.addEventListener('mousedown', swallow, true)
    container.addEventListener('click', swallow, true)
    container.addEventListener('dblclick', swallow, true)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      endStroke()
      map.off('zoomend moveend', invalidateProjection)
      container.removeEventListener('pointerdown', onPointerDown, true)
      container.removeEventListener('pointermove', onHover)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('mousedown', swallow, true)
      container.removeEventListener('click', swallow, true)
      container.removeEventListener('dblclick', swallow, true)
      window.removeEventListener('keydown', onKeyDown)
      map.dragging.enable()
      map.doubleClickZoom.enable()
      map.boxZoom.enable()
      if (cursor) cursor.hidden = true
    }
  }, [map, mode, cursorRef])

  return null
}

interface BrushToolbarProps {
  mode: BrushMode
  radius: number
  onModeChange: (mode: BrushMode) => void
  onRadiusChange: (radius: number) => void
}

export function BrushToolbar({ mode, radius, onModeChange, onRadiusChange }: BrushToolbarProps) {
  return (
    <div className="map-tools">
      <div className="brush-modes" role="group" aria-label="Kaartgereedschap">
        <button
          type="button"
          aria-pressed={mode === 'off'}
          onClick={() => onModeChange('off')}
          title="Klikken: wegvak aan/uit zetten en de gegevens tonen"
        >
          Klikken
        </button>
        <button
          type="button"
          aria-pressed={mode === 'add'}
          onClick={() => onModeChange(mode === 'add' ? 'off' : 'add')}
          title="Kwast: sleep over de kaart om wegvakken te selecteren"
        >
          Kwast +
        </button>
        <button
          type="button"
          aria-pressed={mode === 'remove'}
          onClick={() => onModeChange(mode === 'remove' ? 'off' : 'remove')}
          title="Gum: sleep over de kaart om wegvakken uit de selectie te halen"
        >
          Kwast −
        </button>
      </div>

      {mode !== 'off' && (
        <>
          <label className="brush-size">
            Grootte
            <input
              type="range"
              min={BRUSH_MIN_RADIUS}
              max={BRUSH_MAX_RADIUS}
              step={2}
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
          </label>
          <p className="brush-hint">Alt = omgekeerd · Esc = stoppen</p>
        </>
      )}
    </div>
  )
}
