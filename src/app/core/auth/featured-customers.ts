export interface FeaturedCustomer {
  testId: string;
  id: string;
  companyName: string;
  blurb: string;
}

// Curated, not queried: these three exist specifically to open the demo on
// a customer with orders on the water, a large account, and — since real
// Northwind data has no Late orders for Alfreds — a customer who does.
// Shared by sign-in (the featured cards) and the account menu ("Switch to").
export const FEATURED: FeaturedCustomer[] = [
  {
    testId: 'customer-card-ALFKI',
    id: 'ALFKI',
    companyName: 'Alfreds Futterkiste',
    blurb: 'Berlin, Germany',
  },
  {
    testId: 'customer-card-SAVEA',
    id: 'SAVEA',
    companyName: 'Save-a-lot Markets',
    blurb: 'Boise, USA',
  },
  {
    testId: 'customer-card-late-orders',
    id: 'ERNSH',
    companyName: 'Ernst Handel',
    blurb: 'Has an order running late',
  },
];
