# Image Naming Convention — CABI Diagnosis (Bangladesh)

## Purpose

Make every diagnostic/symptom image self-describing and searchable for Bangladesh farmers and extension workers. File names now carry: **page number + symptom category (English + Bangla) + key sign/symptom (Bangla) + sequence**.

## Format

```text
{page:03d}_{categoryEn}_{categoryBn}_{signSymptomBn}_{seq}{ext}
```

| Token | Description | Example |
| ------- | ------------- | --------- |
| `page:03d` | 3-digit field-guide page (traceable back to CABI PDF) | `015`, `093`, `111` |
| `categoryEn` | English symptom category, lowercase, underscores | `leaf_spot`, `wilt`, `galls` |
| `categoryBn` | Bangla symptom category | `পাতায়_দাগ`, `গাছ_নেতিয়ে`, `গাঁদ_ফোলা` |
| `signSymptomBn` | Most precise visible sign / symptom in Bangla | `ব্লাস্ট_ধূস্র_দাগ`, `পাতা_শুকিয়ে_মরছে`, `শিকড়_ফোলা` |
| `seq` | Sequence index when multiple images share the same page+category | `0`, `1`, `2` … |
| `ext` | Original extension (kept) | `.jpeg`, `.png` |

### Example

`img_page15_0.jpeg` → `015_leaf_spot_পাতায়_দাগ_ব্লাস্ট_ধূস্র_0.jpeg`

## Bangla Category → Sign/Symptom Glossary

| Category (En) | Category (Bn) | Key Sign / Symptom (Bn) |
| --------------- | --------------- | ------------------------- |
| `leaf_spot` | `পাতায়_দাগ` | `ব্লাস্ট_ধূস্র_দাগ` |
| `drying_necrosis_blight` | `শুকিয়ে_পচা` | `পাতা_শুকিয়ে_ব্লাইট` |
| `mosaic` | `মোজেইক` | `পাতা_হলুদ_সবুজ_মিশ্রণ` |
| `witches_broom` | `ডালপালা_গুচ্ছায়` | `ছোট_পাতার_গুচ্ছ` |
| `galls` | `গাঁদ_ফোলা` | `শিকড়_কাণ্ড_ফোলা` |
| `wilt` | `গাছ_নেতিয়ে` | `পাতা_শুকিয়ে_মরছে` |
| `little_leaf` | `ছোট_পাতা` | `পাতা_স্সামান্যের_চেয়ে_ছোট` |
| `canker` | `ক্যান্কার_কাণ্ড_পচা` | `কাণ্ডের_খোলা_আহত` |
| `cover_front_matter` | `অগ্রভাগ_পৃষ্ঠা` | `গাইডবুক_মুখপাতা` |

## Rules

1. **No spaces** — use underscores (`_`) so names are URL-safe and shell-safe.
2. **Keep the original extension** (`.jpeg` / `.png`).
3. **Zero-pad page to 3 digits** so files sort numerically (`015` < `093` < `111`).
4. **One image per (page, category, sign)** gets `seq=0`; additional images increment.
5. After renaming, update `public/database.json` `images[]` arrays to match new names.
6. Keep a legacy alias map (`IMAGE_NAME_LEGACY_MAP.json`) so any code still referencing `img_pageXX_Y.jpeg` keeps working.
