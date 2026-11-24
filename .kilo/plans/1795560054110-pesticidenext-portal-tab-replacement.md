# Plan: Replace embedded Pesticide tab with PesticideNext Portal

## Goal
Replace the embedded AgriChem Guide & Pest Control Database (`<AgriChemApp />`) rendered under the "নিরাপদ বালাইনাশক" (pesticide) tab with a returnable PesticideNext Portal iframe pointing to `https://pesticide.krishiai.live/`. Keep the protection-case radar widget above the portal. Ensure CI formatting passes and existing features/performance are not broken.

## Background
- Current branch: `kilo/astral-gate-hek` at commit `781c970`
- Reference implementation already exists on remote branch `origin/feat/pesticidenext-portal-integration` (commits `7851e29` through `7f6242f`), including formatting fixes (`9ff9e68`, `1dc763b`, `ef3d625`, `f677bd9`, `7f6242f`) that address the CI formatting failure at https://github.com/moniruzjaman/cabi-diagnosis/actions/runs/45500769339.
- The embedded AgriChem app is a large bundled sub-app (~5,624-record pesticide registry). Removing it from the main bundle reduces initial load and eliminates the `pesticideMapper-[hash].js` lazy chunk.

## Changes

### 1. `src/App.jsx`
- Replace `import AgriChemApp from "./agrichem/AgriChemApp"` with `import PesticideNextPortal from "./components/PesticideNextPortal.jsx";`
- Replace `<AgriChemApp />` with `<PesticideNextPortal onBack={() => setActiveTab("home")} />` inside the `{activeTab === "pesticide" && (...)}` block (line ~10944).
- Update the comment above the block from "PESTICIDE GUIDE (embedded, previously an external link)" to "PESTICIDE NEXT — standalone source-of-truth app in a returnable portal".
- Note: `src/App.jsx` is listed in `.prettierignore` (line 9), so prettier format check does not apply to it.

### 2. `src/components/PesticideNextPortal.jsx` (new file)
- iframe portal component embedding `https://pesticide.krishiai.live/`
- Header with: back button ("CABI Diagnosis-এ ফিরুন") calling `onBack`, PesticideNext identity, external "নতুন ট্যাবে খুলুন ↗" link (`target="_blank" rel="noopener noreferrer"`)
- Hint text in Bengali explaining fallback behavior
- `loading="eager"` on iframe (tab is conditionally mounted, so iframe only loads when tab opens)
- `referrerPolicy="strict-origin-when-cross-origin"`, `allowFullScreen`, frame permissions for camera/microphone/geolocation/clipboard

### 3. `src/components/PesticideNextPortal.css` (new file)
- Responsive portal layout: flex column, header card, frame with `min(76svh, 900px)` height, mobile `@media (max-width: 560px)` adjustments
- Uses CSS custom properties (`var(--c-border)`, `var(--c-bg-card)`, `var(--c-text)`, etc.) consistent with the app's design tokens

### 4. `README.md`
- Replace the "Pesticide Database (বালাইনাশক tab)" section with "PesticideNext (বালাইনাশক tab)" describing the portal integration, the back control, the external fallback, and that PesticideNext remains the source of truth while CABI keeps its own diagnosis/IPM recommendations.

## Formatting (CI fix)
- `npm run format:check` runs prettier on `src/**/*.{js,jsx,css}` and `api/**/*.js`.
- `src/components/PesticideNextPortal.jsx` and `src/components/PesticideNextPortal.css` are NOT in `.prettierignore`, so they must pass prettier check.
- Verify: `npx prettier --check "src/components/PesticideNextPortal.jsx" "src/components/PesticideNextPortal.css"` passes.
- The JSX uses double quotes, 2-space indent, semicolons, and attributes wrapped within 120 print width — matching `.prettierrc`.

## Performance & feature preservation
- Removed: embedded AgriChem sub-app (`src/agrichem/AgriChemApp.jsx` + `src/agrichem/App.tsx` + dataset). This reduces bundle size; the `pesticideMapper-[hash].js` lazy chunk is no longer needed for the pesticide tab.
- Kept: `getRegisteredProducts` / `lookupMoA` from `pesticideRegistry.js` / `moaDatabase.js` still used elsewhere (CABIGuideTab, CropProtectionPanel) — unchanged.
- Kept: protection-case radar widget (`RiskRadarWidget`) above the portal on the pesticide tab.
- Kept: `pesticideDb` recommended-products effect in `UdbhidGoenda` (loads `/pesticides.json`) — unchanged.
- Risk: external iframe host (`pesticide.krishiai.live`) may block embedding via `X-Frame-Options`/`Content-Security-Policy`. Mitigation: external "নতুন ট্যাবে খুলুন ↗" link + Bengali hint.
- Risk: iframe load time depends on external host. Mitigation: tab is conditionally rendered (lazy mount).

## Validation steps
1. `npx prettier --check "src/components/PesticideNextPortal.jsx" "src/components/PesticideNextPortal.css"` — formatting passes.
2. `npx eslint src/App.jsx` — lint passes on modified file.
3. `npm run build` — production build succeeds (CI step).
4. `npm test` — intelligence unit tests pass (unchanged test files).
5. Manual: navigate to pesticide tab, verify portal loads, back button returns to home, external link opens in new tab.

## Rollback
- Revert `src/App.jsx` import/usage to `AgriChemApp`, delete the two new component files, revert README section.

## Open questions / decisions
- The PesticideNext Portal URL is hardcoded as `https://pesticide.krishiai.live/` (taken from the reference branch). Confirm this is the intended production URL.
- `loading="eager"` vs `loading="lazy"`: since the tab mounts conditionally, eager is acceptable; lazy would defer until visible within the tab viewport.