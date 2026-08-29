# Codex-owned integration boundary

Contract version: `taxmate-ltd-ui-facade.3`
Candidate status: `INTEGRATED_CANDIDATE`

This directory is the supported bridge between the Founder-approved Ltd UI and TaxMate's canonical Ltd domain engines. The Fable loop is closed; Codex owns this boundary and its behaviour.

- `TaxMateLtdUIFacade.js`: route, overlay, dirty-draft, busy/result and stable callback contract.
- `TaxMateLtdUIFacadeClient.js`: browser transport with the same callback names for the localhost workbench.
- `CanonicalCompanyDriver.js`: persistent adapter from semantic callbacks to canonical engines and sanitised local state.
- `company-structural-state.js`: exact P9.5 draft/workflow implementation.
- `approved-copy.json`: exact Founder-approved six-locale artifact.

The current contract keeps business selection, one-Ltd state, unregistered/resumable company drafts, period reconciliation, same-identity draft Edit, correction dependencies/chronology, validation reason/copy keys and Home row calculations behind this boundary.

No file returns HTML, CSS class names or visual component instructions. UI code must not bypass this boundary or recreate accounting, tax, validation, persistence or navigation rules.
