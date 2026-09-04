# NWB Frontend — project context

Reference notes for `nwb_frontend`: what the app does, which public APIs it uses, and the
non-obvious things we learned by querying those APIs directly. Written so a new session (human or
Claude) can pick the project up without re-deriving all of it.

These notes are in English. Dutch is kept only where it *is* the data: field names (`stt_naam`),
domain terms (wegvak, gemeente, rijksweg), code-table values, and quoted UI strings.

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
straatnaam → (Locatieserver) → exact straatnaam + gemeente
           → (NWB)           → wegvakken, each with a wvk_id
           → (WKD / max-snelheden / WEGGEG, joined on wvk_id)
```

Two related concepts that show up everywhere:

- **Dynamic segmentation.** A characteristic often applies to only *part* of a wegvak. `VAN` and
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
| `/lookup?id=<id>` | Full record: `straatnaam` (correct casing), `gemeentenaam`, `woonplaatsnaam`, `provincienaam`, `centroide_ll`, `identificatie`, `bron`. |

**Two kinds of hit come back, and they need different NWB queries:**

| | ordinary street | road number |
|---|---|---|
| `bron` | `BAG/NWB` | `NWB` |
| `woonplaatsnaam` | set | **null** |
| `straatnaam` | `Damrak` | `A10`, `N57` |
| NWB lookup | `stt_naam` | `wegnummer` (see 3.2) |

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

**Motorways are looked up differently.** A road number is *not* a `stt_naam` — searching
`stt_naam=A10` returns nothing. Those segments live under `WEGNUMMER`, **without the letter and
zero-padded to three characters**: `A10` → `010`, `N57` → `057`, `A2` → `002`. Unpadded (`10`) and
letter forms (`A10`) both return 0 results.

```
/collections/wegvakken/items?wegnummer=010&gme_naam=Amsterdam&f=json&limit=1000
```

`src/api/nwb.ts` picks the right query automatically via `fetchWegvakkenForPlace(doc)`.
Note that some motorway segments *also* carry a real street name ("Rijksweg A2"), so both paths
can reach the same road — both are supported.

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

6. **The ArcGIS query string is capped at ~2048 characters.** Over that, the server answers
   **404** (not a helpful error). Measured: 150 ids ≈ 1945 chars works, 200 ids ≈ 2545 chars
   fails. `queryArcgisLayer` therefore chunks at **120 ids** per request and merges the results.
   This only shows up on motorways — the A10 in Amsterdam is 363 wegvakken.

7. **Leaflet's z-index beats anything you forget to raise.** Leaflet uses 400 for the overlay pane
   (where the road lines are drawn), 800 for the zoom buttons and 1000 for the control containers.
   The suggestions dropdown sat at `z-index: 10` and so disappeared behind the map as soon as a
   road was on it — you could see road lines and the +/− buttons straight through the dropdown.
   `.street-search` is now 1100 and `.info-popover` 1200. Probe this with
   `document.elementsFromPoint()` at several points, not just the centre: over an empty patch of
   map the problem looks like it isn't there.

8. **Big roads need request budgets, or they starve themselves.** With 363 wegvakken, 26 WKD
   layers × 4 chunks = 104 concurrent requests; they queue behind each other, blow the 12s
   timeout, and *fewer* themes end up rendering than if you'd asked for less. Current budgets:
   WKD is capped at `MAX_WKD_WEGVAKKEN = 120` ids (one chunk per layer) and WEGGEG at
   `MAX_WEGGEG_WEGVAKKEN = 25` wegvakken (it costs 2 requests each). Both caps are stated in the
   UI rather than silently applied. The speed-limit layer is *not* capped — it's a single layer,
   so the table column stays complete.

---

## 5. Code tables

Confirmed against the NWB/WKD documentation on `docs.ndw.nu` — not guessed.

**`WEGBEHSRT`** (road authority): `R` Rijk · `P` Provincie · `G` Gemeente · `W` Waterschap ·
`T` Particulier

**`RIJRICHTNG`**: `H` heen (forward) · `T` terug (reverse) · `B` beide richtingen (both) ·
`O` onbekend (unknown)

**`verkeerstypen`** — per vehicle type there are `_H` (heen) and `_T` (terug) fields, value `j`
(ja, allowed) or `n` (nee, not allowed), derived from the traffic-sign register:
`vtgngr` voetganger (pedestrian) · `fiets` (bicycle) · `snrfts` snorfiets · `brmfts` bromfiets ·
`mtrfts` motorfiets (motorcycle) · `auto` personenauto (car) · `aanhngr` met aanhanger (trailer) ·
`vrchtt` vrachtauto (truck) · `autobs` autobus (bus) · `lndbw` landbouwvoertuig (farm vehicle)

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
    RoadsOverview.tsx  compact table of all roads (legend, counts, actions)
    RoadSection.tsx    one road in the stack: collapsible header + detail panels
    StreetSummary.tsx  aggregated card
    StreetMap.tsx      react-leaflet + PDOK BRT tiles, all roads at once, click-to-select
    WegvakTable.tsx    per-segment table incl. speed-limit column + checkboxes
    SelectionBar.tsx   selection count/length, select-all/clear, copy wvk_ids
    WkdThemesPanel.tsx one card per matched WKD theme
    RijkswegPanel.tsx  WEGGEG lanes + time-based limits (conditional)
    InfoButton.tsx     reusable "ⓘ" popover (position:fixed to escape table scroll)
  lib/
    fieldLabels.ts     code tables, field-name translations, j/n → Ja/Nee, formatters
    infoTexts.ts       all explanation copy, sourced from official documentation
    roadColors.ts      palette + nextRoadColor() for the road stack
  types/               nwb.ts · arcgis.ts · weggeg.ts · road.ts
```

