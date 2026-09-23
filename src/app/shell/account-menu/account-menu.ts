import { CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerSession } from '../../core/auth/customer-session';
import { FEATURED, type FeaturedCustomer } from '../../core/auth/featured-customers';
import { OrdersStore } from '../../core/orders/orders-store';
import { Icon } from '../../shared/icon/icon';
import { Monogram } from '../../shared/monogram/monogram';

const TOAST_DURATION_MS = 5000;

// Menu content only — the host differs by viewport (design Revision 3, spec
// P7 R10): a cdkMenu opened from the top-bar trigger at >=720px, the same
// component opened in a MatBottomSheet below it. Self-contained: it reads
// CustomerSession directly rather than taking the current customer as an
// input, so both hosts can open it with no wiring beyond "open this type".
@Component({
  selector: 'app-account-menu',
  imports: [CdkMenu, CdkMenuItem, Icon, Monogram],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.css',
})
export class AccountMenu {
  private readonly session = inject(CustomerSession);
  private readonly ordersStore = inject(OrdersStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly bottomSheetRef = inject(MatBottomSheetRef, { optional: true });

  protected readonly current = computed(() => ({
    id: this.session.customerId() ?? '',
    companyName: this.session.companyName() ?? '',
  }));

  protected readonly others = computed<FeaturedCustomer[]>(() =>
    FEATURED.filter((customer) => customer.id !== this.session.customerId()),
  );

  protected switchTo(customer: FeaturedCustomer): void {
    this.ordersStore.reset();
    this.session.switchTo(customer);
    this.router.navigateByUrl('/orders');
    this.snackBar.open(`Now viewing ${customer.companyName}`, 'Dismiss', {
      duration: TOAST_DURATION_MS,
    });
    this.bottomSheetRef?.dismiss();
  }

  protected chooseAnother(): void {
    this.ordersStore.closeOrder();
    this.session.signOut();
    this.router.navigateByUrl('/sign-in', { replaceUrl: true });
    this.bottomSheetRef?.dismiss();
  }

  protected signOut(): void {
    const companyName = this.current().companyName;
    this.ordersStore.closeOrder();
    this.session.signOut();
    this.router.navigateByUrl('/sign-in', { replaceUrl: true });
    this.snackBar.open(`Signed out of ${companyName}`, 'Dismiss', { duration: TOAST_DURATION_MS });
    this.bottomSheetRef?.dismiss();
  }
}
