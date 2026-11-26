# KrishiAI Diagnostic Ecosystem — Integration Specification

**Contract:** Diagnostic Context Contract v1  
**Version:** 1.0.0-draft  
**Status:** Draft for owner review; not yet frozen  
**Owner:** CABI Diagnosis repository  
**Last reviewed:** 2026-11-26

## 1. Product boundaries

- **CABI Diagnosis** is the authoritative field diagnosis workflow and owner of canonical disease references.
- **Diagnostic Field Guide** is the offline Bangla reference book and manual symptom-comparison companion.
- **Diagnosis Assistant** is the visual identification training and quiz companion.

All three applications remain independently deployable. Cross-app integration is optional navigation plus a small context payload, not a shared application runtime.

## 2. Contract principles

1. Use stable machine IDs, never translated display strings, as integration keys.
2. Display labels remain owned by each app and localised independently.
3. Treat crop, plant-part, symptom, cause-group, disease and guide-reference IDs as different namespaces.
4. Unknown IDs must be rejected or safely ignored with a user-readable explanation. Never silently map an unknown value to another crop or disease.
5. Consumers pin a versioned JSON snapshot. No live shared database is required.
6. CABI is the source of truth for canonical disease references; Field Guide owns chapter/page references; Assistant owns training exercise IDs.
7. Do not send photographs, GPS coordinates, farmer identity, phone numbers, access tokens or free-form personal data through the cross-app contract.
8. No companion app may create or mark a CABI case as synced.
9. Every app must continue to work if the other two apps are unavailable.
10. Route adapters must respect each app's actual base path and routing model.

## 3. Contract envelope

The initial JSON Schema is in `diagnostic-contract-v1.schema.json`.

Minimum interoperable context:

- `schemaVersion`
- `sourceApp`
- `destinationApp`
- `context.cropId` (optional)
- `context.plantPartId` (optional)
- `context.symptomIds` (optional array)
- `context.causeGroupIds` (optional array)
- `context.guideReference` (optional page/chapter reference)
- `returnTo` (optional enum, never an arbitrary URL)

A context may contain only the IDs needed for the next user action. Avoid sending a full diagnostic record between applications.

## 4. Initial identifier namespaces

### Crop IDs

The draft crop registry is `crop-registry-v1.json`. It contains a small set of reviewed candidate IDs and aliases for the first integration pass, not the entire CABI crop selector.

Do not assume a model supports a crop merely because the crop exists in the registry. Model eligibility must be checked separately against model manifest and actual class labels.

### Symptom IDs

The draft symptom registry is `symptom-registry-v1.json`. The ten visual classes come from the Diagnosis Assistant's current CABI symptom taxonomy. These IDs are not disease IDs and do not imply a specific causal agent.

### Cause-group IDs

The Field Guide currently defines `pest`, `fungal`, `bacterial`, `viral`, `nutrition` and `water`. Keep these in a separate namespace. They are broad educational cause groups, not confirmed diagnoses.

### Disease IDs

CABI's `src/intelligence/diseaseEngine.js` is the proposed canonical owner. Existing IDs such as `rice_blast`, `bacterial_leaf_blight` and `sheath_blight` are existing CABI identifiers. Before publishing a full disease registry, audit all IDs, aliases, deprecated entries and collisions. Consumers should treat disease IDs as opaque references and must not derive them from display labels.

### Guide references

The Field Guide owns chapter/page IDs. Diagnosis Assistant currently uses page numbers in its image catalog and local recommendations. A guide reference should therefore include a stable guide key plus page number, not assume a page number alone is globally unique.

## 5. Deep-link adapter policy

Do not force a single route format across the three apps. Each app implements a small adapter that:

1. Parses only its documented allowlisted query parameters.
2. Validates all IDs against its pinned registry snapshot.
3. Rejects unknown `destinationApp`, source or return values.
4. Preserves the app's current base path.
5. Does not accept arbitrary `returnUrl` values.
6. Presents a safe fallback when a referenced page, crop or symptom is unavailable.
7. Keeps browser back behaviour intact.

Route shapes are deliberately not frozen in Phase 0 because the apps use different navigation systems. Phase 1–3 agents must document actual route entry points; Phase 4 validates the final routes.

## 6. Versioning and compatibility

- Contract version uses semantic versioning.
- Adding optional fields or new registry entries is a minor-compatible change.
- Removing/renaming IDs or changing their meaning requires a major version.
- Consumers must tolerate unknown optional fields but must reject invalid required fields.
- Keep deprecated IDs as aliases for at least one supported migration cycle.
- Each app records the exact registry/contract version it bundles.
- Do not fetch mutable `main` JSON at runtime as a dependency for core app functionality.

## 7. Data and privacy boundary

Permitted by default:
- Stable crop IDs.
- Plant-part IDs.
- Symptom IDs selected by the user.
- Cause-group IDs explicitly selected/observed.
- Guide page references.
- Source application and contract version.

Not permitted by default:
- Farmer name, phone, email or national ID.
- Farm/plot identifiers.
- Exact GPS or geofence coordinates.
- Raw photographs or encoded image data.
- Authentication tokens or API keys.
- Free-text case notes.

If a later workflow requires transmitting additional data, it needs a separate explicit consent, security and data-retention review. The current contract does not authorise such transfer.

## 8. Implementation sequence

1. Approve this contract and the initial crop/symptom mappings.
2. Phase 1: implement the CABI adapter and authoritative registry validation.
3. Phase 2: implement Field Guide outbound links and validated inbound reference handling.
4. Phase 3: implement Assistant training deep links and educational-result labelling.
5. Phase 4: run end-to-end browser/mobile/offline tests and verify all app-specific routes.

## 9. Open decisions for owner approval

- Whether the first stable crop registry should include only crops with explicit CABI disease/model coverage or all crops in the CABI selector.
- Whether crop-season variants (e.g. Boro/Aman/Aus) should remain attributes of `rice` or become separate crop IDs. Current recommendation: keep `rice` as crop ID and season as a separate optional attribute.
- Whether the Field Guide's six cause groups should be mapped to a shared cause-group registry without changing their existing local IDs. Current recommendation: preserve the existing IDs and add aliases only where required.
- Whether to publish the full CABI disease registry in v1 or keep disease IDs as CABI-local opaque references for the first integration release. Current recommendation: keep them opaque initially.
