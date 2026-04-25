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
