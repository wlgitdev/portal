import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

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
    '[attr.aria-valuenow]': 'displayWidth()',
    '[attr.aria-valuemin]': 'minWidth()',
    '(blur)': 'pendingWidth.set(null)',
  },
})
export class GridResizeHandle {
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  readonly header = input.required<string>();
  readonly width = input.required<number>();
  readonly minWidth = input.required<number>();
  readonly widthChange = output<number>();
  readonly fitContent = output<void>();

  // Two ArrowRight presses can outrun a single round trip back through the
  // width input (emit -> parent persists -> new width flows back down), so
  // each press advances from the last value THIS handle produced, not from
  // a width() that might still be mid-flight. Cleared on blur, so a later
  // external change (Reset view, a different column) is picked up fresh.
  protected readonly pendingWidth = signal<number | null>(null);

  // Not a computed: the cell's rendered width can exceed width() when CSS
  // grows it to fill leftover row space (the last column), so this reads
  // the DOM directly rather than trusting the stored value.
  protected displayWidth(): number {
    return this.pendingWidth() ?? this.element.parentElement?.getBoundingClientRect().width ?? this.width();
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    // Otherwise the same Arrow keydown also reaches the grid's own
    // onGridKeydown (it bubbles from inside the columnheader cell), which
    // moves focus to the next header as cell-to-cell navigation.
    event.stopPropagation();
    const base = this.displayWidth();
    const next = event.key === 'ArrowRight' ? base + ARROW_STEP_PX : Math.max(this.minWidth(), base - ARROW_STEP_PX);
    this.pendingWidth.set(next);
    this.widthChange.emit(next);
  }

  @HostListener('dblclick')
  protected onDoubleClick(): void {
    this.pendingWidth.set(null);
    this.fitContent.emit();
  }

  @HostListener('pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.displayWidth();
    this.element.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent): void => {
      const next = Math.max(this.minWidth(), startWidth + (moveEvent.clientX - startX));
      this.pendingWidth.set(next);
      this.widthChange.emit(next);
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
