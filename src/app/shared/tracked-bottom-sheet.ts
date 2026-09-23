import type { ComponentType } from '@angular/cdk/portal';
import type { MatBottomSheet } from '@angular/material/bottom-sheet';
import type { WritableSignal } from '@angular/core';

// MatBottomSheet's own aria-expanded/aria-modal live on its container, not
// on the trigger that opened it (see OrderFilters/AccountMenu), so a phone
// trigger needs its own open-state to drive [attr.aria-expanded] — this is
// that bookkeeping, shared so the account menu and the Filters sheet open
// their bottom sheets the same way instead of drifting apart.
export function openTrackedBottomSheet<T>(
  bottomSheet: MatBottomSheet,
  component: ComponentType<T>,
  isOpen: WritableSignal<boolean>,
): void {
  isOpen.set(true);
  bottomSheet
    .open(component)
    .afterDismissed()
    .subscribe(() => isOpen.set(false));
}
