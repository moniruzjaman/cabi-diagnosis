import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VisualDiagnosisLibrary from "./VisualDiagnosisLibrary.jsx";
import { getAccuracyTier, shouldRejectReading, tierLabelBn } from "../intelligence/gpsPrecision.js";
import { formatLatLon } from "../intelligence/gpsUtils.js";
import { isValidFieldPolygon, pointInPolygon } from "../intelligence/fieldGeofence.js";

const STORAGE_KEY = "cabi-identification-fields-v1";
const NOMINATIM_CACHE_KEY = "cabi-identification-geocode-v1";
let lastNominatimRequestAt = 0;
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

// Keep only well-formed saved fields: an entry without an id or a valid
// polygon would crash rendering later (e.g. polygon.map in the map layer).
function sanitizeFields(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (field) =>
      field &&
      typeof field === "object" &&
      typeof field.id === "string" &&
      field.id.length > 0 &&
      isValidFieldPolygon(field.polygon),
  );
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    let css = document.querySelector('link[data-cabi-leaflet="true"]');
    if (!css) {
      css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      css.dataset.cabiLeaflet = "true";
      document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-cabi-leaflet="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L), { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.L) resolve(window.L);
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.cabiLeaflet = "true";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("মানচিত্র লাইব্রেরি চালু হয়নি")));
    script.onerror = () => {
      // Drop the failed script so the next tab entry can retry a fresh load
      // instead of attaching listeners to an element that already errored.
      script.remove();
      reject(new Error("Leaflet লোড হয়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন"));
    };
    document.body.appendChild(script);
  });
}

