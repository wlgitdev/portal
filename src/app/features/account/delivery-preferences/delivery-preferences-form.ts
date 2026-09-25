import { FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import type { DeliveryPreferences, InvoiceFormat, SiteMap, Unloading } from '../../../core/api/models';

export const DAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

export const UNLOADING_OPTIONS: ReadonlyArray<{ value: Unloading; label: string }> = [
  { value: 'dock', label: 'Loading dock' },
  { value: 'tail-lift', label: 'Tail-lift needed' },
  { value: 'by-hand', label: 'By hand' },
];
const SUMMARY_UNLOADING: Record<Unloading, string> = { dock: 'dock', 'tail-lift': 'tail-lift', 'by-hand': 'by hand' };

export const INVOICE_FORMAT_OPTIONS: ReadonlyArray<{ value: InvoiceFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'paper', label: 'Paper' },
  { value: 'both', label: 'Both' },
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_NOTIFY_EMAILS = 5;
export const MAX_STANDING_PRODUCTS = 10;
export const MAX_SITE_MAP_BYTES = 2 * 1024 * 1024;
export const SITE_MAP_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

// Copy pinned by showcase-2-spec.md S8 "errors"; kept word for word so the
// client and server (DeliveryPreferencesEndpoints.Validate) never drift.
export const ERROR_MESSAGES = {
  noDays: 'Pick at least one delivery day',
  windowTooShort: 'End the window at least 2 hours after it starts',
  tempRange: 'Enter a temperature from −25 to 8 °C',
  closedOrder: 'End the closure on or after its first day',
  closedPast: 'Start the closure today or later',
  email: 'Enter an email address like name@example.com',
  fileType: 'Choose a PNG, JPG or PDF',
  fileSize: 'Choose a file under 2 MB',
} as const;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesSinceMidnight(time: string): number | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function windowRangeValidator(from: FormControl<string>): ValidatorFn {
  return (to) => {
    const fromMinutes = minutesSinceMidnight(from.value);
    const toMinutes = minutesSinceMidnight(to.value as string);
    if (fromMinutes === null || toMinutes === null) return null;
    return toMinutes - fromMinutes >= 120 ? null : { windowTooShort: true };
  };
}

function tempRangeValidator(chilled: FormControl<boolean>): ValidatorFn {
  return (control) => {
    if (!chilled.value) return null;
    const value = control.value as number | null;
    return value === null || value < -25 || value > 8 ? { tempRange: true } : null;
  };
}

function noDaysValidator(): ValidatorFn {
  return (control) =>
    (control as FormArray<FormControl<boolean>>).controls.some((day) => day.value) ? null : { noDays: true };
}

function closedRangeValidator(): ValidatorFn {
  return (group) => {
    const from = (group.get('closedFrom')?.value as Date | null) ?? null;
    const to = (group.get('closedTo')?.value as Date | null) ?? null;
    if (from && from < startOfToday()) return { closedPast: true };
    if (from && to && to < from) return { closedOrder: true };
    return null;
  };
}

export interface DeliveryPreferencesControls {
  shipperId: FormControl<number | null>;
  deliveryDays: FormArray<FormControl<boolean>>;
  windowFrom: FormControl<string>;
  windowTo: FormControl<string>;
  unloading: FormControl<Unloading | null>;
  maxPallets: FormControl<number>;
  chilled: FormControl<boolean>;
  maxTempC: FormControl<number | null>;
  closedRange: FormGroup<{ closedFrom: FormControl<Date | null>; closedTo: FormControl<Date | null> }>;
  notifyEmails: FormControl<string[]>;
  standingProductIds: FormControl<number[]>;
  invoiceFormat: FormControl<InvoiceFormat | null>;
  instructions: FormControl<string>;
  siteMap: FormControl<SiteMap | null>;
}

export type DeliveryPreferencesFormGroup = FormGroup<DeliveryPreferencesControls>;

// Cross-field rules (window length, chilled<->temperature, closed-range order)
// live here, wired once at build time, so the component only reads validity —
// it never re-implements these rules.
export function buildDeliveryPreferencesForm(): DeliveryPreferencesFormGroup {
  const windowFrom = new FormControl('08:00', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(TIME_PATTERN)],
  });
  const windowTo = new FormControl('17:00', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(TIME_PATTERN), windowRangeValidator(windowFrom)],
  });
  windowFrom.valueChanges.subscribe(() => windowTo.updateValueAndValidity({ emitEvent: false }));

  const chilled = new FormControl(false, { nonNullable: true });
  const maxTempC = new FormControl<number | null>(null, { validators: tempRangeValidator(chilled) });
  chilled.valueChanges.subscribe((isChilled) => {
    if (!isChilled) maxTempC.setValue(null);
    maxTempC.updateValueAndValidity({ emitEvent: false });
  });

  const closedFrom = new FormControl<Date | null>(null);
  const closedTo = new FormControl<Date | null>(null);
  const closedRange = new FormGroup({ closedFrom, closedTo }, { validators: closedRangeValidator() });
  closedFrom.valueChanges.subscribe(() => closedRange.updateValueAndValidity({ emitEvent: false }));
  closedTo.valueChanges.subscribe(() => closedRange.updateValueAndValidity({ emitEvent: false }));

  return new FormGroup<DeliveryPreferencesControls>({
    shipperId: new FormControl<number | null>(null, { validators: Validators.required }),
    deliveryDays: new FormArray(
      DAY_OPTIONS.map((day) => new FormControl(DEFAULT_DAYS.includes(day.value), { nonNullable: true })),
      { validators: noDaysValidator() },
    ),
    windowFrom,
    windowTo,
    unloading: new FormControl<Unloading | null>('dock', { validators: Validators.required }),
    maxPallets: new FormControl(6, { nonNullable: true, validators: [Validators.min(1), Validators.max(26)] }),
    chilled,
    maxTempC,
    closedRange,
    notifyEmails: new FormControl<string[]>([], { nonNullable: true }),
    standingProductIds: new FormControl<number[]>([], { nonNullable: true }),
    invoiceFormat: new FormControl<InvoiceFormat | null>('pdf', { validators: Validators.required }),
    instructions: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    siteMap: new FormControl<SiteMap | null>(null),
  });
}

