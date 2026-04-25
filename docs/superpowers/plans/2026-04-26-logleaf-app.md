# LogLeaf App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a vehicle maintenance tracker with part replacement reminders, odometer tracking, and fuel mileage calculation using expo-sqlite with no backend.

**Architecture:** Three-tab app (Home dashboard, Vehicles list, FAB for quick-add). All data stored in local SQLite via expo-sqlite's `SQLiteProvider`. Pure utility functions handle part status and mileage computation; repository functions handle all DB access.

**Tech Stack:** Expo SDK 55, expo-router, expo-sqlite, React Native, TypeScript, jest-expo

---

## File Structure

### New files
- `src/types/index.ts` — shared TypeScript interfaces (Vehicle, Part, FuelLog, PartStatus)
- `src/utils/partStatus.ts` — pure functions: `getPartStatus`, `getKmRemaining`
- `src/utils/mileage.ts` — pure function: `calcMileage`
- `src/db/migrations.ts` — migration runner + v1 schema
- `src/db/vehicles.ts` — vehicle repository (getVehicles, addVehicle, updateVehicle, updateOdometer, deleteVehicle)
- `src/db/parts.ts` — parts repository (getPartsByVehicle, addPart, updatePart, logReplacement, deletePart)
- `src/db/fuelLogs.ts` — fuel logs repository (getFuelLogsByVehicle, addFuelLog, deleteFuelLog)
- `src/app/vehicles.tsx` — Vehicles list screen
- `src/app/vehicles/[id].tsx` — Vehicle detail screen (parts + odometer + mileage)
- `src/components/fab.tsx` — Floating action button
- `src/components/add-sheet.tsx` — Bottom sheet with Log Part Replacement + Log Fuel Fill-up actions
- `src/components/vehicle-card.tsx` — Dashboard card showing flagged parts
- `src/components/part-status-row.tsx` — Part row with colored left-border status indicator
- `src/components/modal-sheet.tsx` — Reusable modal bottom sheet wrapper
- `src/components/modals/add-vehicle-modal.tsx`
- `src/components/modals/add-part-modal.tsx`
- `src/components/modals/log-replacement-modal.tsx`
- `src/components/modals/log-fuel-modal.tsx`
- `__tests__/partStatus.test.ts`
- `__tests__/mileage.test.ts`

### Modified files
- `src/constants/theme.ts` — replace Colors with dark-only palette; add primary, danger, warning, success tokens
- `src/hooks/use-theme.ts` — always return `Colors.dark`
- `src/app/_layout.tsx` — add SQLiteProvider, FAB, AddSheet
- `src/app/index.tsx` — replace with Home dashboard
- `src/components/app-tabs.tsx` — update to 2 tabs (home, vehicles)
- `src/components/app-tabs.web.tsx` — update web tabs to (home, vehicles)

### Deleted after replacement
- `src/app/explore.tsx` — replaced by `src/app/vehicles.tsx`

---

## Task 1: Install expo-sqlite and configure Jest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install expo-sqlite**

```bash
cd D:/Dev/LogLeaf && npx expo install expo-sqlite
```

Expected: `expo-sqlite` added to `package.json` dependencies.

- [ ] **Step 2: Install jest-expo and @types/jest**

```bash
npx expo install --dev jest-expo @types/jest
```

- [ ] **Step 3: Add jest config and test script to package.json**

Open `package.json`. Add `"test": "jest"` to `scripts` and add a `jest` key at the top level:

```json
{
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

- [ ] **Step 4: Verify jest works**

```bash
npx jest --listTests
```

Expected: no errors (even with no test files yet).

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: install expo-sqlite and configure jest-expo"
```

---

## Task 2: Update theme and add shared types

**Files:**
- Modify: `src/constants/theme.ts`
- Modify: `src/hooks/use-theme.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Replace theme.ts with dark-only palette and new tokens**

Replace the entire contents of `src/constants/theme.ts`:

```typescript
import '@/global.css';
import { Platform } from 'react-native';

const dark = {
  background: '#0A0A0A',
  backgroundElement: '#141414',
  backgroundSelected: '#1E1E1E',
  primary: '#208AEF',
  text: '#FFFFFF',
  textSecondary: '#6B7280',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
} as const;

export const Colors = {
  light: dark,
  dark,
} as const;

export type ThemeColor = keyof typeof dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
```

- [ ] **Step 2: Simplify use-theme.ts to always return dark**

Replace `src/hooks/use-theme.ts`:

```typescript
import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}
```

- [ ] **Step 3: Create src/types/index.ts**

```typescript
export interface Vehicle {
  id: number;
  name: string;
  current_km: number;
}

export interface Part {
  id: number;
  vehicle_id: number;
  name: string;
  replaced_at_km: number;
  interval_km: number;
}

export interface FuelLog {
  id: number;
  vehicle_id: number;
  odometer_km: number;
  fuel_litres: number;
  logged_at: number;
}

export type PartStatus = 'ok' | 'due-soon' | 'overdue';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/constants/theme.ts src/hooks/use-theme.ts src/types/index.ts
git commit -m "feat: dark-only theme palette and shared types"
```

---

## Task 3: Part status utility + tests

**Files:**
- Create: `src/utils/partStatus.ts`
- Create: `__tests__/partStatus.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/partStatus.test.ts`:

```typescript
import { getPartStatus, getKmRemaining } from '../src/utils/partStatus';
import { Part } from '../src/types';

const part: Part = {
  id: 1,
  vehicle_id: 1,
  name: 'Engine Oil',
  replaced_at_km: 10000,
  interval_km: 3000,
};
// due_at_km = 13000, due-soon threshold = 12500

