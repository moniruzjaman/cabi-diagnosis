import test from "node:test";
import assert from "node:assert/strict";
import { isValidFieldPolygon, pointInPolygon } from "../fieldGeofence.js";

const square = [
  { lat: 23.7, lng: 90.3 },
  { lat: 23.7, lng: 90.4 },
  { lat: 23.8, lng: 90.4 },
  { lat: 23.8, lng: 90.3 },
];

test("accepts a valid field polygon", () => {
  assert.equal(isValidFieldPolygon(square), true);
});

test("rejects polygons with fewer than three valid points", () => {
  assert.equal(isValidFieldPolygon(square.slice(0, 2)), false);
  assert.equal(isValidFieldPolygon([{ lat: 91, lng: 90 }, ...square.slice(1)]), false);
});

test("detects a point inside a field", () => {
  assert.equal(pointInPolygon({ lat: 23.75, lng: 90.35 }, square), true);
});

test("detects a point outside a field", () => {
  assert.equal(pointInPolygon({ lat: 23.85, lng: 90.35 }, square), false);
});

test("treats a point on the field boundary as inside", () => {
  assert.equal(pointInPolygon({ lat: 23.75, lng: 90.3 }, square), true);
});

test("rejects missing or invalid point coordinates", () => {
  assert.equal(pointInPolygon(null, square), false);
  assert.equal(pointInPolygon({ lat: NaN, lng: 90.35 }, square), false);
});
