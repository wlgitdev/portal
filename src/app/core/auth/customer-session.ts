import { Injectable, signal } from '@angular/core';

const ID_KEY = 'portal-lite.customerId';
const NAME_KEY = 'portal-lite.companyName';

export interface SignedInCustomer {
  id: string;
  companyName: string;
}

// Demo sign-in only: which customer is "you" for this browser tab. Reversed
// for real auth (JWT) if the demo is won — see docs/plans/portal-lite-design.md.
@Injectable({ providedIn: 'root' })
export class CustomerSession {
  private readonly customerIdSignal = signal<string | null>(sessionStorage.getItem(ID_KEY));
  private readonly companyNameSignal = signal<string | null>(sessionStorage.getItem(NAME_KEY));
  readonly customerId = this.customerIdSignal.asReadonly();
  readonly companyName = this.companyNameSignal.asReadonly();

  signIn(customer: SignedInCustomer): void {
    sessionStorage.setItem(ID_KEY, customer.id);
    sessionStorage.setItem(NAME_KEY, customer.companyName);
    this.customerIdSignal.set(customer.id);
    this.companyNameSignal.set(customer.companyName);
  }

  signOut(): void {
    sessionStorage.removeItem(ID_KEY);
    sessionStorage.removeItem(NAME_KEY);
    this.customerIdSignal.set(null);
    this.companyNameSignal.set(null);
  }

  switchTo(customer: SignedInCustomer): void {
    this.signOut();
    this.signIn(customer);
  }
}
