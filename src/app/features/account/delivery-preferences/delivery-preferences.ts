import { httpResource } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, type MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { firstValueFrom, merge, startWith } from 'rxjs';
import { DeveloperDetails } from '../../../core/developer-details';
import { PortalApi } from '../../../core/api/portal-api';
import type {
  DeliveryPreferences as DeliveryPreferencesDto,
  InvoiceFormat,
  Product,
  Shipper,
  Unloading,
} from '../../../core/api/models';
import {
  DAY_OPTIONS,
  ERROR_MESSAGES,
  EMAIL_PATTERN,
  INVOICE_FORMAT_OPTIONS,
  MAX_NOTIFY_EMAILS,
  MAX_SITE_MAP_BYTES,
  MAX_STANDING_PRODUCTS,
  SITE_MAP_TYPES,
  UNLOADING_OPTIONS,
  buildDeliveryPreferencesForm,
  patchForm,
  summaryClauses,
  toApi,
  type DeliveryPreferencesFormGroup,
} from './delivery-preferences-form';

interface FormStateRow {
  name: string;
  value: string;
  status: string;
}

const DEV_PANEL_FIELDS: ReadonlyArray<{ name: string; control: (form: DeliveryPreferencesFormGroup) => AbstractControl }> = [
  { name: 'shipperId', control: (f) => f.controls.shipperId },
  { name: 'deliveryDays', control: (f) => f.controls.deliveryDays },
  { name: 'windowFrom', control: (f) => f.controls.windowFrom },
  { name: 'windowTo', control: (f) => f.controls.windowTo },
  { name: 'unloading', control: (f) => f.controls.unloading },
  { name: 'maxPallets', control: (f) => f.controls.maxPallets },
  { name: 'chilled', control: (f) => f.controls.chilled },
  { name: 'maxTempC', control: (f) => f.controls.maxTempC },
  { name: 'closedFrom', control: (f) => f.controls.closedRange.controls.closedFrom },
  { name: 'closedTo', control: (f) => f.controls.closedRange.controls.closedTo },
  { name: 'notifyEmails', control: (f) => f.controls.notifyEmails },
  { name: 'standingProductIds', control: (f) => f.controls.standingProductIds },
  { name: 'invoiceFormat', control: (f) => f.controls.invoiceFormat },
  { name: 'instructions', control: (f) => f.controls.instructions },
  { name: 'siteMap', control: (f) => f.controls.siteMap },
];

