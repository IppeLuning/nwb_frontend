import type { ArcgisFeature, MaxSnelheidRecord } from '../types/arcgis'

// Code tables confirmed against the NWB attribute documentation (NDW docs).

export const WEGBEHSRT_LABELS: Record<string, string> = {
  R: 'Rijk',
  P: 'Provincie',
  G: 'Gemeente',
  W: 'Waterschap',
  T: 'Particulier',
}

export const RIJRICHTNG_LABELS: Record<string, string> = {
  H: 'Heen',
  T: 'Terug',
  B: 'Beide richtingen',
  O: 'Onbekend',
}

export function wegbehsrtLabel(code: string): string {
  return WEGBEHSRT_LABELS[code] ?? code
}

export function rijrichtngLabel(code: string): string {
  return RIJRICHTNG_LABELS[code] ?? code
}

export function formatLength(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

export interface BreedteSamenvatting {
  /** Lengtegewogen gemiddelde breedte in meters. */
  gemiddeld: number
  /** Smalste en breedste meting binnen de selectie. */
  min: number
  max: number
  /** Meters waarvoor een breedte bekend is — de rest is 'onbekend' of ontbreekt. */
  bekendeMeters: number
}

/** Lengte van één WKD-breedtestuk; de meting geldt per stuk van 'van' tot 'tot'. */
function breedteStukLengte(props: Record<string, unknown>): number {
  const shape = Number(props['st_length(shape)'])
  if (Number.isFinite(shape) && shape > 0) return shape
  const van = Number(props.van)
  const tot = Number(props.tot)
  return Number.isFinite(van) && Number.isFinite(tot) ? Math.max(0, tot - van) : 0
}

/**
 * Vat de WKD-wegbreedtes van een aantal wegvakken samen tot één breedte. De
 * breedte staat per stuk wegvak en varieert over een straat, dus wegen lange
 * stukken zwaarder mee dan korte. Stukken zonder meting ('onbekend') tellen
 * niet mee; `bekendeMeters` laat zien hoeveel de uitkomst dan nog dekt.
 */
export function summarizeBreedte(
  features: ArcgisFeature[] | undefined,
  wvkIds: Set<number>,
): BreedteSamenvatting | null {
  if (!features || features.length === 0) return null

  let gewogenSom = 0
  let meters = 0
  let min = Infinity
  let max = -Infinity

  for (const feature of features) {
    const props = feature.properties as Record<string, unknown>
    if (!wvkIds.has(Number(props.wvk_id))) continue
    // 'onbekend' wordt NaN — precies de stukken die we willen overslaan.
    const breedte = Number(props.breedte)
    if (!Number.isFinite(breedte) || breedte <= 0) continue
    const lengte = breedteStukLengte(props)
    if (lengte <= 0) continue

    gewogenSom += breedte * lengte
    meters += lengte
    min = Math.min(min, Number(props.brdt_min) || breedte)
    max = Math.max(max, Number(props.brdt_max) || breedte)
  }

  if (meters === 0) return null
  return { gemiddeld: gewogenSom / meters, min, max, bekendeMeters: meters }
}

export function formatBreedte(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return `${meters.toFixed(1)} m`
}

/** House-number range on one side of the road, e.g. "5–29" or "—" if unknown. */
export function formatHuisnummers(start: number | null, end: number | null): string {
  if (start == null && end == null) return '—'
  if (start == null) return `t/m ${end}`
  if (end == null) return `vanaf ${start}`
  return start === end ? `${start}` : `${start}–${end}`
}

export function formatRouteNumbers(props: {
  routenr: number | null
  routenr2: number | null
  routenr3: number | null
  routenr4: number | null
}): string {
  const numbers = [props.routenr, props.routenr2, props.routenr3, props.routenr4].filter(
    (n): n is number => n != null,
  )
  return numbers.length ? numbers.join(', ') : '—'
}

/** Speed limit(s) for a wegvak. "NVT" (not applicable, e.g. a footpath) is treated as unknown. */
export function formatMaxSnelheid(records: MaxSnelheidRecord[] | undefined): string {
  if (!records || records.length === 0) return '—'
  const speeds = Array.from(new Set(records.map((r) => r.snelheid).filter((s) => s && s !== 'NVT')))
  return speeds.length ? speeds.map((s) => `${s} km/h`).join(' / ') : '—'
}

/**
 * Bespoke formatting for the WKD "wegbreedte" theme. Shows which stretch of the
 * wegvak the width applies to, plus the narrowest/widest scan-line measurement
 * when those differ from the median — that spread is exactly why one street
 * ends up with several different widths.
 */
export function formatWegbreedte(props: Record<string, unknown>): string {
  const breedte = props.breedte
  if (breedte == null || breedte === 'onbekend') return 'Breedte onbekend'

  const stretch = props.van != null && props.tot != null ? `${props.van}–${props.tot} m: ` : ''
  const parts = [`${stretch}${breedte} m`]

  const min = props.brdt_min
  const max = props.brdt_max
  if (min && max && min !== 'onbekend' && max !== 'onbekend' && !(min === breedte && max === breedte)) {
    parts.push(`smalst ${min} m, breedst ${max} m`)
  }
  if (props.betr && props.betr !== 'onbekend') parts.push(String(props.betr))
  if (props.bron && props.bron !== 'onbekend') parts.push(`bron: ${props.bron}`)
  return parts.join(' — ')
}

// Fields present on almost every WKD layer that aren't useful to show directly:
// internal ids, bookkeeping timestamps and cross-references.
const WKD_BOILERPLATE_FIELDS = new Set([
  'objectid',
  'fk_veld1',
  'fk_veld4',
  'st_length(shape)',
  'wvk_begdat',
  'begindat',
  'wvk_id',
  'bron_id',
  'segment_id',
  'nwb_versie',
  'cluster_id',
  'overstk_id',
  'wvkid_lst',
  'nwb_node',
])

// Readable names for the WKD field codes, taken from the WKD documentation
// (docs.ndw.nu/handleidingen/wkd) and the layer metadata of each service.
const WKD_FIELD_LABELS: Record<string, string> = {
  van: 'Vanaf (m)',
  tot: 'Tot (m)',
  van_per: 'Vanaf (%)',
  betr: 'Betrouwbaarheid',
  bron: 'Bron',
  breedte: 'Breedte',
  brdt_min: 'Smalste meting',
  brdt_max: 'Breedste meting',
  vrsml: 'Wegversmalling',
  vrsml_bord: 'Bord wegversmalling',
  bep_waarde: 'Beperking',
  v_vrksbrd: 'Verkeersbord',
  vrkrsbrd: 'Verkeersbord',
  kantcode: 'Zijde (code)',
  posomschr: 'Positie',
  zijde: 'Zijde',
  soort: 'Soort',
  type: 'Type',
  aantal: 'Aantal',
  weg_cat: 'Wegcategorie',
  omschr: 'Omschrijving',
  richting: 'Richting',
  oppervlak: 'Oppervlakte (m²)',
  kilomtrrng: 'Kilometrering',
  wegnummer: 'Wegnummer',
  // bomen
  aant_bomen: 'Aantal bomen',
  ondergr: 'Ondergrond berm',
  // komgrenzen
  kom_gmnaam: 'Gemeente',
  kom_plaats: 'Plaats',
  kom_van: 'Kom vanaf (m)',
  kom_tot: 'Kom tot (m)',
  kom_gmcode: 'Gemeentecode',
  // verlichting
  verlichtin: 'Verlichting',
  kwaliteit_: 'Kwaliteit',
  // fietsen
  strooifiet: 'Strooiroute fiets',
  fts_sug_h: 'Fietssuggestiestrook (heen)',
  fts_sug_t: 'Fietssuggestiestrook (terug)',
  fiets: 'Fiets',
  // rvm
  rvm_soort: 'RVM-netwerk',
  hefnetwerk: 'Heffingsnetwerk',
  // rijstroken
  rijstrkn: 'Rijstroken',
  invgstrkn: 'Invoegstroken',
  uitvgstrkn: 'Uitvoegstroken',
  weefstrkn: 'Weefstroken',
  sstrknr: 'Spitsstrook rechts',
  sstrknl: 'Spitsstrook links',
  dgpstrkn: 'Doelgroepstroken',
  wisselstrk: 'Wisselstrook',
  buusstrk: 'Busstrook',
  busvrstrk: 'Busvrije strook',
  // oversteekplaatsen
  snelheid: 'Snelheidslimiet',
  gesch_rijb: 'Gescheiden rijbaan',
  waarsc_brd: 'Waarschuwingsbord',
  haltes: 'Haltes',
  hoofdmod: 'Hoofdvervoerwijze',
  wand_fiets: 'Wandel-/fietsroute',
  // schoolzone
  naamschl: 'School',
  strnmsch: 'Straat school',
  hnr_sch: 'Huisnummer school',
  aandzone: 'Zoneaanduiding',
  tkstweg: 'Tekst op wegdek',
  tkstonbo: 'Tekst onderbord',
  dat_bord: 'Datum bord',
  // verkeerstypen — per voertuigtype in de heen- (_h) en terugrichting (_t)
  vtgngr_h: 'Voetganger (heen)',
  vtgngr_t: 'Voetganger (terug)',
  fiets_h: 'Fiets (heen)',
  fiets_t: 'Fiets (terug)',
  snrfts_h: 'Snorfiets (heen)',
  snrfts_t: 'Snorfiets (terug)',
  brmfts_h: 'Bromfiets (heen)',
  brmfts_t: 'Bromfiets (terug)',
  mtrfts_h: 'Motorfiets (heen)',
  mtrfts_t: 'Motorfiets (terug)',
  auto_h: 'Personenauto (heen)',
  auto_t: 'Personenauto (terug)',
  aanhngr_h: 'Met aanhanger (heen)',
  aanhngr_t: 'Met aanhanger (terug)',
  vrchtt_h: 'Vrachtauto (heen)',
  vrchtt_t: 'Vrachtauto (terug)',
  autobs_h: 'Autobus (heen)',
  autobs_t: 'Autobus (terug)',
  lndbw_h: 'Landbouwvoertuig (heen)',
  lndbw_t: 'Landbouwvoertuig (terug)',
}

function wkdFieldLabel(key: string): string {
  return WKD_FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** WKD gebruikt j/n (ja/nee) als booleaanse waarde — toon dat voluit. */
function wkdFieldValue(value: unknown): string {
  const text = String(value)
  const normalized = text.trim().toLowerCase()
  if (normalized === 'j' || normalized === 'ja') return 'Ja'
  if (normalized === 'n' || normalized === 'nee') return 'Nee'
  return text
}

/**
 * Generic fallback for the WKD themes without bespoke formatting: strips
 * boilerplate/unknown fields and returns readable [label, value] pairs.
 */
export function wkdPropertyEntries(properties: Record<string, unknown>): [string, string][] {
  return Object.entries(properties)
    .filter(([key, value]) => !WKD_BOILERPLATE_FIELDS.has(key) && value != null && value !== '' && value !== 'onbekend')
    .map(([key, value]) => [wkdFieldLabel(key), wkdFieldValue(value)])
}