describe('getPartStatus', () => {
  it('returns ok when far from due', () => {
    expect(getPartStatus(part, 12000)).toBe('ok');
  });

  it('returns ok when exactly at 501km before due', () => {
    expect(getPartStatus(part, 12499)).toBe('ok');
  });

  it('returns due-soon when exactly 500km before due', () => {
    expect(getPartStatus(part, 12500)).toBe('due-soon');
  });

  it('returns due-soon when within 500km of due', () => {
    expect(getPartStatus(part, 12800)).toBe('due-soon');
  });

  it('returns overdue when at due_at_km', () => {
    expect(getPartStatus(part, 13000)).toBe('overdue');
  });

  it('returns overdue when past due', () => {
    expect(getPartStatus(part, 14000)).toBe('overdue');
  });
});

describe('getKmRemaining', () => {
  it('returns positive km remaining when not yet due', () => {
    expect(getKmRemaining(part, 12000)).toBe(1000);
  });

  it('returns zero when exactly at due_at_km', () => {
    expect(getKmRemaining(part, 13000)).toBe(0);
  });

  it('returns negative when overdue', () => {
    expect(getKmRemaining(part, 13500)).toBe(-500);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/partStatus.test.ts
```

Expected: FAIL — "Cannot find module '../src/utils/partStatus'"

- [ ] **Step 3: Create src/utils/partStatus.ts**

```typescript
import { Part, PartStatus } from '@/types';

export function getPartStatus(part: Part, currentKm: number): PartStatus {
  const dueAt = part.replaced_at_km + part.interval_km;
  if (currentKm >= dueAt) return 'overdue';
  if (currentKm >= dueAt - 500) return 'due-soon';
  return 'ok';
}

export function getKmRemaining(part: Part, currentKm: number): number {
  return part.replaced_at_km + part.interval_km - currentKm;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/partStatus.test.ts
```

Expected: PASS — 9 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/partStatus.ts __tests__/partStatus.test.ts
git commit -m "feat: part status utility with tests"
```

---

## Task 4: Mileage utility + tests

**Files:**
- Create: `src/utils/mileage.ts`
- Create: `__tests__/mileage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/mileage.test.ts`:

```typescript
import { calcMileage } from '../src/utils/mileage';
import { FuelLog } from '../src/types';

function makeLog(id: number, odometer_km: number, fuel_litres: number): FuelLog {
  return { id, vehicle_id: 1, odometer_km, fuel_litres, logged_at: 0 };
}

describe('calcMileage', () => {
  it('returns no-logs status when array is empty', () => {
    const result = calcMileage([]);
    expect(result.status).toBe('no-logs');
    expect(result.lifetimeAvg).toBeNull();
    expect(result.last5Avg).toBeNull();
  });

  it('returns need-more status with only one entry', () => {
    const result = calcMileage([makeLog(1, 10000, 5)]);
    expect(result.status).toBe('need-more');
    expect(result.lifetimeAvg).toBeNull();
  });

  it('calculates lifetime avg with two entries', () => {
    // anchor at 10000, filled 5L at 10300 (drove 300km on 5L = 60 km/L)
    const logs = [makeLog(1, 10000, 0), makeLog(2, 10300, 5)];
    const result = calcMileage(logs);
    expect(result.status).toBe('calculated');
    expect(result.lifetimeAvg).toBeCloseTo(60);
  });

  it('ignores fuel of first entry in lifetime avg', () => {
    // first entry fuel should not affect calculation
    const logs = [makeLog(1, 10000, 999), makeLog(2, 10300, 5)];
    const result = calcMileage(logs);
    expect(result.lifetimeAvg).toBeCloseTo(60);
  });

  it('last5Avg uses most recent 6 entries when more than 6 exist', () => {
    // 8 entries: entries 0-7, odometer 10000-17000 in 1000km steps, 10L each
    // lifetime: 7000km / 70L = 100 km/L
    // last5: entries 2-7: 5000km / 50L = 100 km/L (same in this case)
    const logs = Array.from({ length: 8 }, (_, i) =>
      makeLog(i + 1, 10000 + i * 1000, 10)
    );
    const result = calcMileage(logs);
    expect(result.status).toBe('calculated');
    expect(result.lifetimeAvg).toBeCloseTo(100);
    expect(result.last5Avg).toBeCloseTo(100);
  });

  it('last5Avg differs from lifetimeAvg when recent fills differ', () => {
    // 7 entries: first 2 have bad mileage (100km/5L=20), last 5 have good mileage (200km/5L=40)
    // Positions: 0, 100, 200, 400, 600, 800, 1000
    const logs = [
      makeLog(1, 0, 0),     // anchor
      makeLog(2, 100, 5),   // 100km / 5L = 20
      makeLog(3, 200, 5),   // 100km / 5L = 20
      makeLog(4, 400, 5),   // 200km / 5L = 40
      makeLog(5, 600, 5),   // 200km / 5L = 40
      makeLog(6, 800, 5),   // 200km / 5L = 40
      makeLog(7, 1000, 5),  // 200km / 5L = 40
    ];
    const result = calcMileage(logs);
    // lifetime: 1000km / 30L ≈ 33.33
    expect(result.lifetimeAvg).toBeCloseTo(33.33, 1);
    // last5: entries[1..6] = 900km / 25L = 36
    expect(result.last5Avg).toBeCloseTo(36, 1);
  });

  it('sorts entries by odometer before calculating', () => {
    // Same as two-entry test but logs given out of order
    const logs = [makeLog(2, 10300, 5), makeLog(1, 10000, 0)];
    const result = calcMileage(logs);
    expect(result.lifetimeAvg).toBeCloseTo(60);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/mileage.test.ts
```

Expected: FAIL — "Cannot find module '../src/utils/mileage'"

- [ ] **Step 3: Create src/utils/mileage.ts**

```typescript
import { FuelLog } from '@/types';

export interface MileageResult {
  lifetimeAvg: number | null;
  last5Avg: number | null;
  status: 'no-logs' | 'need-more' | 'calculated';
}

export function calcMileage(logs: FuelLog[]): MileageResult {
  const sorted = [...logs].sort((a, b) => a.odometer_km - b.odometer_km);

  if (sorted.length === 0) {
    return { lifetimeAvg: null, last5Avg: null, status: 'no-logs' };
  }
  if (sorted.length === 1) {
    return { lifetimeAvg: null, last5Avg: null, status: 'need-more' };
  }

  const lifetimeAvg = calcAvg(sorted);
  // last5: take last 6 entries (covers 5 intervals), or all if fewer
  const last5Avg = calcAvg(sorted.slice(-6));

  return { lifetimeAvg, last5Avg, status: 'calculated' };
}

function calcAvg(logs: FuelLog[]): number {
  const kmDriven = logs[logs.length - 1].odometer_km - logs[0].odometer_km;
  const totalFuel = logs.slice(1).reduce((sum, l) => sum + l.fuel_litres, 0);
  if (totalFuel === 0) return 0;
  return kmDriven / totalFuel;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/mileage.test.ts
```

Expected: PASS — all tests passed.

- [ ] **Step 5: Run all tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/mileage.ts __tests__/mileage.test.ts
git commit -m "feat: mileage calculator utility with tests"
```

---

## Task 5: DB migrations

**Files:**
- Create: `src/db/migrations.ts`

- [ ] **Step 1: Create src/db/migrations.ts**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY);'
  );

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM migrations'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  if (!appliedVersions.has(1)) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        current_km REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        replaced_at_km REAL NOT NULL DEFAULT 0,
        interval_km REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fuel_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        odometer_km REAL NOT NULL,
        fuel_litres REAL NOT NULL,
        logged_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_parts_vehicle ON parts(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id, odometer_km);

      PRAGMA foreign_keys = ON;
    `);
    await db.runAsync('INSERT INTO migrations (version) VALUES (?)', 1);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations.ts
git commit -m "feat: SQLite migrations v1 schema"
```

---

## Task 6: Vehicle repository

**Files:**
- Create: `src/db/vehicles.ts`

- [ ] **Step 1: Create src/db/vehicles.ts**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { Vehicle } from '@/types';

export async function getVehicles(db: SQLiteDatabase): Promise<Vehicle[]> {
  return db.getAllAsync<Vehicle>(
    'SELECT * FROM vehicles ORDER BY name COLLATE NOCASE'
  );
}

export async function getVehicleById(
  db: SQLiteDatabase,
  id: number
): Promise<Vehicle | null> {
  return db.getFirstAsync<Vehicle>(
    'SELECT * FROM vehicles WHERE id = ?',
    id
  );
}

export async function addVehicle(
  db: SQLiteDatabase,
  name: string,
  currentKm: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO vehicles (name, current_km) VALUES (?, ?)',
    name,
    currentKm
  );
  return result.lastInsertRowId;
}

export async function updateVehicle(
  db: SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  await db.runAsync('UPDATE vehicles SET name = ? WHERE id = ?', name, id);
}

export async function updateOdometer(
  db: SQLiteDatabase,
  id: number,
  km: number
): Promise<void> {
  await db.runAsync(
    'UPDATE vehicles SET current_km = ? WHERE id = ?',
    km,
    id
  );
}

export async function deleteVehicle(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/vehicles.ts
git commit -m "feat: vehicle repository"
```

---

## Task 7: Parts repository

**Files:**
- Create: `src/db/parts.ts`

- [ ] **Step 1: Create src/db/parts.ts**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { Part } from '@/types';

export async function getPartsByVehicle(
  db: SQLiteDatabase,
  vehicleId: number
): Promise<Part[]> {
  return db.getAllAsync<Part>(
    'SELECT * FROM parts WHERE vehicle_id = ? ORDER BY name COLLATE NOCASE',
    vehicleId
  );
}

export async function addPart(
  db: SQLiteDatabase,
  vehicleId: number,
  name: string,
  replacedAtKm: number,
  intervalKm: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO parts (vehicle_id, name, replaced_at_km, interval_km) VALUES (?, ?, ?, ?)',
    vehicleId,
    name,
    replacedAtKm,
    intervalKm
  );
  return result.lastInsertRowId;
}

export async function updatePart(
  db: SQLiteDatabase,
  id: number,
  name: string,
  intervalKm: number
): Promise<void> {
  await db.runAsync(
    'UPDATE parts SET name = ?, interval_km = ? WHERE id = ?',
    name,
    intervalKm,
    id
  );
}

export async function logReplacement(
  db: SQLiteDatabase,
  partId: number,
  replacedAtKm: number
): Promise<void> {
  await db.runAsync(
    'UPDATE parts SET replaced_at_km = ? WHERE id = ?',
    replacedAtKm,
    partId
  );
}

export async function deletePart(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM parts WHERE id = ?', id);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/parts.ts
git commit -m "feat: parts repository"
```

---

## Task 8: Fuel logs repository

**Files:**
- Create: `src/db/fuelLogs.ts`

- [ ] **Step 1: Create src/db/fuelLogs.ts**

```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import { FuelLog } from '@/types';
import { calcMileage, MileageResult } from '@/utils/mileage';

export async function getFuelLogsByVehicle(
  db: SQLiteDatabase,
  vehicleId: number
): Promise<FuelLog[]> {
  return db.getAllAsync<FuelLog>(
    'SELECT * FROM fuel_logs WHERE vehicle_id = ? ORDER BY odometer_km ASC',
    vehicleId
  );
}

export async function addFuelLog(
  db: SQLiteDatabase,
  vehicleId: number,
  odometerKm: number,
  fuelLitres: number
): Promise<void> {
  await db.runAsync(
    'INSERT INTO fuel_logs (vehicle_id, odometer_km, fuel_litres, logged_at) VALUES (?, ?, ?, ?)',
    vehicleId,
    odometerKm,
    fuelLitres,
    Date.now()
  );
  // Bump vehicle odometer to latest reading if higher
  await db.runAsync(
    'UPDATE vehicles SET current_km = MAX(current_km, ?) WHERE id = ?',
    odometerKm,
    vehicleId
  );
}

export async function deleteFuelLog(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM fuel_logs WHERE id = ?', id);
}

export async function getMileageForVehicle(
  db: SQLiteDatabase,
  vehicleId: number
): Promise<MileageResult> {
  const logs = await getFuelLogsByVehicle(db, vehicleId);
  return calcMileage(logs);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/fuelLogs.ts
git commit -m "feat: fuel logs repository"
```

---

## Task 9: Reusable UI components

**Files:**
- Create: `src/components/modal-sheet.tsx`
- Create: `src/components/part-status-row.tsx`

- [ ] **Step 1: Create src/components/modal-sheet.tsx**

A reusable bottom-sheet style modal wrapper used by all modals.

```typescript
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalSheet({ visible, onClose, children }: ModalSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.dark.backgroundElement,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    paddingTop: Spacing.two,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.backgroundSelected,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
});
```

- [ ] **Step 2: Create src/components/part-status-row.tsx**

```typescript
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Part, PartStatus } from '@/types';
import { getKmRemaining, getPartStatus } from '@/utils/partStatus';
import { ThemedText } from './themed-text';

const STATUS_COLORS: Record<PartStatus, string> = {
  ok: Colors.dark.success,
  'due-soon': Colors.dark.warning,
  overdue: Colors.dark.danger,
};

interface PartStatusRowProps {
  part: Part;
  currentKm: number;
  onPress: (part: Part) => void;
}

export function PartStatusRow({ part, currentKm, onPress }: PartStatusRowProps) {
  const status = getPartStatus(part, currentKm);
  const kmRemaining = getKmRemaining(part, currentKm);
  const color = STATUS_COLORS[status];

  const label =
    status === 'overdue'
      ? `${Math.abs(Math.round(kmRemaining))} km overdue`
      : `${Math.round(kmRemaining)} km remaining`;

  return (
    <Pressable
      onPress={() => onPress(part)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <ThemedText type="default">{part.name}</ThemedText>
        <ThemedText type="small" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
  },
  pressed: {
    opacity: 0.7,
  },
  indicator: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/modal-sheet.tsx src/components/part-status-row.tsx
git commit -m "feat: ModalSheet and PartStatusRow components"
```

---

## Task 10: Vehicle and part management modals

**Files:**
- Create: `src/components/modals/add-vehicle-modal.tsx`
- Create: `src/components/modals/add-part-modal.tsx`

- [ ] **Step 1: Create src/components/modals/add-vehicle-modal.tsx**

```typescript
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { Vehicle } from '@/types';
import { addVehicle, updateVehicle } from '@/db/vehicles';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass to edit an existing vehicle */
  existing?: Vehicle;
}

export function AddVehicleModal({
  visible,
  onClose,
  onSaved,
  existing,
}: AddVehicleModalProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [kmStr, setKmStr] = useState(
    existing ? String(existing.current_km) : ''
  );

  const isEdit = !!existing;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const km = parseFloat(kmStr) || 0;

    if (isEdit) {
      await updateVehicle(db, existing.id, trimmed);
    } else {
      await addVehicle(db, trimmed, km);
    }
    onSaved();
    onClose();
    setName('');
    setKmStr('');
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Vehicle name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Honda CB150"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
        />
      </View>

      {!isEdit && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Current odometer (km)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={kmStr}
            onChangeText={setKmStr}
            placeholder="e.g. 15000"
            placeholderTextColor={Colors.dark.textSecondary}
            keyboardType="numeric"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !name.trim() && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!name.trim()}>
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? 'Save Changes' : 'Add Vehicle'}
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Create src/components/modals/add-part-modal.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { Part } from '@/types';
import { addPart, updatePart } from '@/db/parts';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface AddPartModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleId: number;
  currentKm: number;
  /** Pass to edit an existing part */
  existing?: Part;
}

export function AddPartModal({
  visible,
  onClose,
  onSaved,
  vehicleId,
  currentKm,
  existing,
}: AddPartModalProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [replacedAtStr, setReplacedAtStr] = useState('');
  const [intervalStr, setIntervalStr] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setReplacedAtStr(String(existing.replaced_at_km));
      setIntervalStr(String(existing.interval_km));
    } else {
      setName('');
      setReplacedAtStr(String(currentKm));
      setIntervalStr('');
    }
  }, [existing, visible, currentKm]);

  const isEdit = !!existing;
  const isValid = name.trim() && parseFloat(intervalStr) > 0;

  async function handleSave() {
    if (!isValid) return;
    const replacedAt = parseFloat(replacedAtStr) || 0;
    const interval = parseFloat(intervalStr);

    if (isEdit) {
      await updatePart(db, existing.id, name.trim(), interval);
    } else {
      await addPart(db, vehicleId, name.trim(), replacedAt, interval);
    }
    onSaved();
    onClose();
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? 'Edit Part' : 'Add Part'}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Part name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Engine Oil"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
        />
      </View>

      {!isEdit && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Replaced at (km)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={replacedAtStr}
            onChangeText={setReplacedAtStr}
            keyboardType="numeric"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
      )}

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Replace every (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={intervalStr}
          onChangeText={setIntervalStr}
          placeholder="e.g. 3000"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}>
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? 'Save Changes' : 'Add Part'}
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/
git commit -m "feat: add vehicle and add part modals"
```

---

## Task 11: Log replacement and log fuel modals

**Files:**
- Create: `src/components/modals/log-replacement-modal.tsx`
- Create: `src/components/modals/log-fuel-modal.tsx`

- [ ] **Step 1: Create src/components/modals/log-replacement-modal.tsx**

Used when tapping a part to record that it was replaced.

```typescript
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { Part } from '@/types';
import { logReplacement } from '@/db/parts';
import { updateOdometer } from '@/db/vehicles';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface LogReplacementModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  part: Part | null;
  vehicleId: number;
  currentKm: number;
}

