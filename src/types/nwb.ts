// PDOK Locatieserver v3.1 — https://api.pdok.nl/bzk/locatieserver/search/v3_1/

export interface SuggestDoc {
  id: string
  type: string
  weergavenaam: string
}

export interface SuggestResponse {
  response: {
    numFound: number
    docs: SuggestDoc[]
  }
}

export interface LookupDoc {
  id: string
  type: string
  straatnaam: string
  gemeentenaam: string
  woonplaatsnaam: string
  provincienaam: string
  centroide_ll: string // "POINT(lon lat)"
  identificatie: string // BAG openbare-ruimte id
}

export interface LookupResponse {
  response: {
    numFound: number
    docs: LookupDoc[]
  }
}

// PDOK NWB — Wegen OGC API Features — https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1
// Field names/types confirmed against the collection's published JSON schema.

export interface WegvakProperties {
  wvk_id: number
  stt_naam: string
  gme_naam: string
  wegbehnaam: string
  wegbehsrt: string
  wegbehcode: string
  wgtype_oms: string
  wegnummer: string
  routenr: number | null
  routenr2: number | null
  routenr3: number | null
  routenr4: number | null
  routeltr: string
  l_hnr_lnks: number | null
  l_hnr_rhts: number | null
  e_hnr_lnks: number | null
  e_hnr_rhts: number | null
  hnrstrlnks: string
  hnrstrrhts: string
  st_lengthshape: number
  rijrichtng: string
  admrichtng: string
  frc: string
  fow: string
  bronjaar: number
  wvk_begdat: string
  [key: string]: unknown
}

export interface WegvakFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: 'MultiLineString'
    coordinates: number[][][]
  }
  properties: WegvakProperties
}

export interface WegvakFeatureCollection {
  type: 'FeatureCollection'
  features: WegvakFeature[]
}
