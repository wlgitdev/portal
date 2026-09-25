import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CustomerProfile, CustomerSummary, DeliveryPreferences } from './models';

@Injectable({ providedIn: 'root' })
export class PortalApi {
  private readonly http = inject(HttpClient);

  searchCustomers(search: string): Observable<CustomerSummary[]> {
    return this.http.get<CustomerSummary[]>('/api/customers', { params: { search } });
  }

  updateMe(profile: CustomerProfile): Observable<CustomerProfile> {
    return this.http.put<CustomerProfile>('/api/me', profile);
  }

  updateDeliveryPreferences(preferences: DeliveryPreferences): Observable<DeliveryPreferences> {
    return this.http.put<DeliveryPreferences>('/api/me/delivery-preferences', preferences);
  }
}
