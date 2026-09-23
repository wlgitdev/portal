import { Component, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdersStore } from '../../../core/orders/orders-store';
import { formatMoney } from '../../../shared/format-money';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { StatusTracker } from '../../../shared/status-tracker/status-tracker';
import { ukDate } from '../order-view';
import { buildDeliveryNoteDocument } from './delivery-note';

@Component({
  selector: 'app-order-drawer',
  imports: [StatusTracker, Skeleton],
  templateUrl: './order-drawer.html',
  styleUrl: './order-drawer.css',
})
export class OrderDrawer {
  protected readonly store = inject(OrdersStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly formatMoney = formatMoney;
  protected readonly ukDate = ukDate;
  protected readonly downloadingDeliveryNote = signal(false);

  protected close(): void {
    this.store.closeOrder();
  }

  protected async downloadDeliveryNote(): Promise<void> {
    const order = this.store.selectedOrder();
    if (!order || this.downloadingDeliveryNote()) {
      return;
    }

    this.downloadingDeliveryNote.set(true);
    try {
      const [pdfMakeModule, vfsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ]);
      // @types/pdfmake models this UMD bundle as flat named exports (as
      // require() would see it), but a dynamic import() of a CJS module
      // only ever exposes it via .default — cast through the module's own
      // namespace type rather than hand-duplicating its member signatures.
      const pdfMake = (pdfMakeModule as unknown as { default: typeof pdfMakeModule }).default;
      pdfMake.addVirtualFileSystem(vfsModule.default);
      await pdfMake
        .createPdf(buildDeliveryNoteDocument(order))
        .download(`delivery-note-${order.id}.pdf`);
    } catch {
      this.snackBar.open("Couldn't build the delivery note — please try again.", 'Dismiss', {
        duration: 5000,
      });
    } finally {
      this.downloadingDeliveryNote.set(false);
    }
  }
}