`App.tsx` orchestrates: search → lookup → `fetchWegvakken` → then fans out the three extra fetches
using the resulting `wvk_id`s.

**Road stack.** `App.tsx` keeps a `RoadEntry[]` (see `src/types/road.ts`): every road looked up has
its own colour, its own wegvakken, and its own WKD/WEGGEG/speed data. Searching *adds* a road
rather than replacing one, and all roads sit on a single map together. The map fits to everything
whenever a road is added or removed; because roads can be far apart (Amsterdam + Friesland gives a
uselessly zoomed-out map) each road also has an "Inzoomen" (zoom-to) button. Removing a road also
drops its wegvakken from the selection.

**Selection.** `App.tsx` keeps a `Set<number>` of selected `wvk_id`s (not the GeoJSON feature id —
`wvk_id` is the key every source joins on, so it's what you'll want downstream). That set spans all
roads: `wvk_id` is nationally unique, so you can select parts of several roads at once. Map and
tables share the state, so they stay in sync. Two things to know before changing it:

- The map layer is **not** remounted on selection. `react-leaflet`'s `<GeoJSON>` doesn't re-apply a
  changed `style` prop after mount, so the first version forced a remount via `key`. At 363
  features that's far too slow; now `setStyle` is called imperatively per layer through a ref
  (measured: 32 ms for one click, 31 ms to select all 363).
- The click handler is bound once per feature, so `onToggle` is read through a ref — otherwise the
  closure captures a stale selection.

---

## 7. What's been built (chronological)

**Session 1 — base app.** Scaffolded Vite + React + TS. Street autocomplete via Locatieserver,
wegvakken from the NWB, summary card, Leaflet map on PDOK BRT tiles, per-segment attribute table.
Fixed a bug where selecting a suggestion re-triggered the autocomplete effect and reopened the
dropdown (`skipNextSearchRef`).

**Session 2 — more data sources.** Added the RWS speed-limit layer (new table column), all 26 WKD
themes (new panel), and WEGGEG rijksweg details (conditional panel). Found and fixed the
hanging-request bug (added `fetchWithTimeout`), and switched WKD from one batched state update to
incremental rendering so a slow layer doesn't block the rest.

**Session 3 — explanations.** Added `InfoButton` throughout (~29 per result page: header, all 6
summary fields, all 11 table columns, all 26 WKD themes, both WEGGEG sections). Decoded the cryptic
field names (`vtgngr_h` → "Voetganger (heen)") and values (`j`/`n` → Ja/Nee), and made
`wegbreedte` show its van–tot stretch plus the min/max spread. All copy sourced from the official
NDW/Rijkswaterstaat documentation.

**Session 4 — motorways.** Searching a highway returned an empty page: the Locatieserver happily
suggests "A10, Amsterdam", but the NWB has no `stt_naam` of `A10`, so the follow-up query found
nothing. Added the `wegnummer` lookup path plus automatic detection of which query to use. That
exposed two follow-on limits — the ~2048-char ArcGIS query string (fixed with chunking) and
request-storm starvation on big roads (fixed with the WKD/WEGGEG budgets) — and one unhandled
`AbortError` from an uncaught rejection on the supplementary fetches.

