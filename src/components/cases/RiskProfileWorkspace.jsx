import { useEffect, useMemo, useState } from "react";
import RiskRadarWidget from "./RiskRadarWidget.jsx";

const CROPS = [
  "ধান / Rice",
  "গম / Wheat",
  "পাট / Jute",
  "আলু / Potato",
  "টমেটো / Tomato",
  "মরিচ / Chili",
  "বেগুন / Brinjal",
  "সরিষা / Mustard",
  "পেঁয়াজ / Onion",
  "ভুট্টা / Maize",
];
const STAGES = [
  ["germination", "বীজ অঙ্কুরোদ্গম"],
  ["seedling", "চারা"],
  ["vegetative", "গাছের বৃদ্ধি"],
  ["tillering", "কুশি"],
  ["stem_elongation", "কাণ্ড বৃদ্ধি"],
  ["booting", "থোড়"],
  ["heading", "শীষ বের হওয়া"],
  ["flowering", "ফুল/মোচা"],
  ["grain_filling", "দানা গঠন"],
  ["ripening", "পাকা"],
  ["harvest", "কাটা"],
];
const EMPTY_PROFILE = { name: "", district: "", upazila: "", union: "", crops: [] };

function readProfile(key, defaultDistrict, defaultCrop) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved === "object") {
      return { ...EMPTY_PROFILE, ...saved, crops: Array.isArray(saved.crops) ? saved.crops : [] };
    }
  } catch {}
  return {
    ...EMPTY_PROFILE,
    district: defaultDistrict || "",
    crops: defaultCrop
      ? [{ id: "diagnosis-selected-crop", crop: defaultCrop, growthStage: "vegetative", plantingDate: "" }]
      : [],
  };
}

