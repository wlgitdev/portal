export type OrderStatus = 'Shipped' | 'Awaiting dispatch' | 'Late';

export interface CustomerSummary {
  id: string;
  companyName: string;
  city: string | null;
  country: string | null;
}

export interface OrderSummary {
  id: number;
  orderedOn: string;
  shippedOn: string | null;
  dueOn: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  shipTo: string | null;
}

export interface ShipToAddress {
  name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface OrderLine {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: number;
  orderedOn: string;
  shippedOn: string | null;
  dueOn: string;
  status: OrderStatus;
  shipTo: ShipToAddress;
  freight: number;
  total: number;
  lines: OrderLine[];
}
