# WatchWDS — Agent Guidelines

## Golden rule: do not break what already works
- The live system (payments/Stripe, Mux streaming & webhooks, partner dashboard, event publishing, access gates) is in production use. Every change must be **additive and minimal**.
- Before changing shared code (`server.ts`, `clubStreamingService.ts`, `muxService.ts`, stores, shared components), trace every caller and confirm existing behaviour is preserved.
- Prefer new fields/flags/endpoints over changing the meaning of existing ones. Keep backward-compatible defaults (e.g. missing `publish_status` = published).
- Never weaken fail-closed security (paid-content protection, signed playback, webhook signature checks).
- When asked for an assessment or plan, **do not modify code** until the user approves.
- Run `npx tsc --noEmit -p .` and relevant tests in `tests/` before committing. Don't commit unrelated changes (e.g. `dist/` build output) unless asked.
