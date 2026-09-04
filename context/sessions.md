# NWB Frontend — project context

Reference notes for `nwb_frontend`: what the app does, which public APIs it uses, and the
non-obvious things we learned by querying those APIs directly. Written so a new session (human or
Claude) can pick the project up without re-deriving all of it.

Last updated: 2026-09-04

---

## 1. What this is

A **Vite + React + TypeScript** single-page app that answers one question: *given only a Dutch
street name, what does the government know about that road?*

- **No backend.** Every API it uses is public, needs no key, and sends permissive CORS headers, so
  the browser calls them directly. The app is a static bundle — deployable to any static host.
- **Dutch UI.** Field names, labels and explanations are all in Dutch, matching the source data.

Run it with `npm run dev` (Vite, default port 5173). `npm run build` runs `tsc -b && vite build`.

---

## 2. The core concept: `wvk_id`

Everything hinges on one identifier.

The **NWB (Nationaal Wegenbestand)** cuts every street into **wegvakken** — road segments between
junctions or other break points. One street is almost always several wegvakken, each with its own
`wvk_id`. Every other dataset in this app joins onto that `wvk_id`.

```
straatnaam → (Locatieserver) → exacte straatnaam + gemeente
           → (NWB)           → wegvakken, elk met een wvk_id
           → (WKD / max-snelheden / WEGGEG, gekoppeld op wvk_id)
```

Two related concepts that show up everywhere:

- **Dynamische segmentatie.** A characteristic often applies to only *part* of a wegvak. `VAN` and
  `TOT` (sometimes `begafstand`/`endafstand`) are distances in metres from the start of the wegvak.
  This is why one street yields many records with different values — e.g. several different road
  widths, because the road really does change width along its length.
- **Heen / terug.** `H` and `T` are directions relative to the *administrative* direction in which
  the wegvak was digitised — **not** compass directions. Fields ending `_H`/`_T` (and `RIJRICHTNG`)
  use this.

---

## 3. APIs used

All five are public, key-less and CORS-enabled.

### 3.1 PDOK Locatieserver — finding the street
`https://api.pdok.nl/bzk/locatieserver/search/v3_1`

| Endpoint | Use |
|---|---|
| `/suggest?q=<term>&fq=type:weg&rows=10` | Autocomplete-as-you-type. Returns `{id, weergavenaam}` only. |
| `/lookup?id=<id>` | Full record: `straatnaam` (correct casing), `gemeentenaam`, `woonplaatsnaam`, `provincienaam`, `centroide_ll`, BAG `identificatie`. |

**Why it exists in this app:** the NWB can only match a street name *exactly and case-sensitively*,
so users can't be trusted to type it. Locatieserver also resolves *which* municipality — the same
street name often exists in several (e.g. "Bekhof" is in both Ooststellingwerf and Reimerswaal).

### 3.2 NWB — Wegen (OGC API Features) — the wegvakken
`https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1`

```
/collections/wegvakken/items?stt_naam=<exact>&gme_naam=<gemeente>&f=json&limit=1000
```

Returns GeoJSON `MultiLineString` features in **CRS84 (lon/lat)** — feeds straight into Leaflet.
Collections: `wegvakken`, `hectopunten`.