export default function RiskProfileWorkspace({
  C,
  profileKey = "this-device",
  defaultDistrict = "",
  defaultCrop = "",
}) {
  const storageKey = `ud-risk-profile:${profileKey || "this-device"}`;
  const [profile, setProfile] = useState(() => readProfile(storageKey, defaultDistrict, defaultCrop));
  const [view, setView] = useState("personal");
  const [crop, setCrop] = useState(CROPS[0]);
  const [stage, setStage] = useState("vegetative");
  const [plantingDate, setPlantingDate] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {}
  }, [profile, storageKey]);

  const selectedCrop = useMemo(
    () => profile.crops.find((item) => item.id === selectedId) || null,
    [profile.crops, selectedId],
  );

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function addCrop() {
    const id = `crop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, crop, growthStage: stage, plantingDate };
    setProfile((current) => ({ ...current, crops: [...current.crops, item] }));
    setSelectedId(id);
    setView("personal");
    setPlantingDate("");
  }

  function removeCrop(id) {
    setProfile((current) => ({ ...current, crops: current.crops.filter((item) => item.id !== id) }));
    if (selectedId === id) setSelectedId("");
  }

  const districtReady = Boolean(profile.district.trim());
  const panelStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 14,
    boxShadow: C.shadow,
  };
  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    border: `1px solid ${C.border}`,
    borderRadius: 9,
    background: C.bg,
    color: C.text,
    fontSize: 12,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={panelStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.primaryDark }}>⚠️ ফসল ও এলাকার ঝুঁকি প্রোফাইল</div>
        <p style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.6, margin: "5px 0 12px" }}>
          নিজের ক্ষেত, ফসল ও বৃদ্ধির পর্যায় সংরক্ষণ করুন। ব্যক্তিগত মূল্যায়নে একটি ফসল নির্বাচন বাধ্যতামূলক; এলাকার
          সাধারণ পর্যবেক্ষণে প্রোফাইলে রাখা সব ফসল দেখা যাবে।
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            প্রোফাইল/কৃষকের নাম
            <input
              value={profile.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="নাম (ঐচ্ছিক)"
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            জেলা <span style={{ color: C.danger }}>*</span>
            <input
              value={profile.district}
              onChange={(e) => update("district", e.target.value)}
              placeholder="যেমন: কুড়িগ্রাম"
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            উপজেলা
            <input
              value={profile.upazila}
              onChange={(e) => update("upazila", e.target.value)}
              placeholder="উপজেলার নাম"
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            ইউনিয়ন/এলাকা
            <input
              value={profile.union}
              onChange={(e) => update("union", e.target.value)}
              placeholder="ইউনিয়ন/গ্রাম"
              style={fieldStyle}
            />
          </label>
        </div>
        <div style={{ fontSize: 9.5, color: C.textMuted, marginTop: 7 }}>
          এই ডিভাইসের ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত
        </div>
      </div>

      <div style={{ ...panelStyle, display: "flex", gap: 7, flexWrap: "wrap" }}>
        <button onClick={() => setView("personal")} style={tabStyle(view === "personal", C)}>
          আমার ফসলের ঝুঁকি
        </button>
        <button onClick={() => setView("area")} style={tabStyle(view === "area", C)}>
          এলাকার সাধারণ ঝুঁকি
        </button>
      </div>

      <div style={panelStyle}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.primaryDark, marginBottom: 9 }}>
          🌾 প্রোফাইলে ফসল যোগ করুন
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            ফসল
            <select value={crop} onChange={(e) => setCrop(e.target.value)} style={fieldStyle}>
              {CROPS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            বৃদ্ধির পর্যায়
            <select value={stage} onChange={(e) => setStage(e.target.value)} style={fieldStyle}>
              {STAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 10.5, color: C.textMuted }}>
            রোপণ/বপনের তারিখ (ঐচ্ছিক)
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
        </div>
        <button onClick={addCrop} style={primaryButton(C)}>
          + ফসল প্রোফাইলে যোগ করুন
        </button>
        {profile.crops.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {profile.crops.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto",
                  gap: 6,
                  alignItems: "center",
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 7,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 11.5, color: C.text }}>{item.crop}</b>
                  <div style={{ fontSize: 10, color: C.textMuted }}>
                    {STAGES.find(([value]) => value === item.growthStage)?.[1] || item.growthStage}
                    {item.plantingDate ? ` · ${item.plantingDate}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => {
                      setSelectedId(item.id);
                      setView("personal");
                    }}
                    style={smallButton(C)}
                  >
                    নির্বাচন
                  </button>
                  <button onClick={() => removeCrop(item.id)} aria-label="ফসল মুছুন" style={smallButton(C)}>
                    মুছুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {view === "personal" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.primaryDark, marginBottom: 7 }}>
              🎯 ব্যক্তিগত ফসল মূল্যায়ন
            </div>
            {profile.crops.length ? (
              <select value={selectedCrop?.id || ""} onChange={(e) => setSelectedId(e.target.value)} style={fieldStyle}>
                <option value="">ব্যক্তিগত ঝুঁকির জন্য ফসল নির্বাচন করুন *</option>
                {profile.crops.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.crop} · {STAGES.find(([value]) => value === item.growthStage)?.[1] || item.growthStage}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: 11.5, color: C.textMuted }}>ব্যক্তিগত ঝুঁকি দেখতে প্রথমে উপরের ফসল যোগ করুন।</div>
            )}
          </div>
          {!districtReady ? (
            <div style={warningStyle(C)}>ঝুঁকি মূল্যায়নের আগে প্রোফাইলে জেলা লিখুন।</div>
          ) : selectedCrop ? (
            <RiskRadarWidget
              key={selectedCrop.id}
              C={C}
              case={{
                id: `profile-${selectedCrop.id}`,
                crop: selectedCrop.crop,
                district: profile.district,
                growthStage: selectedCrop.growthStage,
              }}
              showAllRisks
              persist={false}
              showActions={false}
            />
          ) : (
            <div style={warningStyle(C)}>ব্যক্তিগত মূল্যায়নের জন্য ফসল নির্বাচন বাধ্যতামূলক।</div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.primaryDark }}>
              📍 এলাকার সাধারণ ঝুঁকি · {profile.district || "জেলা নির্ধারণ করুন"}
            </div>
            <p style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.6, margin: "5px 0 0" }}>
              এই এলাকার প্রোফাইলে নিবন্ধিত প্রতিটি ফসলের জন্য আলাদা ঝুঁকি-কার্ড। এটি জেলার সব জমির পরিমাপ নয়; আপনার
              সংরক্ষিত ফসলগুলোর প্রতিনিধিত্বমূলক পর্যবেক্ষণ।
            </p>
          </div>
          {!districtReady ? (
            <div style={warningStyle(C)}>এলাকার সাধারণ ঝুঁকি দেখতে জেলা নির্ধারণ করুন।</div>
          ) : profile.crops.length ? (
            profile.crops.map((item) => (
              <RiskRadarWidget
                key={item.id}
                C={C}
                case={{
                  id: `area-${item.id}`,
                  crop: item.crop,
                  district: profile.district,
                  growthStage: item.growthStage,
                }}
                showAllRisks
                persist={false}
                showActions={false}
              />
            ))
          ) : (
            <div style={warningStyle(C)}>এলাকার সাধারণ ঝুঁকি দেখাতে প্রোফাইলে অন্তত একটি ফসল যোগ করুন।</div>
          )}
        </div>
      )}

      <BAMISPanel C={C} district={profile.district} />
      <div style={{ fontSize: 9.5, color: C.textMuted, lineHeight: 1.5 }}>
        গোপনীয়তা: এই প্রোফাইল ব্রাউজারের লোকাল স্টোরেজে থাকে। এটি এখনো লগইন-ভিত্তিক ক্লাউড সিঙ্ক নয়; অন্য ডিভাইসে
        স্বয়ংক্রিয়ভাবে যাবে না।
      </div>
    </div>
  );
}

