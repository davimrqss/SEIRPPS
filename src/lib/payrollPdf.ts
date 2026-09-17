import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PayrollPdfExtraction = {
  pageCount: number;
  summaryPages: string[];
};

const normalizePageText = (items: Array<{ str?: string }>) =>
  items
    .map((item) => item.str?.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export async function extractPayrollSummaries(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<PayrollPdfExtraction> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(normalizePageText(content.items as Array<{ str?: string }>));
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 70));
  }

  const summaryPages: string[] = [];
  for (let index = 0; index < pages.length; index += 1) {
    const text = pages[index];
    if (!/Qtde\s+de\s+Funcion[aá]rios/i.test(text)) continue;

    const nearby = [pages[index - 1], text, pages[index + 1], pages[index + 2]]
      .filter(Boolean)
      .join("\n");
    const centers = [...nearby.matchAll(/Centro de Custo\s*-\s*([^\n]+)/gi)];
    const center = centers.at(-1)?.[1]?.trim() ?? "Centro não identificado";

    summaryPages.push(
      `RESUMO ${summaryPages.length + 1}\nCENTRO: ${center}\n${text}\n${pages[index + 1] ?? ""}`.slice(0, 14_000),
    );
  }

  if (summaryPages.length === 0) {
    throw new Error("Não encontrei os resumos por centro de custo neste PDF.");
  }

  onProgress?.(75);
  return { pageCount: pdf.numPages, summaryPages };
}