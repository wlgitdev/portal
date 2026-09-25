import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const UK_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

// why-not-the-obvious-way: provideNativeDateAdapter() alone isn't enough —
// NativeDateAdapter.parse() ignores both its parseFormat argument and the
// injected MAT_DATE_LOCALE, and just calls the JS engine's own Date.parse(),
// which reads an ambiguous "01/10/2026" as US MM/DD/YYYY regardless of
// locale. Its format()/display side IS locale-aware (Intl.DateTimeFormat),
// so only parsing typed text needs overriding.
@Injectable()
export class UkDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value !== 'string') return super.parse(value);
    const match = UK_DATE.exec(value.trim());
    if (!match) return super.parse(value);
    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return this.isValid(date) ? date : this.invalid();
  }
}
