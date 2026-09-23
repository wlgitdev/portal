import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { CustomerSession } from './customer-session';

export const authGuard: CanActivateFn = () => {
  const session = inject(CustomerSession);
  return session.customerId() !== null || inject(Router).parseUrl('/sign-in');
};
