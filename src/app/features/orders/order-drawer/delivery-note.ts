import type { Content, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OrderDetail } from '../../../core/api/models';
import { formatMoney } from '../../../shared/format-money';

const FJORD = '#1F3A5F';
const INK = '#14202E';
const MUTED = '#5B6B7A';
const RULE = '#C6CED3';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Mirrors the four lines order-drawer.html shows (name, address, city +
// postcode, country) — no field the drawer itself leaves out.
function shipToLines(order: OrderDetail): string[] {
  const { shipTo } = order;
  return [
    shipTo.name,
    shipTo.address,
    [shipTo.city, shipTo.postalCode].filter(Boolean).join(' '),
    shipTo.country,
  ].filter((line): line is string => !!line);
}

const label = (text: string) => ({ text, fontSize: 8, bold: true, color: MUTED });

// Built from the same OrderDetail the drawer renders, using the same
// formatMoney, so every figure here matches the screen exactly (P4/B2).
export function buildDeliveryNoteDocument(order: OrderDetail): TDocumentDefinitions {
  // Typed explicitly so every nested literal (margins, alignments) is checked
  // against Content instead of independently inferred and widened.
  const content: Content[] = [
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              text: 'NORTHWIND TRADERS',
              fillColor: FJORD,
              color: 'white',
              bold: true,
              fontSize: 14,
              margin: [8, 8, 0, 8],
            },
            {
              text: 'Delivery note',
              fillColor: FJORD,
              color: 'white',
              fontSize: 14,
              alignment: 'right',
              margin: [0, 8, 8, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: `#${order.id}`, fontSize: 20, bold: true },
            { text: `Ordered ${formatDate(order.orderedOn)}`, margin: [0, 6, 0, 0] as Margins },
            { text: `Due ${formatDate(order.dueOn)}` },
          ],
        },
        {
          width: '*',
          stack: [
            label('SHIP TO'),
            ...shipToLines(order).map((line) => ({ text: line, margin: [0, 2, 0, 0] as Margins })),
          ],
        },
      ],
      margin: [0, 0, 0, 24],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          [
            label('PRODUCT'),
            { ...label('QTY'), alignment: 'right' as const },
            { ...label('UNIT PRICE'), alignment: 'right' as const },
            { ...label('AMOUNT'), alignment: 'right' as const },
          ],
          ...order.lines.map((line) => [
            { text: line.productName },
            { text: String(line.quantity), alignment: 'right' as const },
            { text: formatMoney(line.unitPrice), alignment: 'right' as const },
            { text: formatMoney(line.lineTotal), alignment: 'right' as const },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },
    {
      columns: [
        { width: '*', text: '' },
        {
          width: 180,
          table: {
            body: [
              [
                { text: 'Freight', color: MUTED },
                { text: formatMoney(order.freight), alignment: 'right' as const },
              ],
              [
                { text: 'Total', bold: true },
                {
                  text: formatMoney(order.total),
                  alignment: 'right' as const,
                  bold: true,
                  fontSize: 12,
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
      ],
      margin: [0, 0, 0, 56],
    },
    {
      columns: [
        {
          // Exact casing: the tester-facing test contract asserts this text verbatim.
          width: 220,
          stack: [
            { text: 'Received by', fontSize: 8, bold: true, color: MUTED, margin: [0, 0, 0, 28] },
            {
              canvas: [
                { type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: RULE },
              ],
            },
          ],
        },
      ],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { fontSize: 10, color: INK },
    content,
  };
}
