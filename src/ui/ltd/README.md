# Founder-approved Ltd UI source

Current candidate status: `INTEGRATED_CANDIDATE`. The Fable loop is closed. Preserve the approved visual design while binding every visible control to the canonical facade.

Entry object:

```js
window.TaxMateLtdUIFacade
```

Required use:

```js
const stop = window.TaxMateLtdUIFacade.subscribe(snapshot => render(snapshot));
const result = await window.TaxMateLtdUIFacade.onContinueStep({ step: 1, values });
```

Rules:

- UI reads semantic snapshots and triggers named callbacks only.
- UI never imports `../../core/**` or mutates snapshot objects.
- UI never calculates tax, accounting, allocations, ownership percentages, eligibility or next routes.
- UI renders all five result states and uses `fieldErrors[].field`, `fieldErrors[].reasonCode`, `fieldErrors[].copyKey` and `fieldErrors[].params` for inline errors; it never displays a raw engine message.
- UI calls `onDraftChanged`, `onOpenInfo`, `onBack` and dirty-dismiss callbacks rather than keeping competing navigation/draft state.
- Product copy comes from `snapshot.informationCopy` / the approved six-locale artifact, not hard-coded English fallback.
- Layout, spacing, components, typography, colours, hierarchy, responsive behaviour, light/dark modes and RTL follow the Founder-approved design and must not be redesigned during integration fixes.
