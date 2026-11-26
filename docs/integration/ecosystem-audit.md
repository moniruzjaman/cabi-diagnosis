# KrishiAI Diagnostic Ecosystem — Phase 0 Audit

**Status:** Phase 0 audit snapshot  
**Audit date:** 2026-11-26  
**Contract status:** Draft; not yet approved for runtime use  
**Scope:** Read-only review of the three public repositories and their current default branches.

## 1. Executive decision

Keep three independently deployable applications with explicit ownership:

| Application | Canonical responsibility | Must not become |
|---|---|---|
| `cabi-diagnosis` | Primary structured field-diagnosis workflow, canonical disease references, evidence interpretation and field-case workflow | A shell that delegates all diagnosis to a companion app |
| `diagnostic-field-guide` | Bangla-first reference ebook, offline reading, search, TTS, bookmarks, manual symptom/photo comparison | An automated AI diagnosis engine |
| `diagnosis-assistant` | Visual identification education, practice, quizzes and training feedback | The authoritative field diagnosis or pesticide prescription system |

The apps should exchange only a small, versioned, validated context contract and navigational references. They should not share a runtime database, copy each other's UI, or transfer farmer photos/GPS/personal data by default.

## 2. Repository snapshot

The SHAs below are the default-branch heads observed during this audit. Recheck them before implementation if the branches move.

