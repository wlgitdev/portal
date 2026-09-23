import type { CanDeactivateFn } from '@angular/router';

export interface CanLeave {
  canDeactivate(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<CanLeave> = (component) =>
  component.canDeactivate();
