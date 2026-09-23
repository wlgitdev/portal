import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CustomerSession } from '../auth/customer-session';

// Identity: every /api call except /api/customers carries this header;
// scoping on the server comes only from it, never from body or route.
export const demoCustomerInterceptor: HttpInterceptorFn = (req, next) => {
  const customerId = inject(CustomerSession).customerId();
  const needsHeader = req.url.startsWith('/api/') && !req.url.startsWith('/api/customers');

  if (!customerId || !needsHeader) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Demo-Customer': customerId } }));
};
