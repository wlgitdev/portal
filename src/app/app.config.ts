import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { demoCustomerInterceptor } from './core/api/demo-customer.interceptor';
import { errorInterceptor } from './core/api/error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([demoCustomerInterceptor, errorInterceptor])),
    // en-GB: 24h times (delivery window) and DD/MM/YYYY dates (closed-for-delivery
    // range), matching every other date in the app — see showcase-2-spec S8.
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    provideNativeDateAdapter(),
  ],
};
