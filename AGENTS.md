# Architecture rules

- Keep the legacy `folhas_pagamento` table as the persisted guide record for backward compatibility; the user-facing domain is “Guia”.
- Derive guide due, paid, balance, and status values through `src/lib/guiaCalculations.ts` so every screen and PDF uses one rule.
- Store reusable guide descriptions independently from paying agencies; the guide itself owns the selected agency.