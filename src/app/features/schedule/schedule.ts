import { FullCalendarModule } from '@fullcalendar/angular';
import type { CalendarOptions, EventClickArg, EventInput, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Component, computed, inject } from '@angular/core';
import { OrdersStore } from '../../core/orders/orders-store';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeader } from '../../shared/page-header/page-header';
import { Skeleton } from '../../shared/skeleton/skeleton';
import type { OrderSummary } from '../../core/api/models';

// One "Ordered" marker per order, plus a "Due" marker for orders that
// haven't shipped yet — a shipped order has nothing left to be due.
function scheduleEvents(orders: OrderSummary[]): EventInput[] {
  const events: EventInput[] = [];
  for (const order of orders) {
    events.push({
      title: `#${order.id}`,
      start: order.orderedOn.slice(0, 10),
      allDay: true,
      classNames: ['ordered'],
      extendedProps: { orderId: order.id },
    });
    if (order.status !== 'Shipped') {
      events.push({
        title: `#${order.id}`,
        start: order.dueOn.slice(0, 10),
        allDay: true,
        classNames: [order.status === 'Late' ? 'late' : 'due'],
        extendedProps: { orderId: order.id },
      });
    }
  }
  return events;
}

@Component({
  selector: 'app-schedule',
  imports: [PageHeader, Skeleton, EmptyState, FullCalendarModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  protected readonly store = inject(OrdersStore);

  protected readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'title', center: '', right: 'dayGridMonth,listMonth prev,next' },
    height: 'auto',
    events: scheduleEvents(this.store.orders()),
    eventClick: (info: EventClickArg) => this.openOrder(info),
    eventDidMount: (info: EventMountArg) => this.tagEvent(info),
  }));

  private openOrder(info: EventClickArg): void {
    this.store.openOrder(info.event.extendedProps['orderId'] as number);
  }

  private tagEvent(info: EventMountArg): void {
    info.el.setAttribute('data-testid', 'schedule-event');
    info.el.setAttribute('data-order-id', String(info.event.extendedProps['orderId']));
  }
}