const baseButton = {
  border: "1px solid #d7e2dc",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#fff",
  color: "#145b43",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function IdentificationWorkspace({ C }) {
  const [mode, setMode] = useState("visual");
  const [fields, setFields] = useState(() => sanitizeFields(readJson(STORAGE_KEY, [])));
  const [fieldName, setFieldName] = useState("");
  const [crop, setCrop] = useState("ধান");
  const [vertices, setVertices] = useState([]);
  const [gps, setGps] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [mapStatus, setMapStatus] = useState("মানচিত্র প্রস্তুত করা হচ্ছে…");
  const [activeFieldId, setActiveFieldId] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  // Bumped after the Leaflet map (re)initializes so the drawing effects below
  // re-run and restore vertices, saved-field polygon and GPS marker.
  const [mapReady, setMapReady] = useState(0);

  const activeField = useMemo(() => fields.find((f) => f.id === activeFieldId) || null, [fields, activeFieldId]);
  const geofenceResult = useMemo(
    () => (gps && activeField ? pointInPolygon(gps, activeField.polygon) : null),
    [gps, activeField],
  );

  const persistFields = useCallback((next) => {
    setFields(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch {
      setGeoStatus("ডিভাইসের স্টোরেজ পূর্ণ — ক্ষেত সংরক্ষণ করা যায়নি।");
      return false;
    }
  }, []);

  const reverseGeocode = useCallback(async (point) => {
    const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    const cache = readJson(NOMINATIM_CACHE_KEY, {});
    if (cache[key]) {
      setPlaceName(cache[key]);
      return cache[key];
    }
    setGeoStatus("নিকটবর্তী এলাকার নাম খোঁজা হচ্ছে…");
    try {
      const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastNominatimRequestAt = Date.now();
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.search = new URLSearchParams({
        format: "jsonv2",
        lat: String(point.lat),
        lon: String(point.lng),
        zoom: "18",
        addressdetails: "1",
        "accept-language": "bn,en",
      }).toString();
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Reverse geocoding unavailable");
      const data = await response.json();
      const a = data.address || {};
      const label =
        [
          a.neighbourhood || a.suburb || a.village || a.hamlet || a.quarter,
          a.union || a.town || a.city || a.municipality,
          a.county || a.state_district || a.state,
        ]
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(", ") ||
        data.display_name ||
        "এলাকার নাম পাওয়া যায়নি";
      cache[key] = label;
      try {
        localStorage.setItem(NOMINATIM_CACHE_KEY, JSON.stringify(cache));
      } catch {}
      setPlaceName(label);
      setGeoStatus("এলাকার নাম পাওয়া গেছে।");
      return label;
    } catch {
      setGeoStatus("এলাকার নাম অনলাইনে পাওয়া যায়নি। স্থানীয় নাম হাতে লিখুন।");
      return "";
    }
  }, []);

  useEffect(() => {
    if (mode !== "field" || !mapRef.current || mapInstanceRef.current) return undefined;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([23.75, 90.38], 7);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);
        mapInstanceRef.current = map;
        polygonLayerRef.current = L.layerGroup().addTo(map);
        markerLayerRef.current = L.layerGroup().addTo(map);
        map.on("click", (event) => {
          setVertices((current) => [...current, { lat: event.latlng.lat, lng: event.latlng.lng }]);
        });
        setMapStatus("মানচিত্র প্রস্তুত। ক্ষেতের সীমানা আঁকতে মানচিত্রে ট্যাপ করুন।");
        setTimeout(() => {
          if (mapInstanceRef.current === map) map.invalidateSize();
        }, 100);
        setMapReady((n) => n + 1);
      })
      .catch((error) => setMapStatus(error.message || "মানচিত্র লোড হয়নি।"));
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      polygonLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !polygonLayerRef.current) return;
    polygonLayerRef.current.clearLayers();
    if (vertices.length) {
      vertices.forEach((point) =>
        L.circleMarker([point.lat, point.lng], { radius: 5, color: "#006a4e" }).addTo(polygonLayerRef.current),
      );
      if (vertices.length >= 2) {
        L.polyline(
          vertices.map((p) => [p.lat, p.lng]),
          { color: "#00865a", weight: 3, dashArray: "6 5" },
        ).addTo(polygonLayerRef.current);
      }
      if (vertices.length >= 3) {
        L.polygon(
          vertices.map((p) => [p.lat, p.lng]),
          { color: "#006a4e", fillColor: "#16a34a", fillOpacity: 0.15 },
        ).addTo(polygonLayerRef.current);
      }
    }
    if (activeField) {
      L.polygon(
        activeField.polygon.map((p) => [p.lat, p.lng]),
        { color: "#d97706", fillColor: "#f59e0b", fillOpacity: 0.12, weight: 3 },
      ).addTo(polygonLayerRef.current);
    }
  }, [vertices, activeField, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    if (gps) {
      L.marker([gps.lat, gps.lng]).bindPopup("আপনার বর্তমান GPS অবস্থান").addTo(markerLayerRef.current);
      map.setView([gps.lat, gps.lng], Math.max(map.getZoom(), 15));
    }
  }, [gps, mapReady]);

  const captureGps = (options = {}) => {
    if (!navigator.geolocation) {
      setGeoStatus("এই ডিভাইসে GPS সুবিধা নেই।");
      return;
    }
    const addBoundaryPoint = options.addBoundaryPoint === true;
    setGeoStatus("GPS অবস্থান নেওয়া হচ্ছে…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
        };
        if (shouldRejectReading(point.accuracy)) {
          setGeoStatus(`GPS নির্ভুলতা কম (±${point.accuracy} মিটার)। ২৫ মিটারের মধ্যে আবার চেষ্টা করুন।`);
          return;
        }
        setGps(point);
        const map = mapInstanceRef.current;
        if (map) map.setView([point.lat, point.lng], 16);
        if (addBoundaryPoint) {
          setVertices((current) => [...current, { lat: point.lat, lng: point.lng }]);
        }
        if (navigator.onLine) {
          await reverseGeocode(point);
        } else {
          setGeoStatus("GPS পাওয়া গেছে। ইন্টারনেট না থাকায় এলাকার নাম নেওয়া যায়নি।");
        }
        if (addBoundaryPoint) {
          setGeoStatus(`GPS বিন্দু যোগ হয়েছে (±${point.accuracy} মিটার)। সীমানার পরবর্তী স্থানে গিয়ে আবার যোগ করুন।`);
        }
      },
      (error) =>
        setGeoStatus(
          error.code === 1
            ? "লোকেশন অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে অনুমতি দিন।"
            : "GPS পাওয়া যায়নি। খোলা আকাশের নিচে আবার চেষ্টা করুন।",
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const saveField = () => {
    if (vertices.length < 3) {
      setGeoStatus("ক্ষেতের সীমানা সংরক্ষণে কমপক্ষে ৩টি বিন্দু দিন।");
      return;
    }
    const field = {
      id: `field-${Date.now().toString(36)}`,
      name: fieldName.trim() || `আমার ক্ষেত ${fields.length + 1}`,
      crop,
      polygon: vertices,
      placeName: placeName || "",
      createdAt: new Date().toISOString(),
    };
    const saved = persistFields([field, ...fields]);
    if (saved) {
      setActiveFieldId(field.id);
      setVertices([]);
      setGeoStatus("ক্ষেতের সীমানা এই ডিভাইসে সংরক্ষিত হয়েছে।");
    }
  };

  const removeField = (id) => {
    persistFields(fields.filter((f) => f.id !== id));
    if (activeFieldId === id) setActiveFieldId("");
  };

  const tier = gps ? getAccuracyTier(gps.accuracy) : null;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 14px 30px", color: C?.text || "#17231d" }}>
      <section
        style={{
          background: "linear-gradient(135deg,#064e3b,#087f5b)",
          color: "#fff",
          borderRadius: 18,
          padding: "18px 16px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, letterSpacing: ".04em" }}>
          CABI · মাঠ শনাক্তকরণ ও শেখা
        </div>
        <h2 style={{ fontSize: 21, margin: "5px 0 6px", lineHeight: 1.35 }}>চোখে দেখুন, মাঠে যাচাই করুন</h2>
        <p style={{ fontSize: 12, lineHeight: 1.7, margin: 0, opacity: 0.94 }}>
          ছবি দেখে লক্ষণ চিনুন, নিজের ক্ষেতের সীমানা চিহ্নিত করুন এবং GPS অবস্থান ক্ষেতের ভেতরে কি না যাচাই করুন।
        </p>
      </section>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setMode("visual")}
          style={{
            ...baseButton,
            flex: 1,
            background: mode === "visual" ? "#006a4e" : "#fff",
            color: mode === "visual" ? "#fff" : "#145b43",
          }}
        >
          🖼️ ছবি দেখে শিখুন
        </button>
        <button
          onClick={() => setMode("field")}
          style={{
            ...baseButton,
            flex: 1,
            background: mode === "field" ? "#006a4e" : "#fff",
            color: mode === "field" ? "#fff" : "#145b43",
          }}
        >
          📍 মাঠে শনাক্ত করুন
        </button>
      </div>

      {mode === "visual" ? (
        <div>
          <div
            style={{ background: "#fff", border: "1px solid #dce8e1", borderRadius: 14, padding: 13, marginBottom: 12 }}
          >
            <h3 style={{ margin: "0 0 5px", color: "#075c43", fontSize: 15 }}>
              দেখুন → লক্ষণ মিলান → সম্ভাব্য কারণ শিখুন
            </h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: "#53645b" }}>
              CABI Plantwise-এর বিদ্যমান অফলাইন ছবির ভান্ডার ব্যবহার করুন। প্রথমে পাতার দাগ, হলদে হওয়া, মোজাইক, বিকৃতি,
              ঢলে পড়া বা কাণ্ডের ক্ষতি পর্যবেক্ষণ করুন। একটি ছবি একা রোগ নিশ্চিত করে না—ফসল, গাছের অংশ, মাঠের বিস্তার ও
              পরিবেশও মিলিয়ে দেখুন।
            </p>
          </div>
          <VisualDiagnosisLibrary />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid #dce8e1", borderRadius: 14, padding: 13 }}>
            <h3 style={{ margin: "0 0 6px", color: "#075c43", fontSize: 15 }}>১. ক্ষেতের সীমানা চিহ্নিত করুন</h3>
            <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#53645b", lineHeight: 1.65 }}>
              OpenStreetMap-এ ক্ষেতের চারপাশে ধারাবাহিকভাবে ট্যাপ করে কমপক্ষে ৩টি বিন্দু দিন। শেষ বিন্দু প্রথম বিন্দুর
              সঙ্গে স্বয়ংক্রিয়ভাবে যুক্ত হবে।
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700 }}>
                ক্ষেতের নাম
                <input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="যেমন: উত্তর পাশের ধানক্ষেত"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: 9,
                    borderRadius: 8,
                    border: "1px solid #cbd5d1",
                    font: "inherit",
                  }}
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 700 }}>
                ফসল
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: 9,
                    borderRadius: 8,
                    border: "1px solid #cbd5d1",
                    background: "#fff",
                    font: "inherit",
                  }}
                >
                  {["ধান", "গম", "ভুট্টা", "আলু", "টমেটো", "বেগুন", "পাট", "সরিষা", "মরিচ", "আম", "অন্যান্য"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <div
              ref={mapRef}
              style={{
                height: 340,
                width: "100%",
                borderRadius: 12,
                border: "1px solid #cbd5d1",
                overflow: "hidden",
                background: "#edf3ef",
              }}
            />
            <div style={{ fontSize: 10.5, color: "#64746b", margin: "6px 0 10px" }}>
              {mapStatus} · মানচিত্র: © OpenStreetMap contributors
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.65, color: "#52645a", margin: "0 0 9px" }}>
              মানচিত্র বা ইন্টারনেট না থাকলেও GPS চালু থাকলে ক্ষেতের চারপাশে হাঁটুন এবং প্রতিটি কোণ/বাঁকে
              “GPS থেকে সীমানার বিন্দু যোগ করুন” চাপুন। অন্তত ৩টি নির্ভুল বিন্দু নিয়ে ক্ষেত সংরক্ষণ করা যাবে।
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              <button onClick={captureGps} style={{ ...baseButton, background: "#e8f5ed" }}>
                ◎ আমার GPS নিন
              </button>
              <button onClick={() => captureGps({ addBoundaryPoint: true })} style={{ ...baseButton, background: "#e8f5ed" }}>
                📍 GPS থেকে সীমানার বিন্দু যোগ করুন
              </button>
              <button onClick={() => setVertices((current) => current.slice(0, -1))} disabled={vertices.length === 0} style={baseButton}>
                ↶ শেষ বিন্দু বাদ
              </button>
              <button onClick={() => setVertices([])} style={baseButton}>
                সব বিন্দু মুছুন
              </button>
              <button onClick={saveField} style={{ ...baseButton, background: "#006a4e", color: "#fff" }}>
                ক্ষেত সংরক্ষণ করুন
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#52645a", marginTop: 8 }}>
              সীমানার বিন্দু: {vertices.length}টি · {geoStatus}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #dce8e1", borderRadius: 14, padding: 13 }}>
            <h3 style={{ margin: "0 0 8px", color: "#075c43", fontSize: 15 }}>
              ২. GPS অবস্থান ও ক্ষেতের ভেতর/বাইরে যাচাই
            </h3>
            <button onClick={captureGps} style={{ ...baseButton, background: "#e8f5ed" }}>
              📍 বর্তমান অবস্থান যাচাই করুন
            </button>
            {gps && (
              <div style={{ fontSize: 12, lineHeight: 1.8, marginTop: 9 }}>
                <div>
                  <b>স্থানাঙ্ক:</b> {formatLatLon(gps.lat, gps.lng)} · নির্ভুলতা ±{gps.accuracy} মিটার (
                  {tierLabelBn(tier)})
                </div>
                <div>
                  <b>রিভার্স জিওকোডিং:</b> {placeName || "এলাকার নাম নির্ধারিত নয়"}
                </div>
                <div>
                  <b>GPS:</b>{" "}
                  {geofenceResult == null
                    ? "আগে সংরক্ষিত ক্ষেত নির্বাচন করুন"
                    : geofenceResult
                      ? "এই অবস্থান নির্বাচিত ক্ষেতের ভেতরে"
                      : "এই অবস্থান নির্বাচিত ক্ষেতের বাইরে"}
                </div>
                <div style={{ color: "#64746b", fontSize: 10.5 }}>
                  এলাকার নাম OpenStreetMap Nominatim থেকে; এটি জমির মালিকানা বা সরকারি সীমানার প্রমাণ নয়।
                </div>
              </div>
            )}
            {fields.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700 }}>
                  সংরক্ষিত ক্ষেত নির্বাচন করুন
                  <select
                    value={activeFieldId}
                    onChange={(e) => setActiveFieldId(e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #cbd5d1",
                      background: "#fff",
                    }}
                  >
                    <option value="">ক্ষেত নির্বাচন করুন</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · {f.crop}
                      </option>
                    ))}
                  </select>
                </label>
                {activeField && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                    }}
                  >
                    <span>
                      {activeField.placeName || "স্থানীয় ঠিকানা সংরক্ষিত নেই"} · {activeField.polygon.length}টি সীমানা
                      বিন্দু
                    </span>
                    <button
                      onClick={() => removeField(activeField.id)}
                      style={{ ...baseButton, color: "#b42318", borderColor: "#fecaca" }}
                    >
                      মুছুন
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div
            style={{
              background: "#fff8e8",
              border: "1px solid #f3d99a",
              borderRadius: 12,
              padding: 12,
              fontSize: 11,
              lineHeight: 1.7,
              color: "#76521b",
            }}
          >
            <b>গুরুত্বপূর্ণ:</b> GPS নির্ভুলতা ২৫ মিটারের বেশি হলে অবস্থান গ্রহণ করা হয় না। ক্ষেতের সীমানা ব্যবহারকারীর
            আঁকা আনুমানিক বহুভুজ—এটি ভূমি জরিপ, খতিয়ান বা আইনি সীমানা নয়। ক্ষেত ও GPS তথ্য শুধু এই ডিভাইসের
            localStorage-এ থাকে; কোনো সার্ভারে পাঠানো হয় না। মানচিত্রের টাইল ও এলাকার নাম পেতে ইন্টারনেট লাগবে;
            সংরক্ষিত ক্ষেত ও জিওফেন্স পরীক্ষা অফলাইনে কাজ করে।
          </div>
        </div>
      )}
    </div>
  );
}
