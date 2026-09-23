import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error) => {
      if (error.status !== 401 && error.status !== 404) {
        snackBar.open('Something went wrong reaching the server.', 'Dismiss', { duration: 5000 });
      }
      return throwError(() => error);
    }),
  );
};