**Session 5 — multi-select.** Selection went from a single wegvak to a `Set` of wegvakken, as a
step towards selecting specific parts of a road. Clicking in the table or on the map toggles a
wegvak; shift-click selects a contiguous run of rows. A selection bar shows the count and summed
length, with "Alles selecteren", "Selectie wissen", and copying the selected `wvk_id`s to the
clipboard. Unselected wegvakken dim on the map as soon as anything is selected.

**Session 6 — stacking roads.** Searching no longer replaces the displayed road but adds one:
several roads sit on the map at once, each in its own colour, each with its own section (summary,
table, WKD, WEGGEG) and a button to remove it. The search box clears itself after adding so you can
keep searching. Selection works across roads. Because fitting to roads in different provinces gives
an unusable map, each road got an "Inzoomen" button.

**Session 7 — loading indication.** Adding a road felt slow, especially the second one: the
wegvakken alone take ~4 seconds, and dozens of requests keep running afterwards with nothing to
show for it. Added a skeleton in the road section while wegvakken load, a per-road progress line
("Nog bezig met snelheidslimieten, wegkenmerken…"), a counter in the WKD block ("14 van 26 lagen
opgehaald…") via a new `onProgress` callback in `fetchWkdThemes`, and "laden…" instead of "—" in
the speed column — which had read as "no limit" rather than "not fetched yet".

The main lesson came from testing: the skeleton *was* rendering, but for a second road that section
is already below the fold. You look at the search box and see nothing happen. Hence the
"… toevoegen…" line directly under the search box. Loading indication belongs where the user is
looking, not where the data lands.

**Session 8 — overview instead of details.** With several roads you had to scroll past road 1's
entire detail block before discovering road 2 existed. There's now a `RoadsOverview` directly under
the search box: a compact table with, per road, its colour (doubling as the map legend), gemeente,
number of wegvakken, length, number of selected wegvakken, and the "Inzoomen" and remove buttons.
The road sections below are **collapsed by default** and expand one at a time. That also fixed the
long-standing endless-page problem: one road went from ~14,500 px to ~960 px, and three roads fit
in ~1,200 px.

Note when testing: browser tests that read the table or the WKD panels must click
`.road-section-header` first, otherwise those elements aren't in the DOM.

---

## 8. Verifying changes

Type-check and build: `npx tsc -b && npm run build`.

Manual test streets, each exercising a different path:

| Street | Exercises |
|---|---|
| `Bekhof` | Ambiguous name — two suggestions (Oldeberkoop / Yerseke) resolving to different data |
| `Damrak, Amsterdam` | Ordinary city street: 20 wegvakken, 30 km/h, ~10 WKD themes, no Rijksweg panel |
| `Faelweg, Vrouwenpolder` | Rijk-managed parallel road: has WKD + speed data, but correctly **no** Rijksweg panel |
| `Rijksweg A2, Beek` | Motorway reached via its BAG street name: 21 wegvakken, Rijksweg panel with lane config + 130/100 km/h time windows |
| `A10, Amsterdam` | Motorway via **wegnummer**: 363 wegvakken, the full ring drawn on the map, chunked ArcGIS queries, both caps visible |
| `N57` | N-road via wegnummer: 83 wegvakken |

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

- An *expanded* road section is still very long (363 table rows for the A10), and some theme cards
  are repetitive (Vrachtwagentolheffingsnetwerk prints "Heffingsnetwerk: Nee" 15 times). Paginating
  the table and deduping single-value themes would be the next improvement. Collapsing by default
  (session 8) already fixed the default page length.
- WKD, speed and WEGGEG data is fetched **eagerly** for every road, even though sections are now
  collapsed by default. Fetching on expand would genuinely speed up adding roads, rather than only
  reporting progress — the collapse work makes this straightforward now.
- The NWB query uses `limit=1000` with no paging. The largest case seen is 363 wegvakken (A10 in
  Amsterdam), so there's headroom, but a very long road through one municipality could in theory
  be truncated silently.
- The WKD and WEGGEG caps mean a motorway's data reflects only part of the road. It's stated in
  the UI, but a "load the rest" control would be better than a hard cap.
