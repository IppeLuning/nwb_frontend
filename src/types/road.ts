import type { RijkswegDetails } from '../api/weggeg'
import type { WkdThemeResult } from '../api/wkd'
import type { MaxSnelheidRecord } from './arcgis'
import type { LookupDoc, WegvakFeature } from './nwb'

/** Eén opgezochte weg in de stapel. Meerdere wegen staan tegelijk op de kaart. */
export interface RoadEntry {
  /** Locatieserver-id van de treffer — uniek per weg in de stapel. */
  id: string
  place: LookupDoc
  /** Kleur waarmee deze weg op de kaart en in de legenda wordt getekend. */
  color: string
  /** Status van de wegvakken zelf; de aanvullende bronnen laden daarna door. */
  status: 'loading' | 'ready' | 'error'
  features: WegvakFeature[]
  maxSnelheden: Map<number, MaxSnelheidRecord[]>
  wkdThemes: WkdThemeResult[]
  rijkswegDetails: RijkswegDetails
  /** Laadstatus van de aanvullende bronnen, voor de voortgangsweergave. */
  loading: {
    maxSnelheden: boolean
    rijksweg: boolean
    /** Afgehandelde WKD-lagen van het totaal; done === total betekent klaar. */
    wkdDone: number
    wkdTotal: number
  }
}
