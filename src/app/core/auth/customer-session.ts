import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'portal-lite.customerId';

// Demo sign-in only: which customer is "you" for this browser tab. Reversed
// for real auth (JWT) if the demo is won — see docs/plans/portal-lite-design.md.
@Injectable({ providedIn: 'root' })
export class CustomerSession {
  private readonly customerIdSignal = signal<string | null>(sessionStorage.getItem(STORAGE_KEY));
  readonly customerId = this.customerIdSignal.asReadonly();

  signIn(customerId: string): void {
    sessionStorage.setItem(STORAGE_KEY, customerId);
    this.customerIdSignal.set(customerId);
  }
}
