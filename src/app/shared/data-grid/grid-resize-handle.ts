import { Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

const ARROW_STEP_PX = 10;

// A WAI-ARIA window-splitter-style handle: role=separator, arrow keys and
// pointer drag both report a new width; fitting to content needs the other
// cells in the column, which only the header row can see, so that's an
// output the parent measures and applies.
@Component({
  selector: 'app-grid-resize-handle',
  template: '',
  host: {
    role: 'separator',
    'aria-orientation': 'vertical',
    tabindex: '0',
    class: 'grid-resize-handle',
    '[attr.aria-label]': '"Resize " + header()',
    '[attr.aria-valuenow]': 'width()',
    '[attr.aria-valuemin]': 'minWidth()',
  },
})
export class GridResizeHandle {
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  readonly header = input.required<string>();
  readonly width = input.required<number>();
  readonly minWidth = input.required<number>();
  readonly widthChange = output<number>();
  readonly fitContent = output<void>();

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.widthChange.emit(this.width() + ARROW_STEP_PX);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.widthChange.emit(Math.max(this.minWidth(), this.width() - ARROW_STEP_PX));
    }
  }

  @HostListener('dblclick')
  protected onDoubleClick(): void {
    this.fitContent.emit();
  }

  @HostListener('pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.width();
    this.element.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent): void => {
      this.widthChange.emit(Math.max(this.minWidth(), startWidth + (moveEvent.clientX - startX)));
    };
    const onUp = (): void => {
      this.element.releasePointerCapture(event.pointerId);
      this.element.removeEventListener('pointermove', onMove);
      this.element.removeEventListener('pointerup', onUp);
    };
    this.element.addEventListener('pointermove', onMove);
    this.element.addEventListener('pointerup', onUp);
  }
}
