# Field Map & Geofencing — Implementation Plan

Status: planning specification only. No runtime behaviour, case schema, or production deployment is changed by this document.

## 1. Goal

Extend Plant Detective's existing field-location capture into a farmer- and extension-officer-friendly **Field Map**. Use OpenStreetMap (OSM) for map display, GPS for explicit field-location capture, reverse geocoding for a human-readable administrative/place label, and geofence geometry for saved field boundaries.

The map must work with the existing diagnosis → case → monitoring workflow. It is not a separate app and must not replace the existing CABI diagnostic protocol.

## 2. Repository findings (main, inspected 2026-11-20)

- The repository is `moniruzjaman/cabi-diagnosis`; its README describes Plant Detective as an AI-powered CABI diagnostic-process trainer.
- `src/components/cases/FieldLocationPicker.jsx` already provides explicit, user-triggered GPS capture. It requests high accuracy, rejects readings worse than 25 m, and displays a privacy note.
- `src/intelligence/gpsPrecision.js` defines the accuracy tiers and 25 m rejection threshold.
- `src/intelligence/gpsUtils.js` provides Haversine distance and coordinate formatting.
- `src/components/cases/CaseManager.jsx` embeds the picker in the case form. The form currently maps `lat/lon/accuracy` into the case seed.
- `src/data/cropHealthCases.js` is a local-first `localStorage` case store. New case records currently initialise `fieldId` and `fieldLocation` to null.
- No Leaflet/MapLibre map component or geofence polygon editor was found in the searched source. The current feature is GPS point capture, not field mapping.
- The current Vercel project `cabi-diagnosis` is linked to this GitHub repository. Its custom domain is `cabi.krishiai.live`. The latest inspected production deployment was READY and built from main commit `a1f352522d6bdf5db0d6eff6be0d4575dd278b73`.

## 3. Proposed user experience

Add **Field Map / ক্ষেতের মানচিত্র** as a capability inside the existing Cases / Field Tracker experience.

### Map screen

1. Show an interactive OSM map centred on the saved case coordinate, or the user's current location only after they press **Use my location**.
2. Show the current GPS point, saved field boundary (if any), and other locally saved case pins.
3. Provide controls: Locate me, Set field centre, Draw boundary, Edit boundary, Clear draft, Save field.
4. Show coordinate, reported GPS accuracy, and reverse-geocoded administrative/place labels separately.
5. Keep visible attribution: © OpenStreetMap contributors.

### Field boundary capture

- Support drawing a polygon by tapping map vertices; support undo-last-point and close/save polygon.
- Require at least three valid vertices, validate the polygon, and show its calculated area in hectares and decimals only when geometry is valid.
- Permit manual coordinate entry as a fallback.
- Save boundary geometry separately from the GPS centre point.
- Do not infer a legal cadastral boundary from a GPS trace or OSM place label. Label it as a farmer/officer-recorded field outline.
- Do not automatically start continuous background tracking. Geofencing is evaluated when the user records a visit/observation or explicitly enables a future opt-in visit mode.

## 4. Data model — backward-compatible

Keep existing `fieldLocation: {lat, lng, accuracy}` records readable. Add optional fields; do not rename or delete current keys.

```js
fieldLocation: {
  lat: number,
  lng: number,
  accuracy: number,
  capturedAt: string,
  source: "gps" | "manual",
  addressLabel?: string,
  addressParts?: {
    village?: string,
    union?: string,
    upazila?: string,
    district?: string,
    postcode?: string
  },
  geocodeProvider?: string
},
fieldBoundary: {
  type: "Polygon",
  coordinates: number[][][], // GeoJSON order: [longitude, latitude]
  areaSqM?: number,
  capturedAt: string,
  source: "user-drawn" | "imported"
},
fieldVisit: {
  insideBoundary: boolean | null,
  distanceToBoundaryM?: number,
  checkedAt: string,
  gpsAccuracyM: number
}
```

Important: GeoJSON uses [longitude, latitude], while browser geolocation and current helper objects use {lat, lng}. Convert only at explicit serialization boundaries and test this carefully.

## 5. Technical choices

### Map rendering

- Prefer Leaflet with OSM raster tiles for the first version because the current application is React + Vite and the use case is a lightweight 2D field map.
- Add `leaflet` and `react-leaflet` only after confirming compatibility with the current React version and lockfile. Keep the map behind a lazy-loaded component so it does not increase the initial diagnosis bundle.
- Keep tile URL/provider configurable. Do not hard-code the OSM tile server as an immutable dependency.
- Always show attribution in the map viewport. Respect tile caching headers. Never prefetch/bulk-download OSM tiles or promise offline maps from the public OSM tile server.

### Reverse geocoding

