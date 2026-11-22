# Atomic UI kit (`src/components/ui`)

Phase 2 deliverable of the **উদ্ভিদ গোয়েন্দা UI/UX Enhancement Plan** — the
shared atom layer for the main (non-AgriChem) app. Design tokens live in
`src/data/themes.js` (single source: palettes, `SPACING`, `TYPOGRAPHY`,
`RADII`, `TOUCH_TARGET`, `STATUS_TONES`, `SEVERITY_LEVELS`, `toneColors`).

## Conventions

- **Theme-aware**: every atom takes an optional `C` theme prop (the active
  `lightThemeFull`/`darkThemeFull` object) and defaults to the light theme,
  so standalone usage still renders.
- **Touch targets**: interactive atoms keep the 44px minimum
  (`TOUCH_TARGET`, plan §8).
- **Never color-only**: status and severity always pair icon + Bangla label
  + tone color (`STATUS_TONES` / `SEVERITY_LEVELS`).
- **One dominant action**: `ActionBlock` is the standard "এখন যা করবেন"
  block for result, wizard and home screens.
- Flat design: solid fills, modest card elevation, no glassmorphism.

## Atoms

| Component | Purpose |
| --- | --- |
| `Button` | primary / secondary / danger / accent actions, optional icon + sub-label |
| `Badge` | tinted status pill (`tone` + optional `icon`) |
| `StatusBadge` | case/progress status from `STATUS_TONES` |
| `SeverityBadge` | severity with icon + label + optional % |
| `Card` | section surface, optional icon+title, accent border |
| `EmptyState` | empty/recovery state with one obvious next action |
| `ActionBlock` | dominant next-action guidance block |
| `OfflineBanner` | global trustworthy offline state (self-hiding when online) |

## Usage

```jsx
import { Button, StatusBadge, ActionBlock } from "../ui/index.js";

<Button C={C} variant="primary" icon="📷" block onClick={start}>
  স্ক্যান ও নির্ণয় করুন
</Button>

<StatusBadge C={C} status={c.status} label={STATUS_LABELS_BN[c.status]} />

<ActionBlock C={C} tone="warning" titleBn="এখন যা করবেন" bodyBn="৩ দিনের মধ্যে ব্যবস্থা নিন…" />
```