**Constraints (verified against the service's own OpenAPI spec):**
- Only **5 properties are filterable**: `gme_naam`, `stt_naam`, `wegbehsrt`, `wegnummer`, `wvk_id`.
- `stt_naam` is **exact and case-sensitive** — `bekhof` returns 0 results, `Bekhof` works.
- **No CQL / partial matching.** `filter=... LIKE ...` → `400 CQL support is not enabled`.

### 3.3 RWS "Maximum snelheden wegen" — speed limits (all roads)
`https://geo.rijkswaterstaat.nl/arcgis/rest/services/GDR/maximum_snelheden_wegen/MapServer`

Layer **8** = `max_snelheden_per_wegvak`. Nationwide — covers municipal streets too, not just
highways (Damrak → 30 km/h). Query pattern:

```
/8/query?where=wvk_id+IN+(<id>,<id>,…)&outFields=*&f=geojson
```

`maxshd` holds the limit; `NVT` means not applicable (e.g. a footpath). One wegvak can carry
several `van`/`naar` sub-ranges with different limits.

### 3.4 Wegkenmerkendatabase (WKD) — 26 road-characteristic themes
`https://geo.rijkswaterstaat.nl/arcgis/rest/services/GDR/wkd_wegkenmerkendatabase/MapServer`

Same ArcGIS query shape as above, one layer per theme, all joined on `wvk_id`:

| id | layer | id | layer |
|---|---|---|---|
| 0 | aslastbeperkingen | 13 | paaltjes |
| 1 | asverspringingen | 14 | parkeerpunten |
| 2 | bomen | 15 | parkeervlakken |
| 3 | fietsstrooiroutes | 16 | rijstroken |
| 4 | fiets_suggestie_stroken | 17 | rvm |
| 5 | geleiderails | 18 | schoolzone |
| 6 | hoogtebeperkingen | 19 | verkeerstypen |
| 7 | inritten | 20 | verlichting |
| 8 | komgrenzen | 21 | voetgangersoversteekplaatsen |
| 9 | lastbeperkingen | 22 | vrachtwagentolheffingsnetwerk |
| 10 | lengtebeperkingen | 23 | wegbreedte |
| 11 | middenbermbreedte | 24 | wegcategorisering |
| 12 | oversteekplaatsen | 25 | wegversmallingen |

The app queries **all 26 in parallel** and renders only the themes that return data — an ordinary
street typically matches ~10.

### 3.5 Weggegevens (WEGGEG) — rijkswegen only
`https://api.pdok.nl/rws/weggegevens/ogc/v1`

Collections: `wegvak_max_snelheden` (with time windows — e.g. 130 km/h 19:00–06:00, 100 km/h by
day) and `wegvak_rijstroken` (lane counts, `"2 -> 3"` = a lane is added).

**Constraints:**
- Only `wvk_id`, `objectid`, `omschr` are filterable, and **one value per request** — comma-lists
  and repeated params were both tested and do *not* OR together (the last value silently wins). So
  each `wvk_id` needs its own call.
- Only queried for wegvakken with `wegbehsrt === 'R'`, so ordinary streets cost zero extra calls.

### 3.6 Basemap
PDOK BRT Achtergrondkaart as plain XYZ tiles in Web Mercator — drops straight into Leaflet, no
`proj4` needed (that's only required for the RD/EPSG:28992 variant):

```
https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png
```

Attribution: `Kaartgegevens © Kadaster`.

---

## 4. Gotchas worth remembering

These cost real debugging time; don't rediscover them.

1. **`geo.rijkswaterstaat.nl` only sends CORS headers when the request has an `Origin` header.**
   A plain `curl` looks like CORS is completely absent. Test with
   `curl -H "Origin: http://localhost:5173" …` and it reflects
   `Access-Control-Allow-Origin: <origin>`. Real browsers always send `Origin`, so this is a
   testing artifact, not a blocker.

2. **Some RWS ArcGIS queries hang forever** — no response, no error. One diagnostic curl sat
   unanswered for over an hour. Because `Promise.allSettled` only resolves once *every* promise
   settles, a single hung request silently killed the whole WKD panel. Hence `src/api/http.ts`:
   every fetch goes through `fetchWithTimeout` (12s) so a stuck request can't stall a fan-out.

3. **`wegbehsrt === 'R'` does not guarantee WEGGEG data.** Parallel service roads alongside a
   motorway are Rijk-managed but have no lane/speed records. Real motorway carriageways
   (`bst_code: 'HR'`) do. Test the Rijksweg panel with a street literally named e.g.
   "Rijksweg A2, Beek" — motorways *do* carry street names in the NWB, so they're reachable through
   the normal street search.

4. **WKD values are often the literal string `"onbekend"`** — treat as unknown, not as data.

5. **Themes render incrementally.** WKD cards appear as each of the 26 requests settles, rather
   than waiting for the batch, so a slow layer doesn't block the rest. Any browser test that waits
   for "the first card to appear" will therefore read the DOM far too early — wait a fixed ~10s
   instead.

---

## 5. Code tables

Confirmed against the NWB/WKD documentation on `docs.ndw.nu` — not guessed.

**`WEGBEHSRT`** (road authority): `R` Rijk · `P` Provincie · `G` Gemeente · `W` Waterschap ·
`T` Particulier

**`RIJRICHTNG`**: `H` heen · `T` terug · `B` beide richtingen · `O` onbekend

**`verkeerstypen`** — per vehicle type there are `_H` (heen) and `_T` (terug) fields, value `j`
(ja, allowed) or `n` (nee, not allowed), derived from the traffic-sign register:
`vtgngr` voetganger · `fiets` · `snrfts` snorfiets · `brmfts` bromfiets · `mtrfts` motorfiets ·
`auto` personenauto · `aanhngr` met aanhanger · `vrchtt` vrachtauto · `autobs` autobus ·
`lndbw` landbouwvoertuig

**`wegbreedte`** — width is measured with scan lines laid perpendicular to the wegvak every 10 m.
`BREEDTE` is the **median** of those measurements (median so one outlier doesn't skew it);
`BRDT_MIN`/`BRDT_MAX` are the narrowest and widest. `BRON` is `BGT` (ordinary roads) or `DTB`
(rijkswegen). Multiple width records per street = the road genuinely changes width (parking bays,
an added lane, a junction, a narrowing).

---

## 6. File structure

```
src/
  api/
    http.ts            fetchWithTimeout — 12s hard timeout on every request
    locatieserver.ts   suggestStreets(), lookupStreet()
    nwb.ts             fetchWegvakken(straatnaam, gemeente)
    arcgis.ts          queryArcgisLayer() — shared ArcGIS "wvk_id IN (…)" query
    maxSnelheid.ts     fetchMaxSnelheden() → Map<wvk_id, records>
    wkd.ts             WKD_LAYERS (all 26) + fetchWkdThemes(ids, onThemeReady)
    weggeg.ts          fetchRijkswegDetails() — rijkswegen only
  components/
    StreetSearch.tsx   debounced autocomplete (300ms, AbortController per keystroke)
    StreetSummary.tsx  aggregated card
    StreetMap.tsx      react-leaflet + PDOK BRT tiles, click-to-highlight
    WegvakTable.tsx    per-segment table incl. speed-limit column
    WkdThemesPanel.tsx one card per matched WKD theme
    RijkswegPanel.tsx  WEGGEG lanes + time-based limits (conditional)
    InfoButton.tsx     reusable "ⓘ" popover (position:fixed to escape table scroll)
  lib/
    fieldLabels.ts     code tables, field-name translations, j/n → Ja/Nee, formatters
    infoTexts.ts       all explanation copy, sourced from official documentation
  types/               nwb.ts · arcgis.ts · weggeg.ts
```

`App.tsx` orchestrates: search → lookup → `fetchWegvakken` → then fans out the three extra fetches
using the resulting `wvk_id`s, guarded by a `searchTokenRef` so a stale response can't overwrite a
newer search.

---

## 7. What's been built (chronological)

**Session 1 — base app.** Scaffolded Vite + React + TS. Street autocomplete via Locatieserver,
wegvakken from the NWB, summary card, Leaflet map on PDOK BRT tiles, per-segment attribute table.
Fixed a bug where selecting a suggestion re-triggered the autocomplete effect and reopened the
dropdown (`skipNextSearchRef`).

**Session 2 — more data sources.** Added the RWS speed-limit layer (new table column), all 26 WKD
themes (new panel), and WEGGEG rijksweg details (conditional panel). Found and fixed the hanging-request
bug (added `fetchWithTimeout`), and switched WKD from one batched state update to incremental
rendering so a slow layer doesn't block the rest.

**Session 3 — explanations.** Added `InfoButton` throughout (~29 per result page: header, all 6
summary fields, all 11 table columns, all 26 WKD themes, both WEGGEG sections). Decoded the cryptic
field names (`vtgngr_h` → "Voetganger (heen)") and values (`j`/`n` → Ja/Nee), and made
`wegbreedte` show its van–tot stretch plus the min/max spread. All copy sourced from the official
NDW/Rijkswaterstaat documentation.

---

## 8. Verifying changes

Type-check and build: `npx tsc -b && npm run build`.

Manual test streets, each exercising a different path:

| Street | Exercises |
|---|---|
| `Bekhof` | Ambiguous name — two suggestions (Oldeberkoop / Yerseke) resolving to different data |
| `Damrak, Amsterdam` | Ordinary city street: 20 wegvakken, 30 km/h, ~10 WKD themes, no Rijksweg panel |
| `Faelweg, Vrouwenpolder` | Rijk-managed parallel road: has WKD + speed data, but correctly **no** Rijksweg panel |
| `Rijksweg A2, Beek` | Real motorway: Rijksweg panel with lane config + 130/100 km/h time windows |

Browser-driven testing was done with `puppeteer-core` pointed at the system Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), checking console errors, failed
requests, and rendered DOM. Watch the network tab for CORS errors on both PDOK and
`geo.rijkswaterstaat.nl`.

---

## 9. Deliberately out of scope

- **BGT (Basisregistratie Grootschalige Topografie)** — would need a spatial intersection instead
  of a clean `wvk_id` join; much heavier. WKD's `wegbreedte` already surfaces BGT-derived widths.
- **NDW real-time traffic** — live/DATEX-shaped data, a different problem from static road
  characteristics.

## 10. Known rough edges

- A Damrak result page is ~14,000px tall. Some theme cards are repetitive (e.g.
  Vrachtwagentolheffingsnetwerk prints "Heffingsnetwerk: Nee" 15 times). Collapsing cards by
  default and deduping single-value themes is the obvious next improvement.
- Very long streets produce a long `wvk_id IN (…)` URL. Fine at observed sizes (21 ids ≈ 400
  chars), but there's no chunking if a street ever has hundreds of wegvakken.
