// Uitleg bij de velden en datasets. De omschrijvingen komen uit de officiële
// documentatie van het NWB (NDW-handleiding) en de Wegkenmerkendatabase
// (docs.ndw.nu/handleidingen/wkd) — niet uit aannames.

/** Kernbegrip dat op bijna elke WKD-dataset van toepassing is. */
export const DYNAMISCHE_SEGMENTATIE =
  'Kenmerken gelden vaak maar voor een deel van een wegvak. VAN en TOT geven de afstand in meters vanaf ' +
  'het beginpunt van het wegvak waartussen het kenmerk geldt ("dynamische segmentatie"). Eén wegvak kan ' +
  'daardoor meerdere records met verschillende waarden hebben.'

export const APP_INFO =
  'Deze pagina combineert vier open databronnen op basis van alleen een straatnaam: het Nationaal ' +
  'Wegenbestand (NWB) voor de wegvakken zelf, de PDOK Locatieserver om de straat te vinden, de RWS-database ' +
  '"Maximum snelheden wegen" voor snelheidslimieten, de Wegkenmerkendatabase (WKD) voor 26 wegkenmerken, en ' +
  'Weggegevens (WEGGEG) voor rijstrook- en snelheidsdetails van rijkswegen. Alles wordt gekoppeld op het ' +
  'wegvak-id (WVK_ID) uit het NWB.'

export const SUMMARY_INFO: Record<string, string> = {
  Gemeente:
    'De gemeente waarin de wegvakken liggen (NWB-veld GME_NAAM). Dezelfde straatnaam komt vaak in meerdere ' +
    'gemeenten voor, daarom wordt er op straatnaam én gemeente gefilterd.',
  Provincie: 'De provincie waarin de straat ligt, volgens de PDOK Locatieserver.',
  Wegvakken:
    'Het NWB knipt een straat op in wegvakken: stukken weg tussen twee kruispunten of andere breekpunten. ' +
    'Eén straat bestaat daardoor bijna altijd uit meerdere wegvakken, elk met eigen kenmerken en een eigen ' +
    'wegvak-id (WVK_ID).',
  'Totale lengte':
    'De som van de lengtes van alle gevonden wegvakken (NWB-veld ST_LENGTHSHAPE). Dit is de lengte van de ' +
    'gedigitaliseerde hartlijn, niet de lengte van de rijbaan of het trottoir.',
  'Wegtype(n)':
    'Omschrijving van het wegtype uit het NWB (WGTYPE_OMS). Dit veld is voor gewone straten vaak leeg; het ' +
    'wordt vooral gevuld voor rijkswegen.',
  'Wegbeheerder(s)':
    'De organisatie die de weg beheert (WEGBEHNAAM). Het soort beheerder (WEGBEHSRT) is R = Rijk, ' +
    'P = Provincie, G = Gemeente, W = Waterschap of T = Particulier.',
}

export const TABLE_COLUMN_INFO: Record<string, string> = {
  Wegvak:
    'Het unieke wegvak-id (WVK_ID) uit het NWB. Alle andere databases op deze pagina worden op dit id aan ' +
    'het wegvak gekoppeld.',
  Wegbeheerder:
    'De beherende organisatie (WEGBEHNAAM) en het soort beheerder (WEGBEHSRT): R = Rijk, P = Provincie, ' +
    'G = Gemeente, W = Waterschap, T = Particulier.',
  Type: 'Omschrijving van het wegtype (WGTYPE_OMS). Voor gewone gemeentelijke straten is dit veld meestal leeg.',
  Wegnummer: 'Het administratieve wegnummer (WEGNUMMER), bijvoorbeeld 002 voor de A2. Leeg voor gewone straten.',
  'Route(s)':
    'De routenummers (ROUTENR t/m ROUTENR4) waar dit wegvak deel van uitmaakt. Een wegvak kan tot meerdere ' +
    'genummerde routes horen.',
  Richting:
    'De rijrichting (RIJRICHTNG): H = heen, T = terug, B = beide richtingen, O = onbekend. "Heen" en "terug" ' +
    'zijn ten opzichte van de administratieve richting waarin het wegvak is gedigitaliseerd — het is dus geen ' +
    'kompasrichting.',
  'Huisnrs links':
    'Het laagste en hoogste huisnummer aan de linkerzijde van het wegvak (L_HNR_LNKS en E_HNR_LNKS), gezien ' +
    'in de administratieve richting van het wegvak.',
  'Huisnrs rechts':
    'Het laagste en hoogste huisnummer aan de rechterzijde van het wegvak (L_HNR_RHTS en E_HNR_RHTS), gezien ' +
    'in de administratieve richting van het wegvak.',
  Lengte: 'De lengte van de hartlijn van dit wegvak (ST_LENGTHSHAPE).',
  Snelheidslimiet:
    'De maximumsnelheid uit de RWS-database "Maximum snelheden wegen" (laag max_snelheden_per_wegvak), ' +
    'gekoppeld op WVK_ID. "NVT" betekent niet van toepassing — bijvoorbeeld op een voetpad. Staat er meer dan ' +
    'één waarde, dan verandert de limiet halverwege het wegvak en gelden ze allebei voor een deel ervan.',
  Bronjaar: 'Het jaar waarin de geometrie van dit wegvak voor het laatst door de wegbeheerder is aangeleverd (BRONJAAR).',
}

