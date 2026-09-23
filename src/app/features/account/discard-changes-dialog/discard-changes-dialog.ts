import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-discard-changes-dialog',
  imports: [MatDialogModule],
  templateUrl: './discard-changes-dialog.html',
  styleUrl: './discard-changes-dialog.css',
})
export class DiscardChangesDialog {
  private readonly dialogRef = inject(MatDialogRef<DiscardChangesDialog>);

  protected keepEditing(): void {
    this.dialogRef.close(false);
  }

  protected discard(): void {
    this.dialogRef.close(true);
  }
}
