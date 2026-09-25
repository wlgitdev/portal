import {
  Directive,
  ElementRef,
  HostListener,
  Injectable,
  inject,
  input,
  signal,
} from '@angular/core';

const SHOW_DELAY_MS = 400;

interface TooltipPosition {
  text: string;
  top: number;
  left: number;
}

// One tooltip per grid, shared by every header and cell so only one is ever
// showing (data-grid.html renders the single data-testid="grid-tooltip"
// element this drives).
@Injectable()
export class GridTooltip {
  readonly position = signal<TooltipPosition | null>(null);

  show(text: string, anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    this.position.set({ text, top: rect.bottom + 4, left: rect.left });
  }

  hide(): void {
    this.position.set(null);
  }
}

// Applied to a header's column-header-text span (always shows its
// headerTooltip) or a cell's cell-value span (shows the cell's own text,
// only once its content is actually clipped — end-aligned number/date cells
// are sized to never clip, so this naturally never fires for them).
@Directive({ selector: '[gridTooltipText]' })
export class GridTooltipTarget {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly tooltip = inject(GridTooltip);
  private timer?: ReturnType<typeof setTimeout>;

  readonly gridTooltipText = input<string | null>(null);
  readonly onlyWhenTruncated = input(false);

  @HostListener('mouseenter')
  @HostListener('focusin')
  protected onEnter(): void {
    const text = this.gridTooltipText();
    if (!text) return;
    if (this.onlyWhenTruncated() && this.element.scrollWidth <= this.element.clientWidth) return;

    this.timer = setTimeout(() => this.tooltip.show(text, this.element), SHOW_DELAY_MS);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  protected onLeave(): void {
    clearTimeout(this.timer);
    this.tooltip.hide();
  }
}