export function LogReplacementModal({
  visible,
  onClose,
  onSaved,
  part,
  vehicleId,
  currentKm,
}: LogReplacementModalProps) {
  const db = useSQLiteContext();
  const [kmStr, setKmStr] = useState('');

  useEffect(() => {
    if (visible) setKmStr(String(currentKm));
  }, [visible, currentKm]);

  if (!part) return null;

  const km = parseFloat(kmStr);
  const isValid = !isNaN(km) && km >= 0;

  async function handleSave() {
    if (!isValid || !part) return;
    await logReplacement(db, part.id, km);
    // Also update vehicle odometer if this km is higher
    if (km > currentKm) {
      await updateOdometer(db, vehicleId, km);
    }
    onSaved();
    onClose();
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        Log Replacement
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.partName}>
        {part.name}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Replaced at (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={kmStr}
          onChangeText={setKmStr}
          keyboardType="numeric"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}>
        <ThemedText type="default" style={styles.buttonText}>
          Log Replacement
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.one,
  },
  partName: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Create src/components/modals/log-fuel-modal.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { addFuelLog } from '@/db/fuelLogs';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface LogFuelModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleId: number;
  currentKm: number;
}

export function LogFuelModal({
  visible,
  onClose,
  onSaved,
  vehicleId,
  currentKm,
}: LogFuelModalProps) {
  const db = useSQLiteContext();
  const [odometerStr, setOdometerStr] = useState('');
  const [litresStr, setLitresStr] = useState('');

  useEffect(() => {
    if (visible) {
      setOdometerStr(String(currentKm));
      setLitresStr('');
    }
  }, [visible, currentKm]);

  const odometer = parseFloat(odometerStr);
  const litres = parseFloat(litresStr);
  const isValid = !isNaN(odometer) && odometer >= 0 && !isNaN(litres) && litres > 0;

  async function handleSave() {
    if (!isValid) return;
    await addFuelLog(db, vehicleId, odometer, litres);
    onSaved();
    onClose();
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        Log Fill-up
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Odometer (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={odometerStr}
          onChangeText={setOdometerStr}
          keyboardType="numeric"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Fuel added (litres)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={litresStr}
          onChangeText={setLitresStr}
          placeholder="e.g. 4.5"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}>
        <ThemedText type="default" style={styles.buttonText}>
          Log Fill-up
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/log-replacement-modal.tsx src/components/modals/log-fuel-modal.tsx
git commit -m "feat: log replacement and log fuel modals"
```

---

## Task 12: FAB and Add sheet

**Files:**
- Create: `src/components/fab.tsx`
- Create: `src/components/add-sheet.tsx`

- [ ] **Step 1: Create src/components/fab.tsx**

A floating "+" button positioned above the tab bar.

```typescript
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      onPress={onPress}>
      <ThemedText style={styles.icon}>+</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.three,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '300',
  },
});
```

- [ ] **Step 2: Create src/components/add-sheet.tsx**

The quick-add bottom sheet with two action buttons. It needs a vehicle picker and then launches the appropriate modal.

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '@/constants/theme';
import { Vehicle, Part } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { ModalSheet } from './modal-sheet';
import { LogReplacementModal } from './modals/log-replacement-modal';
import { LogFuelModal } from './modals/log-fuel-modal';
import { ThemedText } from './themed-text';

type AddAction = 'replacement' | 'fuel' | null;

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddSheet({ visible, onClose, onSaved }: AddSheetProps) {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [action, setAction] = useState<AddAction>(null);

  useEffect(() => {
    if (visible) {
      getVehicles(db).then(setVehicles);
      setSelectedVehicle(null);
      setParts([]);
      setSelectedPart(null);
      setAction(null);
    }
  }, [visible, db]);

  async function handleVehicleSelect(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    const p = await getPartsByVehicle(db, vehicle.id);
    setParts(p);
  }

  function handleActionSelect(a: AddAction) {
    if (!selectedVehicle) return;
    setAction(a);
  }

  function handleSaved() {
    onSaved();
    onClose();
    setAction(null);
  }

  if (!selectedVehicle) {
    return (
      <ModalSheet visible={visible} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.title}>
          Select Vehicle
        </ThemedText>
        {vehicles.length === 0 && (
          <ThemedText themeColor="textSecondary">
            No vehicles yet. Add one from the Vehicles tab.
          </ThemedText>
        )}
        {vehicles.map(v => (
          <TouchableOpacity
            key={v.id}
            style={styles.option}
            onPress={() => handleVehicleSelect(v)}>
            <ThemedText type="default">{v.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {v.current_km.toLocaleString()} km
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ModalSheet>
    );
  }

  return (
    <>
      <ModalSheet visible={visible && action === null} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.title}>
          {selectedVehicle.name}
        </ThemedText>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleActionSelect('replacement')}>
          <ThemedText type="default">Log Part Replacement</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mark a part as replaced
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleActionSelect('fuel')}>
          <ThemedText type="default">Log Fuel Fill-up</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Record odometer and litres
          </ThemedText>
        </TouchableOpacity>
      </ModalSheet>

      {action === 'replacement' && (
        <ModalSheet visible onClose={() => setAction(null)}>
          <ThemedText type="subtitle" style={styles.title}>
            Select Part
          </ThemedText>
          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary">
              No parts for this vehicle yet.
            </ThemedText>
          )}
          {parts.map(p => (
            <TouchableOpacity
              key={p.id}
              style={styles.option}
              onPress={() => setSelectedPart(p)}>
              <ThemedText type="default">{p.name}</ThemedText>
            </TouchableOpacity>
          ))}
          <LogReplacementModal
            visible={selectedPart !== null}
            onClose={() => setSelectedPart(null)}
            onSaved={handleSaved}
            part={selectedPart}
            vehicleId={selectedVehicle.id}
            currentKm={selectedVehicle.current_km}
          />
        </ModalSheet>
      )}

      <LogFuelModal
        visible={action === 'fuel'}
        onClose={() => setAction(null)}
        onSaved={handleSaved}
        vehicleId={selectedVehicle.id}
        currentKm={selectedVehicle.current_km}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  option: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
    gap: Spacing.half,
  },
  actionButton: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
    gap: Spacing.half,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/fab.tsx src/components/add-sheet.tsx
git commit -m "feat: FAB and add-sheet components"
```

