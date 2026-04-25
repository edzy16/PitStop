# LogLeaf — App Design Spec

**Date:** 2026-04-26
**Stack:** Expo (React Native), expo-sqlite, expo-router, TypeScript

---

## Overview

LogLeaf is a mobile-first vehicle maintenance tracker that helps users know when to replace parts (engine oil, brake cable, etc.) and calculate fuel mileage. It supports multiple user-defined vehicles with no backend — all data is stored locally via expo-sqlite.

---

## Data Model

Three SQLite tables managed by a migration system.

### `vehicles`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| name | TEXT | user-defined, e.g. "My Honda CB150" |
| current_km | REAL | latest known odometer reading |

### `parts`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| vehicle_id | INTEGER FK | → vehicles.id (CASCADE DELETE) |
| name | TEXT | user-defined, e.g. "Engine Oil" |
| replaced_at_km | REAL | odometer reading at last replacement |
| interval_km | REAL | how long the part lasts in km |

**Computed values (not stored):**
- `due_at_km = replaced_at_km + interval_km`
- **Overdue:** `current_km >= due_at_km`
- **Due soon:** `current_km >= due_at_km - 500`

### `fuel_logs`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| vehicle_id | INTEGER FK | → vehicles.id (CASCADE DELETE) |
| odometer_km | REAL | odometer reading at this fill-up |
| fuel_litres | REAL | amount of fuel added |
| logged_at | INTEGER | unix timestamp |

**Mileage calculation:**
- The first fuel log entry for a vehicle is an odometer anchor only (fuel amount ignored)
- `lifetime_avg = (latest_odometer - first_odometer) / sum(fuel_litres of all entries except first)`
- `last5_avg` = same formula applied to the most recent 6 entries (5 intervals)
- Requires 2+ entries to show a result
- 0 entries → "No fill-ups logged yet"
- 1 entry → "Log one more fill-up to see mileage"

---

## Navigation

**Three bottom tabs:**

### Tab 1 — Home (Dashboard)
- Vehicle cards showing: name, current km, count badge of flagged parts
- Flagged parts listed below each card: overdue (red), due soon (amber)
- Parts within 500 km of due date are flagged
- "All good" empty state when nothing needs attention

### Tab 2 — Vehicles
- List of all vehicles with "+" to add new
- Tap → **Vehicle Detail** screen with three sub-sections:
  - **Parts** — list with status indicators; tap to edit or log a replacement
  - **Odometer** — current km, quick-update button, fuel log list
  - **Mileage** — lifetime avg km/L, last-5-fills avg
- Long press → delete vehicle (with confirmation)

### Tab 3 — Add (bottom sheet, not a real screen)
- Tapping opens a bottom sheet with two quick actions:
  - **Log part replacement** → pick vehicle → pick/create part → enter km
  - **Log fuel fill-up** → pick vehicle → enter odometer + litres

### Modals / Sheets
- Add/edit vehicle
- Add/edit part
- Log fuel fill-up
- Log part replacement

---

## Data Layer

### DB initialization (`src/db/db.ts`)
- Opens the SQLite database once at app start
- Runs pending migrations on startup using a `migrations` table
- Exported via `DatabaseContext` — consumed via `useDatabase()` hook
- No prop drilling of the db instance

### Repository files (one per table)
- `src/db/vehicles.ts` — `getVehicles`, `addVehicle`, `updateVehicle`, `deleteVehicle`, `updateOdometer`
- `src/db/parts.ts` — `getPartsByVehicle`, `addPart`, `updatePart`, `deletePart`, `logReplacement`
- `src/db/fuelLogs.ts` — `getFuelLogsByVehicle`, `addFuelLog`, `deleteFuelLog`, `calcMileage`

### State management
- No external state library
- Screens fetch data via `useFocusEffect` (refetches on navigation return)
- `calcMileage()` is a pure function — takes fuel log array, returns `{ lifetimeAvg, last5Avg }`

### Migrations
- `migrations` table tracks applied version numbers
- Version 1: full initial schema with all three tables + indexes

---

## UI & Theme

Dark minimalist design. Existing `Colors` and `Spacing` in `src/constants/theme.ts` are fully replaced.

### Palette
| token | value | usage |
|---|---|---|
| `background` | `#0A0A0A` | screen background |
| `backgroundElement` | `#141414` | cards, sheets |
| `backgroundSelected` | `#1E1E1E` | pressed/selected states |
| `primary` | `#208AEF` | buttons, active tabs, highlights |
| `text` | `#FFFFFF` | primary text |
| `textSecondary` | `#6B7280` | labels, captions |
| `danger` | `#EF4444` | overdue parts |
| `warning` | `#F59E0B` | due-soon parts |
| `success` | `#22C55E` | all-good states |

### Visual Style
- Flat cards with `#1E1E1E` border, no shadows
- `16px` border radius on cards and sheets
- Status indicators as colored left-border strips on part rows
- Bottom sheet with `backgroundElement` background and drag handle
- Tab bar: `background` color, blue active indicator
- No light mode — dark only
