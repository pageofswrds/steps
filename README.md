# Steps

A private step-tracker journal for iOS. It reads step counts, walking distance, and walking workouts from Apple Health, keeps them in a local database, and lets you write dated journal entries with photos against the days you walked. Everything stays on the device — no account, no server, no network calls.

This repo is a **foundation** handed off to a non-programmer owner to build on with AI coding tools. Read [`AGENTS.md`](./AGENTS.md) — it's the owner's guide and the house rules, and it's what every AI session loads (`CLAUDE.md` just includes it).

## Architecture

Expo SDK 57 + Expo Router, TypeScript, SQLite via `expo-sqlite`. The code splits into two halves along a deliberate seam: `src/data/` is a tested data foundation — migrations, an entry/photo store, a daily-metrics store, an idempotent Health sync behind a `HealthSource` interface, and a table-keyed change emitter that drives live-updating hooks — exposed through a single public index at `src/data/index.ts`. `src/app/` and `src/components/` are the UI half, which imports *only* from that index and is meant to be rewritten freely. The design and the reasoning behind the seam are in [`docs/specs/2026-08-13-foundation-design.md`](./docs/specs/2026-08-13-foundation-design.md), with the build plan in [`docs/plans/`](./docs/plans/).

## Running it

```bash
npm install
npx expo start      # then press `i`, or open the installed dev build
```

The app uses native modules (HealthKit, SQLite, image picker), so it needs a development build — Expo Go won't run it. To build one:

```bash
npm run ios         # expo run:ios — full native build, rarely needed
```

The Settings screen has a dev-only button that seeds a year of fake step data, so the UI can be developed without Health permissions or a real walking history.

## Tests

```bash
npm test            # jest — data layer, 23 tests
npx tsc --noEmit    # type check
npx expo-doctor     # project health
```

Tests cover the data layer only (`src/data/__tests__/`), against a `better-sqlite3` test database and a stubbed Health source. The UI is deliberately untested — it's expected to change beyond recognition.

## License

See [`LICENSE`](./LICENSE).