| Repository | Default branch | Audited HEAD | Latest observed commit |
|---|---|---|---|
| [cabi-diagnosis](https://github.com/moniruzjaman/cabi-diagnosis) | `main` | `21920ec13c79b66479046b81dcd7ea71de816aea` | 2026-11-24 — `Kilo/astral gate hek (#84)` |
| [diagnostic-field-guide](https://github.com/moniruzjaman/diagnostic-field-guide) | `main` | `6322c05b11a257f337ce2d281a9fd55dcf5aacec` | 2026-11-25 — merged PR #8 |
| [diagnosis-assistant](https://github.com/moniruzjaman/diagnosis-assistant) | `main` | `cf6f10c57968da0a71aa2375160fc445f4d5278d` | 2026-11-20 — static PWA basePath and social preview |

### Open PRs relevant to this programme

- CABI [PR #83](https://github.com/moniruzjaman/cabi-diagnosis/pull/83) — PesticideNext portal integration. It remains open although the main branch already contains the PesticideNext portal in the audited README and the PR head is older than main. Compare the diff and CI before deciding whether to close it as superseded; do not merge blindly.
- CABI [PR #81](https://github.com/moniruzjaman/cabi-diagnosis/pull/81) — Turso environment and truthful sync status. Its stated boundary is important: local-first records are not all cross-device synced.
- Field Guide [PR #1](https://github.com/moniruzjaman/diagnostic-field-guide/pull/1) — draft documentation clarifying offline image caching, ecosystem role and CC BY-NC boundaries. Reuse/review it; avoid duplicate text.
- Diagnosis Assistant [PR #2](https://github.com/moniruzjaman/diagnosis-assistant/pull/2) — draft documentation defining its training role and boundaries. Reuse/review it; avoid duplicate text.
- Diagnosis Assistant [PR #1](https://github.com/moniruzjaman/diagnosis-assistant/pull/1) — draft OpenStreetMap field-map plan; it is not an approved ecosystem integration contract.

No PR was merged or closed as part of this Phase 0 audit.

## 3. CABI Diagnosis audit

### Verified architecture

- React 18 + Vite 5 application, deployed on Vercel with serverless API functions.
- Existing structured intake: `src/components/diagnose/StructuredIntakeWizard.jsx`.
- Existing diagnosis fusion: `src/intelligence/diagnosisMerger.js`.
- Existing disease/risk intelligence: `src/intelligence/diseaseEngine.js`, `src/intelligence/riskEngine.js` and related modules.
- Existing crop selector data: `src/data/cropRegistry.js`.
- Existing visual model routing: `src/offline/visionRouter.js`.
- Existing ONNX model metadata: `public/models/manifest.json`.
- Existing crop-health case and sync implementation includes a local queue and a Turso `crop_health_cases` path. The current database/sync PR explicitly distinguishes local-first data from confirmed server persistence.

### Identifier findings

- `cropRegistry.js` is a display-oriented grouped registry whose values are Bangla/English display strings. It is not yet a normalized stable-ID registry.
- `diseaseEngine.js` contains machine-readable disease IDs such as `rice_blast`, `bacterial_leaf_blight` and `sheath_blight`. These are candidates for canonical disease identifiers, but the complete set and their aliases require a separate inventory before publication.
- The visual symptom vocabulary in the companion training app is a separate set of ten CABI symptom classes. It must not be confused with disease IDs or causal-group IDs.
- The model router accepts crop-name strings and routes cereal crops to ViT and selected Solanaceae crops to PlantVillage MobileNet. It is a routing heuristic, not proof that every crop has trained class coverage.

### Verified model manifest coverage

- `plantvillage-mobilenetv3-light`: manifest lists tomato, potato and pepper; 15 classes.
- `plantvillage-trained-128`: manifest lists tomato, potato and pepper; 15 classes.
- `crop-leaf-diseases-vit`: manifest lists rice, wheat, corn and potato; 13 classes.
- The router recognises aliases including rice/wheat/corn/maize and tomato/potato/pepper/brinjal, but the manifest's declared crop coverage is narrower than the router's token set. This mismatch must be handled explicitly; do not imply that a router match means a model is validated for that crop.
- The ViT manifest entry does not currently declare a labels-file path in the inspected manifest. Verify its actual class metadata and inference output before mapping its classes into a shared registry.

### CABI ownership decision

CABI owns canonical diagnostic case semantics and disease references. The companion apps may pass validated crop/symptom context to CABI, but must not write directly to CABI's database or create authoritative case records without the CABI workflow and consent.

## 4. Diagnostic Field Guide audit

### Verified architecture and capabilities

- Static HTML/CSS/JavaScript PWA; no mandatory backend is required for its core reading experience.
- Key files include `js/content.js`, `js/reader.js`, `js/search.js`, `js/tts.js`, `js/bookmarks.js`, `js/diagnosis-wizard.js`, `js/field-diagnosis.js`, `js/symptom-matcher.js` and `sw.js`.
- Its `cause-database.json` uses six cause-group IDs: `pest`, `fungal`, `bacterial`, `viral`, `nutrition` and `water`.
- The cause database explicitly says it is educational, does not name a disease and does not recommend pesticides.
- The image matcher is a manual visual-reference workflow, not an image-similarity or AI classifier.
- The README describes 265 book images. The app shell/text are cached, but image availability depends on image viewing/preloading and service-worker behaviour. Do not promise all images are available offline on first load.
- The repository declares CC BY-NC 4.0 and attributes the source Plantwise/CABI work and individual image sources. Do not copy its photographs into another repository without a separate licence/attribution review.

### Ownership decision

The Field Guide owns its translated book content, chapter/page references, TTS, bookmarks and manual visual-reference presentation. Its wizard should be framed as preliminary educational screening, not a confirmed disease diagnosis.

## 5. Diagnosis Assistant audit

### Verified architecture and capabilities

- Next.js 16 + TypeScript + Tailwind, configured for static export and GitHub Pages project path `/diagnosis-assistant`.
- Deployment workflow is `.github/workflows/deploy.yml`.
- Main application is `src/components/PlantApp.tsx`.
- Image metadata is `src/data/imageLabels.ts`, indexed primarily by CABI guide page number and descriptive labels rather than a shared stable crop/symptom ID system.
- `src/lib/staticDiagnose.ts` implements deterministic keyword matching to ten CABI visual symptom categories.
- `src/lib/freeAiDiagnose.ts` provides optional BYOK AI; the app also has offline/static fallback behaviour.
- `src/lib/staticDatabase.ts` loads `public/output/database.json` with an embedded fallback.
- `next.config.ts` sets `output: "export"`, `basePath: "/diagnosis-assistant"` and currently sets `typescript.ignoreBuildErrors: true`. This is a quality gate gap; Phase 3 should investigate removing it safely, not silently accept TypeScript errors.
- The README describes the heuristic as keyword matching. It must not be described as visual recognition just because an image field can be submitted to the optional AI path.

### Ownership decision

Diagnosis Assistant owns training content and learning progress local to the app. Its AI/heuristic output is educational and non-authoritative. It links to CABI for field diagnosis and the Field Guide for reference reading.

## 6. Cross-repository gaps and risks

1. **No shared crop ID contract:** CABI crop labels, Field Guide common-crop text and Assistant host-crop labels use different representations.
2. **No shared symptom ID contract:** Assistant has ten visual symptom classes; Field Guide has six cause groups; CABI has diagnostic and disease-engine vocabularies. These are related but not interchangeable.
3. **Disease identifiers are not a cross-app contract yet:** CABI has disease IDs, but consumer apps primarily use page numbers, category names and descriptive strings.
4. **Vision coverage mismatch:** crop routing tokens are broader than the declared model crop coverage.
5. **Offline image claims differ:** Field Guide image caching is conditional; Assistant and CABI have their own independent model/database cache behaviour.
6. **Licensing:** Field Guide images have CC BY-NC and original attribution obligations. No bulk image copying.
7. **Privacy:** CABI case sync explicitly keeps photos and precise GPS local under its current whitelist. This boundary must not be bypassed by cross-app deep links.
8. **Build quality:** Assistant's TypeScript build errors are currently ignored by Next configuration. It is a known issue, not proof of a clean type check.
9. **Route uncertainty:** each application has a different routing model (CABI tab-driven Vite app, Field Guide multi-page static HTML, Assistant Next static export with basePath). Proposed query parameters must be implemented through app-specific adapters after real route tests.
10. **Open PR overlap:** the Field Guide and Assistant already have draft ecosystem documentation PRs; review and reconcile before adding more prose in those repos.

## 7. Existing validation commands observed

| Repository | Existing commands/workflows | Phase 0 result |
|---|---|---|
| CABI | `npm run lint`, `npm run format:check`, `npm test`, `npm run test:offline`, `npm run build`; CI workflow `.github/workflows/ci.yml` | Not executed in this remote read-only audit |
| Field Guide | `npm test`, `npm run validate:handbook`; workflows `validate.yml`, `validate-field-guide-v2.yml` | Not executed in this remote read-only audit |
| Diagnosis Assistant | `bun run lint`, `bun run build`; workflow `.github/workflows/deploy.yml` | Not executed in this remote read-only audit |

## 8. Phase 0 exit conditions

- [x] Current default-branch heads and relevant open PRs recorded.
- [x] Application ownership boundaries documented.
- [x] Existing crop, symptom, cause-group and disease identifier patterns inspected.
- [x] Model coverage mismatch recorded.
- [x] Offline and licensing boundaries recorded.
- [x] Existing validation commands recorded.
- [ ] Contract schema reviewed and approved by repository owner.
- [ ] Crop and symptom alias mappings reviewed against all three source datasets.
- [ ] App-specific deep-link adapters tested in browser/mobile before routes are frozen.
- [ ] Phase 1–3 agents explicitly acknowledge the approved contract version.

**Important:** This is an evidence-based audit and draft contract. Do not treat unreviewed mappings or proposed URL examples as production-ready identifiers/routes.


## 9. Supplemental crop-source and vision-model reconciliation (2026-11-26)

The audit was extended after reviewing the supplied `crops_export.csv` and `moniruzjaman/kaggle-dataset`.

### Crop-source findings

- The supplied CSV export was reported as 923 rows, 147 distinct crop-name/category pairs, 11 categories and 556 distinct IDs.
- The export is useful as a candidate Bangladesh crop/variety source, but it contains repeated IDs/records and inconsistent English-name fields. It must be cleaned and provenance-preserved before it is treated as a normalized master.
- Do not treat each CSV row or variety as a separate crop identity.
- The original CSV IDs are source identifiers, not automatically canonical cross-app IDs.

### Pepper identity resolution

Keep these identities distinct:

| Canonical ID | Source/display name | Meaning |
|---|---|---|
| `capsicum_bell` | মিষ্টি মরিচ | Bell/sweet pepper |
| `chili` | মরিচ | Chilli pepper |
| `ornamental_pepper` | অর্নামেন্টাল মরিচ | Ornamental pepper |
| `black_pepper` | গোলমরিচ | Black pepper |

Do not use bare `pepper` as a universal alias. If an incoming label says only "pepper" without context, treat it as ambiguous rather than silently mapping it.

### Kaggle/PlantVillage model evidence

Inspected the source repository's three PlantVillage `class_names.json` files, `predict.py`, `train_model.py`, `download_pretrained_model.py` and `dataset_paths.py`.

- The three PlantVillage label files contain the same ordered 15 classes.
- The output classes cover bell pepper (2), potato (3) and tomato (10).
- The exact pepper labels are `Pepper__bell___Bacterial_spot` and `Pepper__bell___healthy`; they support bell pepper only.
- The source repo's ViT entry has no confirmed ordered 13-class label map in the inspected evidence. Its crop mapping must remain unverified until the exact model artifact and labels are recovered and checked.
- Model-reported/sample evaluation is not evidence of Bangladesh field accuracy.

The machine-readable evidence map is `model-coverage-v1.json`. The crop identity list is `crop-registry-v1.json`.

### Runtime correction boundary

Phase 0 records the evidence and defines the required fail-closed behaviour. Phase 1 must implement and test the runtime routing correction in CABI. Until then, do not claim that current runtime routing has already been fixed.
