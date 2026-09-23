import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfPageSize {
  widthPt: number;
  heightPt: number;
}

export interface PdfContent {
  pages: PdfPageSize[];
  text: string;
}

const A4_PT: PdfPageSize = { widthPt: 595.28, heightPt: 841.89 };
// PDF writers round A4 differently (pdfmake: exact; Chromium: 595.92 x 842.88).
// 2pt still rejects US Letter (612 x 792), the realistic wrong answer.
const PAGE_SIZE_TOLERANCE_PT = 2;

export function isA4Portrait(size: PdfPageSize): boolean {
  return (
    Math.abs(size.widthPt - A4_PT.widthPt) <= PAGE_SIZE_TOLERANCE_PT &&
    Math.abs(size.heightPt - A4_PT.heightPt) <= PAGE_SIZE_TOLERANCE_PT
  );
}

// Reads a PDF the way a person would: page sizes plus the visible text,
// in reading order. pdf.js splits text into positioned runs, so a figure like
// "£1,204.50" can arrive as several runs; callers should compare with
// whitespace removed (see withoutWhitespace).
export async function readPdf(bytes: Uint8Array): Promise<PdfContent> {
  // pdf.js rejects Node Buffers (a Uint8Array subclass), which is what
  // Playwright's download and file APIs return; copy into a plain array.
  const loadingTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false });
  const pdf = await loadingTask.promise;
  const pages: PdfPageSize[] = [];
  const runs: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const [x0, y0, x1, y1] = page.view;
    pages.push({ widthPt: x1 - x0, heightPt: y1 - y0 });
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item) runs.push(item.str);
    }
  }
  await loadingTask.destroy();
  return { pages, text: runs.join(' ') };
}

export function withoutWhitespace(text: string): string {
  return text.replace(/\s+/g, '');
}