- Reverse geocode only after a user explicitly captures or confirms a coordinate; never poll or geocode every GPS update.
- Use Nominatim only for low-volume, user-triggered reverse lookups with caching, a clear application identity/contact, and a provider abstraction that can be switched without an app release.
- Do not implement autocomplete or bulk/systematic lookups against the public Nominatim service.
- Treat the returned address as a nearby mapped place label, not an exact proof of the field address. Let the user correct village/union/upazila/district fields.
- If public Nominatim limits are unsuitable for production traffic, move to a contracted geocoder or a managed/self-hosted Nominatim instance. Do not silently proxy public Nominatim through a Vercel function to evade its policy.

### Geofence evaluation

- First release: point-in-polygon check when a GPS fix is captured or a field visit is recorded; show Inside / Outside / Uncertain.
- Return Uncertain when reported GPS accuracy overlaps the polygon edge or exceeds the configured quality threshold. Do not falsely classify uncertain fixes as outside.
- Use Turf.js point-in-polygon and area helpers, or a small reviewed geometry implementation with tests. Keep geometry calculations client-side initially.
- No background geofence monitoring or location history in phase 1. Future opt-in visit tracking must be separately consented, visible, battery-aware, and stoppable.

## 6. Privacy, permissions and reliability

- GPS is always user-initiated. Explain why location is requested before the browser permission prompt.
- Store the minimum location data required. Keep current local-first behaviour in phase 1; do not sync exact field coordinates to the cloud without a separate explicit consent and a reviewed access-control design.
- Provide delete/edit controls for saved coordinates and boundaries.
- Never attach precise location to analytics, diagnosis prompts, AI provider requests, or public share cards.
- Handle denied permission, unavailable GPS, timeout, low accuracy, no network, reverse-geocode failure, and tile failure without blocking diagnosis or case creation.
- Use HTTPS (the production domain is HTTPS) because browser geolocation requires a secure context in normal deployments.
- Add privacy-policy wording before any cloud synchronisation or officer-to-office sharing is introduced.

## 7. Delivery phases

### Phase 0 — baseline and safeguards
- Confirm current main SHA and Vercel project/production deployment.
- Review existing local-first case data, privacy promises, PWA cache rules, CSP, lockfile and Vercel function count.
- Add schema compatibility tests for old cases with no field geometry.

### Phase 1 — map preview
- Add lazy-loaded Leaflet map and OSM tiles with attribution.
- Display existing `fieldLocation` as a marker.
- Add explicit “Locate me” and “Use this point” controls.
- Keep current GPS accuracy rejection logic and add a manual fallback.

### Phase 2 — reverse geocoding
- Add a provider adapter and coordinate-keyed cache.
- Make one user-triggered reverse lookup after confirmation.
- Store editable administrative labels separately from coordinates.
- Add provider timeout, fallback, and no-network states.

### Phase 3 — boundary drawing and area
- Add polygon draw/edit/undo/clear controls.
- Validate geometry and compute area.
- Save `fieldBoundary` without changing legacy fields.
- Add import/export as GeoJSON only after validation and user confirmation.

### Phase 4 — geofence-aware field visits
- Check point-in-polygon when a user records an observation/visit.
- Use accuracy-aware Inside / Outside / Uncertain states.
- Add an optional visit summary to the case timeline; do not start background tracking.

### Phase 5 — sync (separate approval)
- Only if needed, design a server-side case/field sync using existing backend infrastructure and row-level ownership controls.
- Do not add a new Vercel function unless the function-count audit proves it is safe; prefer extending an existing API route if appropriate.
- Require explicit consent before transmitting precise coordinates or boundaries.

## 8. Acceptance criteria

- Existing cases without `fieldLocation` or `fieldBoundary` still load and edit without migration.
- GPS capture remains opt-in; low-accuracy fixes are not silently saved.
- A saved point appears at the correct location (verify lat/lng order).
- Reverse geocoding is user-triggered, cached, and clearly labelled approximate.
- OSM attribution remains visible at mobile and desktop sizes.
- Polygon can be drawn, edited, cleared, validated and saved.
- Geofence classification includes an Uncertain state based on GPS accuracy.
- No location is sent to AI, analytics or cloud sync without explicit consent.
- Diagnosis, Prevent, Learn, games, case lifecycle, PWA offline shell and existing API routes remain functional.
- `npm run format:check`, `npm run lint`, `npm test`, `npm run test:offline`, `npm run build` pass.
- Test mobile viewport, denied GPS, low-accuracy GPS, offline state, and a legacy case fixture.

## 9. References

- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- Nominatim reverse API: https://nominatim.org/release-docs/latest/api/Reverse/
- OSM copyright and attribution: https://www.openstreetmap.org/copyright

## 10. Explicit non-goals for phase 1

- No replacement of the existing diagnosis trainer or CABI 5-step diagnostic protocol.
- No mandatory location permission at app startup.
- No continuous/background tracking.
- No cadastral/land-ownership claim.
- No public field map or public disclosure of exact farmer coordinates.
- No new serverless function or paid map/geocoding dependency until cost and deployment constraints are reviewed.