function BAMISPanel({ C, district }) {
  // Static official links only. No BAMIS API, scraping, proxy, or network
  // request is part of the app runtime; the Risk workspace works independently.
  const links = [
    ["জেলা কৃষি আবহাওয়া বুলেটিন", "https://www.bamis.gov.bd/en/bulletin/district/"],
    ["জাতীয় কৃষি আবহাওয়া বুলেটিন", "https://www.bamis.gov.bd/en/bulletin/"],
    ["কৃষি আবহাওয়া পূর্বাভাস", "https://www.bamis.gov.bd/agro-met/forecast/"],
    ["বন্যা ও নদ-নদীর তথ্য", "https://www.bamis.gov.bd/bwdb/river/"],
    ["BAMIS মূল পোর্টাল", "https://www.bamis.gov.bd/en/"],
  ];
  return (
    <section
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: C.shadow,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: C.primaryDark }}>🌦️ BAMIS — সরকারি কৃষি আবহাওয়া তথ্য</div>
      <div style={{ fontSize: 10.5, color: C.textMuted, margin: "4px 0 10px", lineHeight: 1.55 }}>
        {district ? `${district} জেলার` : "জেলা-ভিত্তিক"} বুলেটিন ও পূর্বাভাস দেখতে BAMIS-এর মূল পোর্টাল খুলুন। জেলা
        বুলেটিন পৃষ্ঠায় প্রয়োজনীয় জেলা নির্বাচন করুন।
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}>
        {links.map(([label, href]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textDecoration: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: "9px 10px",
              color: C.primary,
              background: C.bg,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {label} ↗
          </a>
        ))}
      </div>
      <div style={{ fontSize: 9.5, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
        লিংকগুলো সরাসরি সরকারি BAMIS ওয়েবসাইটে যায়। BAMIS API সংযোগ, স্বয়ংক্রিয় ডেটা সংগ্রহ বা এমবেড করা পূর্বাভাস
        নেই; পোর্টাল সাময়িকভাবে বন্ধ থাকলেও CABI Risk ও অন্যান্য ফিচার স্বাভাবিকভাবে চলবে।
      </div>
    </section>
  );
}

function tabStyle(active, C) {
  return {
    border: `1px solid ${active ? C.primary : C.border}`,
    borderRadius: 9,
    padding: "8px 12px",
    background: active ? C.primary : C.bg,
    color: active ? "#fff" : C.text,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}
function primaryButton(C) {
  return {
    marginTop: 9,
    border: 0,
    borderRadius: 9,
    padding: "9px 12px",
    background: C.primary,
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  };
}
function smallButton(C) {
  return {
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    padding: "5px 8px",
    background: C.bg,
    color: C.text,
    fontSize: 10,
    cursor: "pointer",
  };
}
function warningStyle(C) {
  return {
    border: `1px solid ${C.borderWarning || C.border}`,
    background: C.bgWarning || C.bgMuted,
    borderRadius: 11,
    padding: 12,
    color: C.text,
    fontSize: 11.5,
    lineHeight: 1.6,
  };
}
