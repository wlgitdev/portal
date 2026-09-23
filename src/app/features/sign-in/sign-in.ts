import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerSession } from '../../core/auth/customer-session';
import { VoyageLine } from '../../shared/voyage-line/voyage-line';
import type { CustomerSummary } from '../../core/api/models';

interface FeaturedCustomer {
  testId: string;
  id: string;
  companyName: string;
  blurb: string;
}

// Curated, not queried: these three exist specifically to open the demo on
// a customer with orders on the water, a large account, and — since real
// Northwind data has no Late orders for Alfreds — a customer who does.
const FEATURED: FeaturedCustomer[] = [
  {
    testId: 'customer-card-ALFKI',
    id: 'ALFKI',
    companyName: 'Alfreds Futterkiste',
    blurb: 'Berlin, Germany',
  },
  {
    testId: 'customer-card-SAVEA',
    id: 'SAVEA',
    companyName: 'Save-a-lot Markets',
    blurb: 'Boise, USA',
  },
  {
    testId: 'customer-card-late-orders',
    id: 'ERNSH',
    companyName: 'Ernst Handel',
    blurb: 'Has an order running late',
  },
];

@Component({
  selector: 'app-sign-in',
  imports: [FormsModule, VoyageLine],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly session = inject(CustomerSession);
  private readonly router = inject(Router);

  protected readonly featured = FEATURED;
  protected readonly search = signal('');

  private readonly results = httpResource<CustomerSummary[]>(() => {
    const term = this.search().trim();
    return term ? `/api/customers?search=${encodeURIComponent(term)}` : undefined;
  });
  protected readonly searchResults = computed(() => this.results.value() ?? []);
  protected readonly searchLoading = this.results.isLoading;

  protected chooseCustomer(customerId: string): void {
    this.session.signIn(customerId);
    this.router.navigateByUrl('/orders');
  }
}