export function patchForm(form: DeliveryPreferencesFormGroup, api: DeliveryPreferences): void {
  const c = form.controls;
  c.shipperId.setValue(api.shipperId);
  c.deliveryDays.controls.forEach((control, index) => control.setValue(api.deliveryDays.includes(DAY_OPTIONS[index].value)));
  c.windowFrom.setValue(api.windowFrom);
  c.windowTo.setValue(api.windowTo);
  c.unloading.setValue(api.unloading);
  c.maxPallets.setValue(api.maxPallets);
  c.chilled.setValue(api.chilled);
  c.maxTempC.setValue(api.maxTempC);
  c.closedRange.controls.closedFrom.setValue(api.closedFrom ? isoToDate(api.closedFrom) : null);
  c.closedRange.controls.closedTo.setValue(api.closedTo ? isoToDate(api.closedTo) : null);
  c.notifyEmails.setValue(api.notifyEmails);
  c.standingProductIds.setValue(api.standingProductIds);
  c.invoiceFormat.setValue(api.invoiceFormat);
  c.instructions.setValue(api.instructions);
  c.siteMap.setValue(api.siteMap);
  form.markAsPristine();
}

export function toApi(form: DeliveryPreferencesFormGroup): DeliveryPreferences {
  const value = form.getRawValue();
  return {
    shipperId: value.shipperId,
    deliveryDays: DAY_OPTIONS.filter((_, index) => value.deliveryDays[index]).map((day) => day.value),
    windowFrom: value.windowFrom,
    windowTo: value.windowTo,
    unloading: value.unloading ?? 'dock',
    maxPallets: value.maxPallets,
    chilled: value.chilled,
    maxTempC: value.maxTempC,
    closedFrom: value.closedRange.closedFrom ? dateToIso(value.closedRange.closedFrom) : null,
    closedTo: value.closedRange.closedTo ? dateToIso(value.closedRange.closedTo) : null,
    notifyEmails: value.notifyEmails,
    standingProductIds: value.standingProductIds,
    invoiceFormat: value.invoiceFormat ?? 'pdf',
    instructions: value.instructions,
    siteMap: value.siteMap,
  };
}

export interface SummaryClause {
  text: string;
  invalid: boolean;
}

// Live, plain-English echo of the form for the summary card (design "Account
// -> Delivery preferences"). An invalid field renders as its own clause
// reading "<field> needs fixing" instead of echoing the (possibly nonsense)
// value back as if it were accepted.
export function summaryClauses(form: DeliveryPreferencesFormGroup, shipperName: string | null): SummaryClause[] {
  const c = form.controls;
  const clauses: SummaryClause[] = [];

  clauses.push({ text: c.shipperId.invalid ? 'carrier needs fixing' : (shipperName ?? 'no carrier chosen'), invalid: c.shipperId.invalid });

  const daysInvalid = c.deliveryDays.invalid;
  const windowInvalid = c.windowFrom.invalid || c.windowTo.invalid;
  const daysText = formatDays(c.deliveryDays);
  const windowText =
    windowInvalid || !c.windowFrom.value || !c.windowTo.value
      ? 'delivery window needs fixing'
      : `${c.windowFrom.value}–${c.windowTo.value}`;
  clauses.push({ text: `${daysText} ${windowText}`, invalid: daysInvalid || windowInvalid });

  clauses.push({
    text: c.unloading.invalid || !c.unloading.value ? 'unloading needs fixing' : SUMMARY_UNLOADING[c.unloading.value],
    invalid: c.unloading.invalid,
  });
  clauses.push({ text: `up to ${c.maxPallets.value} pallets`, invalid: c.maxPallets.invalid });

  if (c.chilled.value) {
    clauses.push({
      text: c.maxTempC.invalid ? 'chilled temperature needs fixing' : `chilled at ${c.maxTempC.value} °C or below`,
      invalid: c.maxTempC.invalid,
    });
  }

  const closedFrom = c.closedRange.controls.closedFrom.value;
  const closedTo = c.closedRange.controls.closedTo.value;
  if (closedFrom || closedTo) {
    clauses.push({
      text: c.closedRange.invalid || !closedFrom || !closedTo
        ? 'closure needs fixing'
        : `closed ${shortDate(closedFrom)}–${shortDate(closedTo)}`,
      invalid: c.closedRange.invalid,
    });
  }

  return clauses;
}

function formatDays(array: FormArray<FormControl<boolean>>): string {
  const selected = DAY_OPTIONS.filter((_, index) => array.controls[index].value);
  if (selected.length === 0) return 'no days';
  const values = selected.map((day) => day.value);
  const isContiguous = values.every((value, index) => index === 0 || value === values[index - 1] + 1);
  if (isContiguous && selected.length > 1) {
    return `${selected[0].label}–${selected[selected.length - 1].label}`;
  }
  return selected.map((day) => day.label).join(', ');
}
