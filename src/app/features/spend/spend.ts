import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { Component, computed, inject, signal } from '@angular/core';
import { monthlySpend } from '../../core/orders/order-stats';
import { OrdersStore } from '../../core/orders/orders-store';
import { cssToken } from '../../shared/css-token';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { formatMoney } from '../../shared/format-money';
import { PageHeader } from '../../shared/page-header/page-header';
import { Skeleton } from '../../shared/skeleton/skeleton';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-spend',
  imports: [PageHeader, Skeleton, EmptyState, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './spend.html',
  styleUrl: './spend.css',
})
export class Spend {
  protected readonly store = inject(OrdersStore);

  protected readonly formatMoney = formatMoney;
  protected readonly monthLabel = monthLabel;
  protected readonly showTable = signal(false);

  protected readonly monthly = computed(() => monthlySpend(this.store.orders(), new Date()));

  // ECharts renders to canvas, which can't resolve var(--token) the way real
  // DOM can — colours are read from the cascade once instead of duplicated
  // as literal hex (B5's brand/theme presets then reach this chart for free).
  protected readonly chartOptions = computed<EChartsCoreOption>(() => {
    const rows = this.monthly();
    const totals = rows.map((row) => row.total);
    const average = totals.reduce((sum, total) => sum + total, 0) / (totals.length || 1);
    const fjord = cssToken('--color-fjord');
    const amber = cssToken('--color-signal-amber');

    return {
      grid: { left: 64, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: rows.map((row) => monthLabel(row.month)) },
      yAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatMoney(value) } },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => formatMoney(value as number),
      },
      series: [
        { type: 'bar', name: 'Spend', data: totals, itemStyle: { color: fjord }, barMaxWidth: 32 },
        {
          type: 'line',
          name: 'Average',
          data: totals.map(() => average),
          symbol: 'none',
          lineStyle: { color: amber, type: 'dashed' },
        },
      ],
    };
  });
}
