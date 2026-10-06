# Architecture rules

- Keep the legacy `folhas_pagamento` table as the persisted guide record for backward compatibility; the user-facing domain is “Guia”.
- Derive guide due, paid, balance, and status values through `src/lib/guiaCalculations.ts` so every screen and PDF uses one rule.
- Snapshot correction rates and indices on guides; shared adjustment inputs populate legacy per-part columns, preserving historical guides until their adjustments are explicitly changed.
- Store reusable guide descriptions independently from paying agencies; the guide itself owns the selected agency.
- Guard privileged pages in the router as well as in Supabase RLS so hidden menu items cannot be opened directly.