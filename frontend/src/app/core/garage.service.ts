import { Injectable, signal } from '@angular/core';

export interface GarageVehicle {
  make: string;
  model: string;
  year?: number;
}

const KEY = 'ferraille.garage';

@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly current = signal<GarageVehicle | null>(read());

  readonly vehicle = this.current.asReadonly();

  set(vehicle: GarageVehicle | null): void {
    if (vehicle) {
      localStorage.setItem(KEY, JSON.stringify(vehicle));
    } else {
      localStorage.removeItem(KEY);
    }
    this.current.set(vehicle);
  }

  label(vehicle: GarageVehicle | null = this.current()): string {
    if (!vehicle) {
      return '';
    }
    return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ');
  }
}

function read(): GarageVehicle | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GarageVehicle) : null;
  } catch {
    return null;
  }
}