/** Per WKD-thema: wat het thema betekent en hoe je de velden leest. */
export const WKD_THEME_INFO: Record<string, string> = {
  aslastbeperkingen:
    'De maximaal toegestane aslast (het gewicht per as) op dit wegvak. BEP_WAARDE is de waarde van de ' +
    'beperking; V_VRKSBRD verwijst naar het verkeersbord waaruit die is afgeleid. ' + DYNAMISCHE_SEGMENTATIE,
  asverspringingen:
    'Plekken waar de wegas zijwaarts verspringt, bijvoorbeeld een chicane of een verspringing die het verkeer ' +
    'laat afremmen. SOORT geeft het type verspringing, AANTAL hoeveel er zijn, en FIETS of het ook voor de ' +
    'fietser geldt.',
  bomen:
    'Bomen in de berm langs het wegvak — relevant voor de bermveiligheid. AANT_BOMEN is het totaal; ' +
    'AF_KL_1 t/m AF_KL_7 tellen de bomen per afstandsklasse tot de rijbaan (klasse 1 staat het dichtst bij de ' +
    'weg). ONDERGR beschrijft de ondergrond van de berm.',
  fietsstrooiroutes:
    'Fietspaden die bij gladheid door de wegbeheerder worden gestrooid. STROOIFIET geeft aan of dit wegvak ' +
    'op een strooiroute voor fietsers ligt.',
  fiets_suggestie_stroken:
    'Fietssuggestiestroken: met (meestal rode) markering aangegeven stroken zonder eigen juridische status — ' +
    'het is dus geen echt fietspad. FTS_SUG_H geldt voor de heenrichting en FTS_SUG_T voor de terugrichting.',
  geleiderails:
    'Geleiderails (vangrails) langs het wegvak. KANTCODE en POSOMSCHR geven aan aan welke zijde van de weg ' +
    'ze staan. ' + DYNAMISCHE_SEGMENTATIE,
  hoogtebeperkingen:
    'De maximale doorrijhoogte op dit wegvak, bijvoorbeeld onder een viaduct of in een tunnel. BEP_WAARDE is ' +
    'de hoogte in meters; V_VRKSBRD verwijst naar het verkeersbord.',
  inritten:
    'Inritten (uitritten van percelen) die op dit wegvak uitkomen. ZIJDE geeft de kant van de weg, ' +
    'KILOMTRRNG de kilometrering van het punt.',
  komgrenzen:
    'Of het wegvak binnen de bebouwde kom ligt volgens de Wegenverkeerswet. KOM_PLAATS is de plaatsnaam en ' +
    'KOM_VAN/KOM_TOT geven op welke meters van het wegvak de komgrens precies ligt. Bron is de ' +
    'Basisregistratie Topografie (BRT).',
  lastbeperkingen:
    'Het maximaal toegestane totaalgewicht van een voertuig op dit wegvak. BEP_WAARDE is de waarde van de ' +
    'beperking; V_VRKSBRD verwijst naar het verkeersbord waaruit die is afgeleid.',
  lengtebeperkingen:
    'De maximaal toegestane voertuiglengte op dit wegvak. BEP_WAARDE is de waarde van de beperking; ' +
    'V_VRKSBRD verwijst naar het verkeersbord waaruit die is afgeleid.',
  middenbermbreedte:
    'De breedte en het soort van de middenberm tussen de rijbanen. KANTCODE en POSOMSCHR geven de positie ' +
    'ten opzichte van het wegvak. ' + DYNAMISCHE_SEGMENTATIE,
  oversteekplaatsen:
    'Oversteekplaatsen voor voetgangers en fietsers. AANTAL is het aantal op die plek, SNELHEID de ' +
    'snelheidslimiet ter plaatse en GESCH_RIJB of de rijbaan gescheiden is. HOOFDMOD geeft de belangrijkste ' +
    'vervoerwijze die er oversteekt.',
  paaltjes:
    'Paaltjes op of langs de weg — bijvoorbeeld op fietspaden, waar ze een bekende oorzaak van ' +
    'eenzijdige fietsongevallen zijn. TYPE geeft het soort paaltje.',
  parkeerpunten:
    'Losse parkeerplaatsen langs het wegvak, met de kilometrering (KILOMTRRNG) en de zijde van de weg (ZIJDE).',
  parkeervlakken:
    'Parkeervlakken langs het wegvak. OPPERVLAK is de oppervlakte in vierkante meters en ZIJDE de kant van ' +
    'de weg waar het vlak ligt.',
  rijstroken:
    'Het aantal rijstroken (RIJSTRKN) en de bijzondere stroken: invoeg- (INVGSTRKN), uitvoeg- (UITVGSTRKN), ' +
    'weef- (WEEFSTRKN), spits- (SSTRKNR/SSTRKNL), wissel- (WISSELSTRK) en busstroken (BUUSSTRK/BUSVRSTRK). ' +
    DYNAMISCHE_SEGMENTATIE,
  rvm:
    'RVM staat voor Regionaal Verkeersmanagement: het wegennet waarover wegbeheerders gezamenlijke afspraken ' +
    'hebben gemaakt. RVM_SOORT geeft aan om welk deelnetwerk het gaat, bijvoorbeeld TEN-T-kernnetwerk, ' +
    'TEN-T-uitgebreid, RVM-autosnelweg, RVM-overig of RVMplus.',
  schoolzone:
    'Schoolzones: wegvakken langs een school. NAAMSCHL is de naam van de school, STRNMSCH/HNR_SCH het adres ' +
    'en BRIN6 het onderwijsnummer. AANDZONE en TKSTWEG beschrijven de zoneaanduiding en de bordtekst.',
  verkeerstypen:
    'Welke verkeersdeelnemers dit wegvak mogen gebruiken, per rijrichting. Per voertuigtype zijn er twee ' +
    'velden: _H voor de heenrichting en _T voor de terugrichting. De waarde is j (ja, toegestaan) of ' +
    'n (nee, niet toegestaan) — hier getoond als Ja/Nee. De gegevens zijn afgeleid uit het ' +
    'verkeersbordenbestand. "Heen" en "terug" zijn ten opzichte van de administratieve richting van het ' +
    'wegvak, niet een kompasrichting.',
  verlichting:
    'Of het wegvak straatverlichting heeft (VERLICHTIN) en hoe betrouwbaar die vaststelling is (KWALITEIT).',
  voetgangersoversteekplaatsen:
    'Voetgangersoversteekplaatsen (zebrapaden) op dit wegvak. VRKRSBRD verwijst naar het bijbehorende ' +
    'verkeersbord.',
  vrachtwagentolheffingsnetwerk:
    'Of het wegvak deel uitmaakt van het netwerk waarop de vrachtwagenheffing van toepassing is ' +
    '(HEFNETWERK). Let op: deze dataset wordt niet meer bijgewerkt.',
  wegbreedte:
    'De breedte van de rijbaan. Om de 10 meter is haaks op het wegvak een scanlijn gelegd en opgemeten. ' +
    'BREEDTE is de mediaan van die metingen (de mediaan, zodat een enkele uitschieter het beeld niet ' +
    'vertekent), BRDT_MIN en BRDT_MAX zijn de smalste en breedste meting. Eén wegvak heeft vaak méérdere ' +
    'breedtes omdat de weg onderweg echt van breedte verandert — door parkeervakken, een extra rijstrook, ' +
    'een kruispunt of een versmalling. VAN en TOT geven aan tussen welke meters elke breedte geldt. BETR is ' +
    'de betrouwbaarheid en BRON de herkomst: BGT voor gewone wegen, DTB voor rijkswegen.',
  wegcategorisering:
    'De wegcategorie volgens Duurzaam Veilig (WEG_CAT), bijvoorbeeld stroomweg, gebiedsontsluitingsweg, ' +
    'erftoegangsweg, stadshoofdweg of voetpad. De categorie zegt welke functie de weg hoort te vervullen. ' +
    DYNAMISCHE_SEGMENTATIE,
  wegversmallingen:
    'Plaatselijke wegversmallingen. BRDT_MIN is de smalste gemeten breedte ter plaatse en V_VRKSBRD verwijst ' +
    'naar het bijbehorende verkeersbord.',
}

