import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { unsavedChangesGuard } from './core/routing/unsaved-changes.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  {
    path: 'sign-in',
    loadComponent: () => import('./features/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: '',
    loadComponent: () => import('./shell/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./features/overview/overview').then((m) => m.Overview),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'spend',
        loadComponent: () => import('./features/spend/spend').then((m) => m.Spend),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule').then((m) => m.Schedule),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
];
