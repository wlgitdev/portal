const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function formatMoney(value: number): string {
  return money.format(value);
}
