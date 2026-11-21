/**
 * Local field-boundary geofence helpers.
 * Coordinates use { lat, lng }; no external map or network dependency.
 */
export function isValidFieldPolygon(polygon) {
  return (
    Array.isArray(polygon) &&
    polygon.length >= 3 &&
    polygon.every(
      (point) =>
        Number.isFinite(point?.lat) &&
        Number.isFinite(point?.lng) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        point.lng >= -180 &&
        point.lng <= 180,
    )
  );
}

export function pointInPolygon(point, polygon) {
  if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) || !isValidFieldPolygon(polygon)) {
    return false;
  }

  const { lat, lng } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];

    // Treat a point on the polygon edge as inside the field.
    const cross = (lng - a.lng) * (b.lat - a.lat) - (lat - a.lat) * (b.lng - a.lng);
    const within =
      lng >= Math.min(a.lng, b.lng) - 1e-10 &&
      lng <= Math.max(a.lng, b.lng) + 1e-10 &&
      lat >= Math.min(a.lat, b.lat) - 1e-10 &&
      lat <= Math.max(a.lat, b.lat) + 1e-10;
    if (Math.abs(cross) < 1e-10 && within) return true;

    const intersects =
      a.lat > lat !== b.lat > lat &&
      lng < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat || Number.EPSILON) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}