---

## Task 13: Update _layout.tsx and navigation

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/components/app-tabs.tsx`
- Modify: `src/components/app-tabs.web.tsx`
- Create: `src/app/vehicles.tsx` (placeholder, filled in Task 14)

- [ ] **Step 1: Update src/app/_layout.tsx**

Replace the entire file:

```typescript
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import React, { useState } from 'react';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDb } from '@/db/migrations';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { FAB } from '@/components/fab';
import { AddSheet } from '@/components/add-sheet';

export default function TabLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <SQLiteProvider databaseName="logleaf.db" onInit={migrateDb}>
      <ThemeProvider value={DarkTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <FAB onPress={() => setAddOpen(true)} />
        <AddSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
```

Note: `refreshKey` is incremented after a save via AddSheet so that tab screens re-fetch on next focus.

- [ ] **Step 2: Update src/components/app-tabs.tsx**

Replace the entire file:

```typescript
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const colors = Colors.dark;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.primary}
      labelStyle={{ selected: { color: colors.primary }, default: { color: colors.textSecondary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vehicles">
        <NativeTabs.Trigger.Label>Vehicles</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

- [ ] **Step 3: Update src/components/app-tabs.web.tsx**

Replace the entire file:

```typescript
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View style={styles.tabListContainer}>
          <ThemedView type="backgroundElement" style={styles.innerContainer}>
            <ThemedText type="smallBold" style={styles.brandText}>
              LogLeaf
            </ThemedText>
            <TabTrigger name="home" href="/" asChild>
              <TabButton>Home</TabButton>
            </TabTrigger>
            <TabTrigger name="vehicles" href="/vehicles" asChild>
              <TabButton>Vehicles</TabButton>
            </TabTrigger>
          </ThemedView>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText
          type="small"
          themeColor={isFocused ? 'primary' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
    color: Colors.dark.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
```

- [ ] **Step 4: Create placeholder src/app/vehicles.tsx** (will be replaced in Task 14)

```typescript
import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export default function VehiclesScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>Vehicles</ThemedText>
    </View>
  );
}
```

- [ ] **Step 5: Start the app and verify two tabs appear**

```bash
bun run start
```

Open in Expo Go or simulator. Confirm: dark background, "Home" and "Vehicles" tabs, blue FAB in bottom right.

- [ ] **Step 6: Commit**

```bash
git add src/app/_layout.tsx src/components/app-tabs.tsx src/components/app-tabs.web.tsx src/app/vehicles.tsx
git commit -m "feat: navigation with SQLiteProvider, dark theme, FAB"
```

---

## Task 14: Home screen (dashboard)

**Files:**
- Modify: `src/app/index.tsx`
- Create: `src/components/vehicle-card.tsx`

- [ ] **Step 1: Create src/components/vehicle-card.tsx**

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Part, Vehicle } from '@/types';
import { getPartStatus } from '@/utils/partStatus';
import { PartStatusRow } from './part-status-row';
import { ThemedText } from './themed-text';

interface VehicleCardProps {
  vehicle: Vehicle;
  flaggedParts: Part[];
  onPartPress: (part: Part) => void;
}

export function VehicleCard({ vehicle, flaggedParts, onPartPress }: VehicleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="default" style={styles.name}>
          {vehicle.name}
        </ThemedText>
        <View style={[styles.badge, flaggedParts.length > 0 ? styles.badgeAlert : styles.badgeOk]}>
          <ThemedText type="small" style={styles.badgeText}>
            {flaggedParts.length > 0
              ? `${flaggedParts.length} part${flaggedParts.length > 1 ? 's' : ''} due`
              : 'All good'}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {vehicle.current_km.toLocaleString()} km
      </ThemedText>
      {flaggedParts.length > 0 && (
        <View style={styles.parts}>
          {flaggedParts.map(part => (
            <PartStatusRow
              key={part.id}
              part={part}
              currentKm={vehicle.current_km}
              onPress={onPartPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
  },
  badgeAlert: {
    backgroundColor: Colors.dark.danger + '33',
  },
  badgeOk: {
    backgroundColor: Colors.dark.success + '33',
  },
  badgeText: {
    fontSize: 12,
  },
  parts: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
```

- [ ] **Step 2: Replace src/app/index.tsx**

```typescript
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Part, Vehicle } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { getPartStatus } from '@/utils/partStatus';
import { VehicleCard } from '@/components/vehicle-card';
import { ThemedText } from '@/components/themed-text';
import { LogReplacementModal } from '@/components/modals/log-replacement-modal';

interface VehicleWithFlaggedParts {
  vehicle: Vehicle;
  flaggedParts: Part[];
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [data, setData] = useState<VehicleWithFlaggedParts[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const loadData = useCallback(async () => {
    const vehicles = await getVehicles(db);
    const results = await Promise.all(
      vehicles.map(async vehicle => {
        const parts = await getPartsByVehicle(db, vehicle.id);
        const flaggedParts = parts.filter(
          p => getPartStatus(p, vehicle.current_km) !== 'ok'
        );
        return { vehicle, flaggedParts };
      })
    );
    setData(results);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hasFlags = data.some(d => d.flaggedParts.length > 0);

  function handlePartPress(part: Part, vehicle: Vehicle) {
    setSelectedPart(part);
    setSelectedVehicle(vehicle);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}>
        <SafeAreaView edges={['top']}>
          <ThemedText type="subtitle" style={styles.heading}>
            Maintenance
          </ThemedText>
        </SafeAreaView>

        {data.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet.{'\n'}Add one from the Vehicles tab.
            </ThemedText>
          </View>
        )}

        {!hasFlags && data.length > 0 && (
          <View style={styles.allGood}>
            <ThemedText style={styles.allGoodIcon}>✓</ThemedText>
            <ThemedText type="default">All parts are up to date</ThemedText>
          </View>
        )}

        {data
          .filter(d => d.flaggedParts.length > 0)
          .map(({ vehicle, flaggedParts }) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              flaggedParts={flaggedParts}
              onPartPress={part => handlePartPress(part, vehicle)}
            />
          ))}
      </ScrollView>

      {selectedPart && selectedVehicle && (
        <LogReplacementModal
          visible
          onClose={() => { setSelectedPart(null); setSelectedVehicle(null); }}
          onSaved={() => { loadData(); setSelectedPart(null); setSelectedVehicle(null); }}
          part={selectedPart}
          vehicleId={selectedVehicle.id}
          currentKm={selectedVehicle.current_km}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  heading: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  allGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  allGoodIcon: {
    color: Colors.dark.success,
    fontSize: 20,
  },
});
```

- [ ] **Step 3: Test in the running app**

Navigate to the Home tab. Expected: "No vehicles yet. Add one from the Vehicles tab." empty state on dark background.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx src/components/vehicle-card.tsx
git commit -m "feat: home dashboard screen"
```

---

## Task 15: Vehicles list and vehicle detail screens

**Files:**
- Modify: `src/app/vehicles.tsx`
- Create: `src/app/vehicles/[id].tsx`

- [ ] **Step 1: Replace src/app/vehicles.tsx**

```typescript
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Vehicle } from '@/types';
import { getVehicles, deleteVehicle } from '@/db/vehicles';
import { ThemedText } from '@/components/themed-text';
import { AddVehicleModal } from '@/components/modals/add-vehicle-modal';

export default function VehiclesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    setVehicles(await getVehicles(db));
  }, [db]);

  useFocusEffect(useCallback(() => { loadVehicles(); }, [loadVehicles]));

  function handleLongPress(vehicle: Vehicle) {
    Alert.alert(
      vehicle.name,
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => setEditVehicle(vehicle) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Delete Vehicle',
              `Delete "${vehicle.name}" and all its data?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteVehicle(db, vehicle.id);
                    loadVehicles();
                  },
                },
              ]
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Vehicles</ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddModalOpen(true)}>
              <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {vehicles.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet.{'\n'}Tap "+ Add" to get started.
            </ThemedText>
          </View>
        )}

        {vehicles.map(vehicle => (
          <Pressable
            key={vehicle.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/vehicles/${vehicle.id}`)}
            onLongPress={() => handleLongPress(vehicle)}>
            <ThemedText type="default" style={styles.vehicleName}>
              {vehicle.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {vehicle.current_km.toLocaleString()} km
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <AddVehicleModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={loadVehicles}
      />

      {editVehicle && (
        <AddVehicleModal
          visible
          onClose={() => setEditVehicle(null)}
          onSaved={() => { loadVehicles(); setEditVehicle(null); }}
          existing={editVehicle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  vehicleName: {
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Create src/app/vehicles/[id].tsx**

```typescript
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { FuelLog, Part, Vehicle } from '@/types';
import { getVehicleById, updateOdometer } from '@/db/vehicles';
import { getPartsByVehicle, deletePart } from '@/db/parts';
import { getFuelLogsByVehicle, deleteFuelLog, getMileageForVehicle } from '@/db/fuelLogs';
import { MileageResult } from '@/utils/mileage';
import { PartStatusRow } from '@/components/part-status-row';
import { ThemedText } from '@/components/themed-text';
import { AddPartModal } from '@/components/modals/add-part-modal';
import { LogReplacementModal } from '@/components/modals/log-replacement-modal';
import { LogFuelModal } from '@/components/modals/log-fuel-modal';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [mileage, setMileage] = useState<MileageResult | null>(null);
  const [odometerInput, setOdometerInput] = useState('');
  const [editingOdometer, setEditingOdometer] = useState(false);

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [replacePart, setReplacePart] = useState<Part | null>(null);
  const [logFuelOpen, setLogFuelOpen] = useState(false);

  const vehicleId = parseInt(id, 10);

  const loadData = useCallback(async () => {
    const [v, p, f, m] = await Promise.all([
      getVehicleById(db, vehicleId),
      getPartsByVehicle(db, vehicleId),
      getFuelLogsByVehicle(db, vehicleId),
      getMileageForVehicle(db, vehicleId),
    ]);
    if (!v) { router.back(); return; }
    setVehicle(v);
    setParts(p);
    setFuelLogs(f);
    setMileage(m);
    setOdometerInput(String(v.current_km));
  }, [db, vehicleId, router]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (!vehicle) return null;

  async function handleOdometerSave() {
    const km = parseFloat(odometerInput);
    if (isNaN(km) || km < 0 || !vehicle) return;
    await updateOdometer(db, vehicle.id, km);
    setEditingOdometer(false);
    loadData();
  }

  function handlePartLongPress(part: Part) {
    Alert.alert(part.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => setEditPart(part) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Part', `Delete "${part.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => { await deletePart(db, part.id); loadData(); },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleFuelLogLongPress(log: FuelLog) {
    Alert.alert('Delete Entry', 'Remove this fuel log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await deleteFuelLog(db, log.id); loadData(); },
      },
    ]);
  }

  const mileageLabel = () => {
    if (!mileage) return null;
    if (mileage.status === 'no-logs') return 'No fill-ups logged yet';
    if (mileage.status === 'need-more') return 'Log one more fill-up to see mileage';
    return null;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.six }]}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText themeColor="primary">← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.vehicleName}>
            {vehicle.name}
          </ThemedText>
        </SafeAreaView>

        {/* ── Parts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Parts
            </ThemedText>
            <TouchableOpacity onPress={() => setAddPartOpen(true)}>
              <ThemedText themeColor="primary">+ Add</ThemedText>
            </TouchableOpacity>
          </View>

          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary">No parts tracked yet.</ThemedText>
          )}
          {parts.map(part => (
            <TouchableOpacity
              key={part.id}
              onLongPress={() => handlePartLongPress(part)}
              activeOpacity={1}>
              <PartStatusRow
                part={part}
                currentKm={vehicle.current_km}
                onPress={p => setReplacePart(p)}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Odometer ── */}
        <View style={styles.section}>
          <ThemedText type="default" style={styles.sectionTitle}>
            Odometer
          </ThemedText>

          {editingOdometer ? (
            <View style={styles.odometerEdit}>
              <TextInput
                style={styles.odometerInput}
                value={odometerInput}
                onChangeText={setOdometerInput}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleOdometerSave}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingOdometer(false)}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.odometerRow}>
              <ThemedText type="default">
                {vehicle.current_km.toLocaleString()} km
              </ThemedText>
              <TouchableOpacity onPress={() => setEditingOdometer(true)}>
                <ThemedText themeColor="primary">Update</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.fuelHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Fuel log
            </ThemedText>
            <TouchableOpacity onPress={() => setLogFuelOpen(true)}>
              <ThemedText themeColor="primary" style={styles.smallLink}>
                + Add fill-up
              </ThemedText>
            </TouchableOpacity>
          </View>

          {fuelLogs.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No fuel entries yet.
            </ThemedText>
          )}
          {[...fuelLogs].reverse().map(log => (
            <TouchableOpacity
              key={log.id}
              onLongPress={() => handleFuelLogLongPress(log)}
              style={styles.fuelRow}>
              <ThemedText type="small">
                {log.odometer_km.toLocaleString()} km
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {log.fuel_litres} L
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(log.logged_at).toLocaleDateString()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Mileage ── */}
        <View style={styles.section}>
          <ThemedText type="default" style={styles.sectionTitle}>
            Mileage
          </ThemedText>

          {mileageLabel() ? (
            <ThemedText themeColor="textSecondary">{mileageLabel()}</ThemedText>
          ) : (
            <View style={styles.mileageCards}>
              <View style={styles.mileageCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Lifetime avg
                </ThemedText>
                <ThemedText type="subtitle">
                  {mileage?.lifetimeAvg?.toFixed(1)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km/L
                </ThemedText>
              </View>
              <View style={styles.mileageCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Last 5 fills
                </ThemedText>
                <ThemedText type="subtitle">
                  {mileage?.last5Avg?.toFixed(1)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km/L
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <AddPartModal
        visible={addPartOpen}
        onClose={() => setAddPartOpen(false)}
        onSaved={loadData}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />

      {editPart && (
        <AddPartModal
          visible
          onClose={() => setEditPart(null)}
          onSaved={() => { loadData(); setEditPart(null); }}
          vehicleId={vehicle.id}
          currentKm={vehicle.current_km}
          existing={editPart}
        />
      )}

      <LogReplacementModal
        visible={replacePart !== null}
        onClose={() => setReplacePart(null)}
        onSaved={() => { loadData(); setReplacePart(null); }}
        part={replacePart}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />

      <LogFuelModal
        visible={logFuelOpen}
        onClose={() => setLogFuelOpen(false)}
        onSaved={loadData}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  backButton: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  vehicleName: {
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  odometerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
  },
  odometerEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  odometerInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    color: Colors.dark.text,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fuelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  smallLink: {
    fontSize: 13,
  },
  fuelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
  },
  mileageCards: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  mileageCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
```

- [ ] **Step 3: Test the full flow in the app**

1. Open Vehicles tab → tap "+ Add" → add a vehicle (e.g. "Honda CB150", 15000 km)
2. Tap the vehicle → vehicle detail screen opens
3. Add a part (e.g. "Engine Oil", replaced at 12000, every 3000 km → due at 15000, should show overdue)
4. Tap the overdue part row → log replacement modal opens → save
5. Add a fuel fill-up → add another → Mileage section should show km/L
6. Go to Home tab → the vehicle card should show flagged parts (if any)
7. Long press a part in detail → edit and delete options appear

- [ ] **Step 4: Delete the old explore.tsx**

```bash
cd D:/Dev/LogLeaf && git rm src/app/explore.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/app/vehicles.tsx src/app/vehicles/
git commit -m "feat: vehicles list and vehicle detail screens"
```

---

## Task 16: Final cleanup and update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect new architecture**

Add a "Data Layer" section to `CLAUDE.md` covering the DB setup, and update the architecture section to reflect the actual screens.

The key points to add:
- `src/db/migrations.ts` — runs on app start via `SQLiteProvider onInit`
- `src/db/{vehicles,parts,fuelLogs}.ts` — plain async functions taking `SQLiteDatabase`
- `src/utils/{partStatus,mileage}.ts` — pure functions (tested)
- `useFocusEffect` for data refresh on all list screens
- Dark-only theme (no light mode), tokens in `src/constants/theme.ts`

- [ ] **Step 2: Run all tests one final time**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 3: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with final architecture"
```
