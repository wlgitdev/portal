import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'developer-details';

// Global, off by default, remembered in this browser (design "Developer
// details"): grids, and later the delivery-preferences form and workspace,
// show a live-state panel when this is on.
@Injectable({ providedIn: 'root' })
export class DeveloperDetails {
  readonly enabled = signal(localStorage.getItem(STORAGE_KEY) === 'true');

  toggle(): void {
    const next = !this.enabled();
    this.enabled.set(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }
}
