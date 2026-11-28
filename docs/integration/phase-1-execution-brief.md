# Phase 1 Execution Brief — CABI Diagnostic Engine

**Assigned agent:** Claude  
**Repository:** `moniruzjaman/cabi-diagnosis`  
**Base:** `main`  
**Phase 0 reference PR:** [#85](https://github.com/moniruzjaman/cabi-diagnosis/pull/85)  
**Contract:** Diagnostic Context Contract v1 (draft until owner approves/merges Phase 0)  
**Scope:** CABI only. Do not modify Field Guide or Diagnosis Assistant.

## Mission

Strengthen CABI as the canonical, explainable field-diagnosis engine. Preserve its existing application, diagnostic workflow, offline capability, pesticide integration, local-first case handling and deployment. Implement additive, testable changes; do not replace the app or introduce a shared runtime database.

## Read Phase 0 first

Read these files from PR #85 before coding:

- `docs/integration/ecosystem-audit.md`
- `docs/integration/integration-spec.md`
- `docs/integration/diagnostic-contract-v1.schema.json`
- `docs/integration/crop-registry-v1.json`
- `docs/integration/symptom-registry-v1.json`
- `docs/integration/model-coverage-v1.json`

Treat source registries as draft inputs; do not silently invent aliases or expand crop/model coverage. If Phase 0 is not merged, base your work on an isolated branch from the approved Phase 0 head or wait for explicit owner direction. Never commit directly to `main`.

## Workstream A — canonical crop identity and aliases

1. Inspect the entire existing `src/data/cropRegistry.js` and every consumer before changing it.
2. Introduce stable crop IDs with display labels and explicit alias normalization; preserve existing UI labels, crop ordering, season/variety handling and selection behaviour.
3. Keep crop identity distinct from crop variety, season, plant part, symptom, disease and model eligibility.
4. Reconcile Bangladesh aliases only from reviewed source records. Preserve source IDs as provenance, not as canonical IDs.
5. Treat these as distinct:
   - `capsicum_bell` — bell/sweet pepper (মিষ্টি মরিচ)
   - `chili` — chilli (মরিচ)
   - `ornamental_pepper` — ornamental pepper (অর্নামেন্টাল মরিচ)
   - `black_pepper` — black pepper (গোলমরিচ)
6. Do not add ambiguous bare `pepper` as a universal alias. Resolve it only with enough context; otherwise ask the user or mark it ambiguous.
7. Do not infer ML support from crop registry membership.

## Workstream B — safe vision routing

1. Inspect `src/offline/visionRouter.js`, `public/models/manifest.json`, every deployed label file, model loader and prediction consumer.
2. Build a tested canonical-crop-to-engine map from `model-coverage-v1.json`.
3. PlantVillage 15-class models may be considered for `capsicum_bell`, `potato` and `tomato` only, subject to deployed artifact/label consistency.
4. Map `Pepper__bell___Bacterial_spot` and `Pepper__bell___healthy` only to `capsicum_bell`. Never route chilli, black pepper, ornamental pepper or brinjal to these classes.
5. The ViT engine is unverified. Do not use it for crop-specific predictions until the exact 13 ordered labels, artifact provenance and output mapping are verified. A manifest declaration alone is insufficient.
6. For unsupported crops, return a truthful unsupported/not-available state and continue the existing structured/manual/AI fallback without crashing or presenting a wrong model as suitable.
7. Validate model label count, ordering and class-to-crop consistency at load time where feasible. Fail closed for a mismatch; preserve app availability through the existing fallback.
8. Do not alter model weights or retrain in this phase.

## Workstream C — diagnostic evidence and disease references

1. Audit every disease ID in `src/intelligence/diseaseEngine.js` and all imported disease data. Preserve existing IDs as opaque stable identifiers.
2. Do not rename disease IDs or derive them from translated labels.
3. Improve diagnosis output so observations, candidate diagnoses, supporting evidence, contradictory evidence, confidence/uncertainty and next verification steps are clearly distinguished.
4. Do not promote a symptom category or a model label directly to a confirmed disease.
5. Keep pesticide recommendations downstream of diagnosis and existing registered-product/MoA safeguards. Do not add unverified pesticide rates, labels or active ingredients.
6. Cite source references only when they exist in the repository/data; explicitly flag uncited heuristic thresholds rather than manufacturing citations.

## Workstream D — cross-app inbound contract adapter

1. Implement a small, allowlisted inbound context parser for CABI, using the Phase 0 JSON Schema and pinned local registry snapshots.
2. Accept only known app IDs and known crop/symptom/cause-group/guide/training references.
3. Reject or safely ignore unknown IDs with a readable message; never map an unknown crop to another crop.
4. Do not accept arbitrary return URLs.
5. Do not transfer photos, exact GPS, farmer identity, phone numbers, tokens or free-text case notes.
6. Preserve CABI's existing tab navigation, browser back behaviour, Vite deployment paths and direct app entry points.
7. No shared database, cross-app writes, new mandatory paid API, or direct writes to the CABI case/sync tables from companion apps.

## Non-negotiable constraints

- Bangla-first user-facing labels; retain English technical terms where useful.
- Preserve existing features and current layout unless a specific usability fix is required.
- No regression to PWA/offline flows, model caching, diagnostic intake, case queue, pesticide tab, maps or existing deep links.
- No Firebase dependency or mandatory paid service.
- No broad refactor, monolith, new backend, or database migration without separate approval.
- No unrelated formatting churn.
- Keep changes small and independently reviewable.

## Required tests and evidence

Add/update tests for:

- Alias normalization and ambiguous `pepper` handling.
- Exact canonical mappings for the four pepper identities.
- PlantVillage support for bell pepper, potato and tomato only.
- Chilli, black pepper, ornamental pepper and brinjal never selecting PlantVillage.
- ViT disabled/unverified behaviour.
- Missing or mismatched label file, wrong class count and model-load failure fallback.
- Unknown crop/symptom IDs in inbound context.
- Valid and invalid contract payloads; arbitrary return URL rejection.
- Existing diagnostic workflow, local-first case queue, offline and pesticide navigation regressions.

Run the repository's actual CI commands, including format/lint, unit tests, offline tests and production build. Report exact commands and results; do not claim tests passed unless they ran.

## Deliverables

1. One isolated branch: `claude/phase-1-cabi-diagnostic-engine` (or a clearly named equivalent).
2. A PR against `main`, preferably draft until tests are green.
3. A concise architecture/change summary and list of touched files.
4. Test evidence, known limitations and before/after model-routing matrix.
5. A compatibility note for Field Guide and Diagnosis Assistant consumers.

## Explicitly out of scope

- Changes to `diagnostic-field-guide` or `diagnosis-assistant`.
- Publishing an exhaustive Bangladesh crop master from the CSV without cleaning and review.
- Retraining or replacing PlantVillage/ViT models.
- Making the ML classifier the only diagnosis path.
- Database schema changes, case-sync redesign, new paid APIs or pesticide database replacement.

## Completion gate

Phase 1 is ready for review only when CABI remains deployable, all existing workflows are preserved, model routing is evidence-based and fail-closed, aliases are deterministic, the inbound contract is validated, and the required CI/test evidence is attached to the PR. Do not merge without owner approval.