@Component({
  selector: 'app-delivery-preferences',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatChipsModule,
    MatAutocompleteModule,
    CdkTextareaAutosize,
  ],
  templateUrl: './delivery-preferences.html',
  styleUrl: './delivery-preferences.css',
})
export class DeliveryPreferences {
  private readonly api = inject(PortalApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly developerDetails = inject(DeveloperDetails);

  protected readonly dayOptions = DAY_OPTIONS;
  protected readonly unloadingOptions = UNLOADING_OPTIONS;
  protected readonly invoiceFormatOptions = INVOICE_FORMAT_OPTIONS;
  protected readonly errorMessages = ERROR_MESSAGES;
  protected readonly emailSeparatorKeys = [ENTER, COMMA];

  protected readonly form = buildDeliveryPreferencesForm();
  protected readonly saving = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected readonly siteMapError = signal<string | null>(null);
  protected readonly productSearch = new FormControl('', { nonNullable: true });

  private readonly preferencesResource = httpResource<DeliveryPreferencesDto>(() => '/api/me/delivery-preferences');
  protected readonly shippersResource = httpResource<Shipper[]>(() => '/api/shippers');
  protected readonly productsResource = httpResource<Product[]>(() => '/api/products');

  // Reactive Forms controls aren't signals; this ticks whenever the form
  // changes so every computed below can read live control state (.value,
  // .invalid, .errors) and stay in sync without polling.
  private readonly formVersion = toSignal(merge(this.form.valueChanges, this.form.statusChanges).pipe(startWith(null)), {
    initialValue: null,
  });
  private readonly productSearchText = toSignal(this.productSearch.valueChanges.pipe(startWith('')), { initialValue: '' });

  readonly dirty = computed(() => {
    this.formVersion();
    return this.form.dirty;
  });

  protected readonly shipperName = computed(() => {
    this.formVersion();
    const id = this.form.controls.shipperId.value;
    return this.shippersResource.value()?.find((shipper) => shipper.id === id)?.companyName ?? null;
  });

  protected readonly summary = computed(() => {
    this.formVersion();
    return summaryClauses(this.form, this.shipperName());
  });

  protected readonly instructionsCount = computed(() => {
    this.formVersion();
    return this.form.controls.instructions.value.length;
  });

  protected readonly filteredProducts = computed(() => {
    this.formVersion();
    const search = this.productSearchText().trim().toLowerCase();
    const picked = new Set(this.form.controls.standingProductIds.value);
    return (this.productsResource.value() ?? [])
      .filter((product) => !picked.has(product.id) && product.name.toLowerCase().includes(search))
      .slice(0, 20);
  });

  protected readonly formStateRows = computed<FormStateRow[]>(() => {
    this.formVersion();
    return DEV_PANEL_FIELDS.map(({ name, control }) => {
      const c = control(this.form);
      return { name, value: JSON.stringify(c.value), status: c.valid ? 'valid' : (Object.keys(c.errors ?? {})[0] ?? 'valid') };
    });
  });

  private readonly loadPreferences = effect(() => {
    const preferences = this.preferencesResource.value();
    if (preferences) patchForm(this.form, preferences);
  });

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      afterNextRender(() => this.focusFirstInvalid(), { injector: this.injector });
      return;
    }

    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.api.updateDeliveryPreferences(toApi(this.form)));
      this.preferencesResource.set(saved);
      this.snackBar.open('Changes saved', 'Dismiss', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  protected addEmail(event: MatChipInputEvent): void {
    const value = event.value.trim();
    event.chipInput.clear();
    if (!value) return;

    if (!EMAIL_PATTERN.test(value)) {
      this.emailError.set(ERROR_MESSAGES.email);
      return;
    }
    const current = this.form.controls.notifyEmails.value;
    if (current.length >= MAX_NOTIFY_EMAILS) {
      this.emailError.set(`Enter up to ${MAX_NOTIFY_EMAILS} email addresses`);
      return;
    }
    this.form.controls.notifyEmails.setValue([...current, value]);
    this.form.controls.notifyEmails.markAsDirty();
    this.emailError.set(null);
  }

  protected removeEmail(email: string): void {
    const current = this.form.controls.notifyEmails.value;
    this.form.controls.notifyEmails.setValue(current.filter((existing) => existing !== email));
    this.form.controls.notifyEmails.markAsDirty();
  }

  protected selectProduct(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    const id = event.option.value as number;
    const current = this.form.controls.standingProductIds.value;
    if (current.length < MAX_STANDING_PRODUCTS && !current.includes(id)) {
      this.form.controls.standingProductIds.setValue([...current, id]);
      this.form.controls.standingProductIds.markAsDirty();
    }
    this.productSearch.setValue('');
    input.value = '';
  }

  protected removeProduct(id: number): void {
    const current = this.form.controls.standingProductIds.value;
    this.form.controls.standingProductIds.setValue(current.filter((existing) => existing !== id));
    this.form.controls.standingProductIds.markAsDirty();
  }

  protected productName(id: number): string {
    return this.productsResource.value()?.find((product) => product.id === id)?.name ?? `Product ${id}`;
  }

  protected onSiteMapFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.applySiteMapFile(file);
    input.value = '';
  }

  protected onSiteMapDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.applySiteMapFile(file);
  }

  protected selectUnloading(unloading: Unloading): void {
    this.form.controls.unloading.setValue(unloading);
    this.form.controls.unloading.markAsDirty();
  }

  protected selectInvoiceFormat(format: InvoiceFormat): void {
    this.form.controls.invoiceFormat.setValue(format);
    this.form.controls.invoiceFormat.markAsDirty();
  }

  protected removeSiteMap(): void {
    this.form.controls.siteMap.setValue(null);
    this.form.controls.siteMap.markAsDirty();
    this.siteMapError.set(null);
  }

  private applySiteMapFile(file: File): void {
    if (!SITE_MAP_TYPES.includes(file.type)) {
      this.siteMapError.set(ERROR_MESSAGES.fileType);
      return;
    }
    if (file.size > MAX_SITE_MAP_BYTES) {
      this.siteMapError.set(ERROR_MESSAGES.fileSize);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.form.controls.siteMap.setValue({ name: file.name, type: file.type, dataUrl: reader.result as string });
      this.form.controls.siteMap.markAsDirty();
      this.siteMapError.set(null);
    };
    reader.readAsDataURL(file);
  }

  private focusFirstInvalid(): void {
    this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
}
