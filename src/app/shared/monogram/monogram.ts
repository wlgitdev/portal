import { Component, computed, input } from '@angular/core';

export interface MonogramCustomer {
  id: string;
  companyName: string;
}

// Four Harbour darks, each >= 7:1 contrast with white (design Revision 3).
const PALETTE = ['#1f3a5f', '#2f5d3a', '#6e2233', '#2b5d54'];

const DIMENSIONS: Record<28 | 32 | 48, { radius: number; font: number }> = {
  28: { radius: 7, font: 13 },
  32: { radius: 8, font: 15 },
  48: { radius: 12, font: 22 },
};

function initialsFor(companyName: string): string {
  const words = companyName.split(/\s+/).filter((word) => /[a-zA-Z]/.test(word));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 2)
    .toUpperCase();
}

function fillFor(id: string): string {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return PALETTE[sum % PALETTE.length];
}

// Identity, at a glance: a stable colour and initials per customer, so the
// same company always looks the same across the account trigger, the
// switcher menu and its own header (design Revision 3, spec P7 R9).
@Component({
  selector: 'app-monogram',
  templateUrl: './monogram.html',
  styleUrl: './monogram.css',
})
export class Monogram {
  readonly customer = input.required<MonogramCustomer>();
  readonly size = input<28 | 32 | 48>(32);

  protected readonly initials = computed(() => initialsFor(this.customer().companyName));
  protected readonly fill = computed(() => fillFor(this.customer().id));
  protected readonly dimensions = computed(() => DIMENSIONS[this.size()]);
}
