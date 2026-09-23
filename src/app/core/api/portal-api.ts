import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CustomerSummary } from './models';

@Injectable({ providedIn: 'root' })
export class PortalApi {
  private readonly http = inject(HttpClient);

  searchCustomers(search: string): Observable<CustomerSummary[]> {
    return this.http.get<CustomerSummary[]>('/api/customers', { params: { search } });
  }
}
