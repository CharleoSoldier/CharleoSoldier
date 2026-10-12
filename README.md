# TruckNav (working name) — draft 2 (GA / SC / NC focus)

Free, open-source truck navigation for Android and Linux. Truck-safe routes, traffic lights and speed limits along the route, voice turn-by-turn, GPX/GeoJSON export. No ads, no tracking, no account. Everything you save stays on the device.

It is a Progressive Web App (PWA): one codebase that installs on Android (Chrome or Firefox: "Add to Home screen"), runs in any Linux desktop browser, and can be wrapped as an APK later.

## What works in this draft

- **Truck routing** via openrouteservice `driving-hgv` with height, width, length, gross weight, axle load, hazmat, vehicle type, avoid tolls/ferries.
- **Traffic lights and speed limits** from OpenStreetMap, fetched once per route through Overpass and matched to the exact roads you drive. Truck limits (`maxspeed:hgv`) win over general limits; direction-specific tags are respected. Lights tagged for the opposite direction are ignored.
- **Navigation**: a top-down, north-up "eye" view zoomed out to fit the next few miles (or switch to a heading-up 3D driver view with the ◎/⌖ button). A numbered **Coming up** list over the map always shows the next 2-6 events (turns, speed-limit changes, traffic lights); the same numbers are pinned on the map. Choose rows, which kinds appear, and how far ahead under ⚙. Also: voice prompts, US-style or round speed-limit sign, over-speed beep, light alert, ETA, automatic reroute, screen kept awake.
- **Georgia / South Carolina / North Carolina focus**: map opens on the three states, search is limited to them (toggle in ⚙), purple dashed **county lines** (OpenStreetMap `admin_level=6`), and **Backroads** (on by default) routes off interstates. Caveat: consolidated city-counties in Georgia may lack a separate county line in OSM.
- **Weights:** South Carolina caps a 5-axle combination at 73,280 lb off the interstate. Set your own limits in the truck profile; the app does not know statutory limits.
- **Export**: GPX 1.1 (track, maneuvers as route points, traffic lights as waypoints; truck profile and speed limits in a `urn:trucknav:gpx:1` extension) and GeoJSON (route, speed-limit segments, lights).
- **Offline**: app works offline after first load; saved routes (with lights and limits) open without a connection; "Offline" downloads map tiles along a route (zoom 6–14).
- Imperial or metric units. Night map option.

## Run it

```bash
# Linux desktop: any static server; localhost counts as secure for GPS + offline
python3 -m http.server 8080      # then open http://localhost:8080
```

On a phone you need HTTPS. Cheapest: push this folder to a free static host (GitHub Pages or Codeberg Pages), open the URL in Chrome/Firefox on Android, then "Add to Home screen".

First launch: tap ⚙ and paste a free openrouteservice key (sign up at https://openrouteservice.org/plans/). The key is stored only in the browser.

## Services used (all free, no ads)

| Purpose | Service | Key | Notes |
|---|---|---|---|
| Map tiles | OpenFreeMap (`tiles.openfreemap.org/styles/liberty`) | none | No limits stated by the project; donation funded |
| Truck routing | openrouteservice `https://api.heigit.org/openrouteservice` | free key | Old host `api.openrouteservice.org` is deprecated; check your quota on their dashboard |
| Search | Photon (`photon.komoot.io`) | none | Fair use only; self-host for volume |
| Lights + limits | Overpass (`overpass-api.de`) | none | Public server; one request per ~25 km of route, sent one at a time |

All servers are editable under ⚙ → Servers, so you can point at self-hosted instances.

Credits shown in the map corner are required by these services and by the OpenStreetMap licence (ODbL). Keep them.

## Tests

```bash
npm test          # 14 unit tests: geometry, OSM matching, units, exports
npm run e2e       # headless Chromium, all services mocked: search, route, exports, save,
                  # navigation, reroute, truck change, offline shell + offline tiles
                  # needs: pip install playwright && python3 -m playwright install chromium
```

## Known limits (read before driving)

- **Routing needs a connection.** Navigation of an already-planned or saved route works offline; rerouting does not.
- **Data quality = OpenStreetMap quality.** Missing height/weight tags mean a low bridge can be missed. Missing `maxspeed` means no sign is shown (the summary shows coverage %). Implicit limits like `DE:urban` and `none` are treated as unknown on purpose.
- **Android background GPS:** a PWA only gets GPS while the screen is on and the app is in front. The app holds a screen wake lock while navigating.
- **Not certified** truck navigation. Always obey posted signs.
- openrouteservice free tier has daily request limits; heavy rerouting uses them up.

## Files

```
index.html  styles.css  manifest.webmanifest  sw.js   app shell + offline worker
js/core.js    pure logic (tested): snapping, OSM matching, progress, units, GPX/GeoJSON
js/api.js     openrouteservice, Photon, Overpass
js/store.js   settings (localStorage) and saved routes (IndexedDB)
js/app.js     map, UI, navigation
vendor/       MapLibre GL JS 6.13.0 (BSD-3-Clause)
```

No build step: edit a file, reload. The service worker refreshes the app in the background, so changes show on the next launch.

## Next steps

1. Test one real truck route you know (a low bridge or weight-limited road) and check that the route avoids it.
2. Wrap as an APK (Capacitor) for F-Droid and background GPS.
3. On-device truck routing (e.g. GraphHopper on Android) to remove the routing dependency.

## License

MIT for this code. Map data © OpenStreetMap contributors (ODbL). MapLibre GL JS is BSD-3-Clause (see `vendor/MAPLIBRE-LICENSE.txt`).
