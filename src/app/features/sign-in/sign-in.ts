import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerSession } from '../../core/auth/customer-session';
import { FEATURED } from '../../core/auth/featured-customers';
import { VoyageLine } from '../../shared/voyage-line/voyage-line';
import type { CustomerSummary } from '../../core/api/models';

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

  protected chooseCustomer(customer: { id: string; companyName: string }): void {
    this.session.signIn(customer);
    this.router.navigateByUrl('/orders');
  }
}
