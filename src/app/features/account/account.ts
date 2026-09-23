import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import type { CanLeave } from '../../core/routing/unsaved-changes.guard';
import { PortalApi } from '../../core/api/portal-api';
import type { CustomerProfile } from '../../core/api/models';
import { PageHeader } from '../../shared/page-header/page-header';
import { DiscardChangesDialog } from './discard-changes-dialog/discard-changes-dialog';
import { FormField } from './form-field/form-field';
import {
  toFormValue,
  toProfile,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
} from './account-form';

// FormsModule is imported only so the plain <form> below picks up NgForm and
// its (ngSubmit) — without it a real DOM submit event fires instead, doing a
// full-page navigation. The fields themselves are plain [value]/(input)
// bindings inside app-form-field, not ngModel.
@Component({
  selector: 'app-account',
  imports: [FormsModule, PageHeader, FormField],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements CanLeave {
  private readonly api = inject(PortalApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly profileResource = httpResource<CustomerProfile>(() => '/api/me');

  private readonly loadedForm = computed(() => {
    const profile = this.profileResource.value();
    return profile ? toFormValue(profile) : null;
  });

  // The fields bind here, not to loadedForm directly, so edits survive
  // between renders; it resets to the latest server truth on first load and
  // again after a successful save (the only two moments loadedForm changes).
  protected readonly form = linkedSignal(() => this.loadedForm());

  protected readonly errors = signal<ProfileErrors>({});
  protected readonly saving = signal(false);

  protected readonly dirty = computed(
    () => JSON.stringify(this.form()) !== JSON.stringify(this.loadedForm()),
  );

  protected updateField(field: ProfileField, value: string): void {
    this.form.update((current) => (current ? { ...current, [field]: value } : current));
  }

  protected async save(): Promise<void> {
    const draft = this.form();
    if (!draft) return;

    const errors = validateProfile(draft);
    if (Object.keys(errors).length > 0) {
      this.errors.set(errors);
      return;
    }

    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.updateMe(toProfile(draft)));
      this.profileResource.set(updated);
      this.errors.set({});
      this.snackBar.open('Changes saved', 'Dismiss', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.dirty()) return true;
    const confirmed = await firstValueFrom(this.dialog.open(DiscardChangesDialog).afterClosed());
    return confirmed === true;
  }
}