export const WKD_PANEL_INFO =
  'De Wegkenmerkendatabase (WKD) van Rijkswaterstaat is een verzameling van 26 losse datasets met ' +
  'wegkenmerken, elk te koppelen aan het NWB via het wegvak-id (WVK_ID). Alle 26 worden opgevraagd; alleen ' +
  'thema’s met gegevens voor deze straat worden getoond. ' + DYNAMISCHE_SEGMENTATIE

export const RIJKSWEG_PANEL_INFO =
  'Weggegevens (WEGGEG) bevat detailgegevens die alleen voor rijkswegen worden bijgehouden. Dit blok ' +
  'verschijnt daarom alleen bij wegvakken die door het Rijk worden beheerd (WEGBEHSRT = R). Let op: een ' +
  'parallelweg langs een rijksweg wordt ook door het Rijk beheerd, maar heeft meestal géén WEGGEG-gegevens.'

export const RIJSTROKEN_INFO =
  'De rijstrookconfiguratie per stuk van het wegvak. "3 -> 3" betekent dat het aantal rijstroken aan het ' +
  'begin en aan het eind van dat stuk gelijk is; "2 -> 3" betekent dat er een strook bij komt. De meters ' +
  'ervoor geven aan voor welk deel van het wegvak dit geldt.'

export const WEGGEG_SNELHEID_INFO =
  'De maximumsnelheden van rijkswegen, inclusief tijdvensters. Staat er een tijd bij, dan geldt die limiet ' +
  'alleen in dat tijdvak — bijvoorbeeld 130 km/h tussen 19:00 en 6:00 en 100 km/h overdag. De meters geven ' +
  'aan voor welk deel van het wegvak de limiet geldt.'
