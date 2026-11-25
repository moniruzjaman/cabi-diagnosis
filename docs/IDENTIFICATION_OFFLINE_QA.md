# Identification workspace: offline field QA

## Purpose

The Identification workspace combines the locally bundled visual reference library with user-created field polygons and GPS point-in-polygon checks. It must remain useful when the map library, map tiles or reverse-geocoding service cannot be reached.

## Offline behavior

- Visual reference images and their index must be served from the app's existing local assets/cache.
- Saved field polygons remain local to the device.
- GPS capture and geofence checks may work offline when the browser grants location permission and the device can obtain a fix.
- When Leaflet or OSM tiles are unavailable, users must still be able to add boundary vertices by capturing GPS points while walking the field perimeter.
- Reverse geocoding is optional and online-only. Never block saving a field or checking a geofence because a place name cannot be resolved.
- Do not claim that map tiles are available offline unless an explicit tile-cache feature has been implemented and tested.

## Field verification safeguards

- Reject low-accuracy GPS readings according to the existing precision policy.
- Show the reported GPS accuracy alongside coordinates.
- Label user-drawn polygons as approximate field boundaries, not cadastral or legal boundaries.
- Explain that Nominatim place labels are approximate and do not prove ownership or official administrative boundaries.
- Keep field names, crop labels and polygons in local storage; do not upload them automatically.

## Manual QA

1. Open Identification > Field mode online; draw and save a polygon.
2. Disable network; reopen the workspace and verify the saved field is retained.
3. With map CDN unavailable, capture at least three GPS boundary points and save a field.
4. Capture a GPS fix and verify inside/outside status against the saved polygon.
5. Deny location permission and verify a clear, non-blocking error.
6. Restore network; verify map and reverse geocoding recover without losing saved fields.
7. Verify visual library search, category filters, image modal and offline images.
8. Run formatting, lint, build and existing offline/intelligence test suites.
