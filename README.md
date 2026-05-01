# Pit Stop

A local-only vehicle maintenance tracker. Log fuel, track odometer, get warned before parts go overdue — across as many vehicles as you own. No accounts, no backend, no cloud.

Built with Expo Router, React Native, and SQLite.

## Features

- **Multi-vehicle** — track every car, bike, or scooter in one place.
- **Parts & service intervals** — set an interval (km) per part; the home screen flags anything overdue or due-soon (within 500 km).
- **Mileage calculator** — fuel logs power lifetime and last-5-fill averages. Returns *precise* numbers once you have two full-tank entries; *estimated* before that.
- **Fuel & odometer log** — quick-entry modal with a "Filled to full" switch (on by default) so partial fills don't break the math.
- **Offline-first** — all data lives in on-device SQLite. Nothing leaves the phone.

## Getting started

```bash
bun install
bun run start
```

Then open the app on:

- Android (`bun run android`)
- iOS (`bun run ios`)
- Web (`bun run web`)

## Development

```bash
# Type check
npx tsc --noEmit

# Lint
bun run lint

# Tests
bun run test
npx jest __tests__/mileage.test.ts   # single file
```

## Project layout

```
src/
  app/          expo-router screens (index, vehicles, vehicles/[id], modals)
  db/           SQLite migrations + repository functions (vehicles, parts, fuelLogs)
  utils/        pure logic (partStatus, mileage) — unit-tested
  components/   shared UI (ModalSheet, AddSheet wizard, AppTabs)
  constants/    theme (dark-only palette)
__tests__/      jest specs for the pure-logic utils
```

Path alias `@/` maps to `src/`. Migrations run on every DB open via `SQLiteProvider`'s `onInit`.

## Architecture notes

- **No global state library.** Each screen runs its own DB queries inside `useFocusEffect` and re-fetches on focus. Modals trigger refresh through `onSaved` callbacks.
- **Repositories, not classes.** Files in `src/db/` are plain async functions taking `db: SQLiteDatabase` as the first arg.
- **Pure logic stays pure.** `src/utils/` has no React and no I/O — data in, data out — which is why it's the only thing under test.
- **Dark theme only.** `Colors.light` is aliased to `Colors.dark` for backward compat with components that index by scheme.
- **Web overrides.** Files with `.web.tsx` / `.web.ts` suffixes shadow their native counterparts on web.
