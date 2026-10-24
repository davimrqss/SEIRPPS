# Architecture rules

- Keep the legacy `folhas_pagamento` table as the persisted guide record for backward compatibility; the user-facing domain is “Guia”.
- Derive guide due, paid, balance, and status values through `src/lib/guiaCalculations.ts` so every screen and PDF uses one rule.
- Resolve contribution/rate pairs through `guiaCalculations`; the last edited input drives the other and saved rates retain full precision, preventing mismatches when the base changes.
- Snapshot correction rates and indices on guides; shared adjustment inputs populate legacy per-part columns, preserving historical guides until their adjustments are explicitly changed.
- Store reusable guide descriptions independently from paying agencies; the guide itself owns the selected agency.
- Guard privileged pages in the router as well as in Supabase RLS so hidden menu items cannot be opened directly.
- Validate guide dates through `guiaDatesSchema` in creation, editing and import so all entry points share the same validation.
- Open guide PDFs only on explicit user action through `previewGuias` (`previewGuia` for one), which merges selected guides into one document in one tab, because browsers block several popups from a single click.
- Import guides from Excel by parsing sheets in the browser and copying values from the original cells; known headers are mapped locally, and only unknown layouts send a sample to the `analyze-guias-planilha` Gemini function for column mapping, because Gemini is too slow to transcribe whole sheets within the function time limit.