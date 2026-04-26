import { calcMileage } from '../src/utils/mileage';
import { FuelLog } from '../src/types';

function makeLog(
  id: number,
  odometer_km: number,
  fuel_litres: number,
  is_full_tank: number = 1
): FuelLog {
  return { id, vehicle_id: 1, odometer_km, fuel_litres, is_full_tank, logged_at: 0 };
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

  describe('precise mode (2+ full-tank entries)', () => {
    it('calculates exact mileage between two full tanks', () => {
      const logs = [makeLog(1, 10000, 5, 1), makeLog(2, 10300, 5, 1)];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(60); // 300km / 5L
    });

    it('includes partial fills between full-tank anchors', () => {
      const logs = [
        makeLog(1, 10000, 5, 1),
        makeLog(2, 10100, 3, 0),
        makeLog(3, 10200, 4, 1),
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(200 / 7);
    });

    it('uses only full-tank anchors for last5Avg in precise mode', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        makeLog(i + 1, 10000 + i * 100, 5, 1)
      );
      const result = calcMileage(logs);
      expect(result.status).toBe('precise');
      expect(result.lifetimeAvg).toBeCloseTo(20);
      expect(result.last5Avg).toBeCloseTo(20);
    });

    it('falls back to estimated mode when only one full-tank entry exists', () => {
      const logs = [
        makeLog(1, 10000, 5, 1),
        makeLog(2, 10300, 5, 0),
      ];
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });
  });

  describe('estimated mode (fewer than 2 full-tank entries)', () => {
    it('calculates lifetime avg with two non-full entries', () => {
      const logs = [makeLog(1, 10000, 0, 0), makeLog(2, 10300, 5, 0)];
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });

    it('ignores fuel of first entry in lifetime avg', () => {
      const logs = [makeLog(1, 10000, 999, 0), makeLog(2, 10300, 5, 0)];
      const result = calcMileage(logs);
      expect(result.lifetimeAvg).toBeCloseTo(60);
    });

    it('last5Avg uses most recent 6 entries', () => {
      const logs = Array.from({ length: 8 }, (_, i) =>
        makeLog(i + 1, 10000 + i * 1000, 10, 0)
      );
      const result = calcMileage(logs);
      expect(result.status).toBe('estimated');
      expect(result.lifetimeAvg).toBeCloseTo(100);
      expect(result.last5Avg).toBeCloseTo(100);
    });
  });

  it('sorts entries by odometer before calculating', () => {
    const logs = [makeLog(2, 10300, 5, 1), makeLog(1, 10000, 5, 1)];
    const result = calcMileage(logs);
    expect(result.status).toBe('precise');
    expect(result.lifetimeAvg).toBeCloseTo(60);
  });
});
