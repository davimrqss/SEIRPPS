import * as XLSX from "xlsx";

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const normalizar = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const round2 = (value: number) => Math.round(value * 100) / 100;

export type AbaPlanilha = { nome: string; texto: string; valoresPorLinha: Map<number, number[]> };

export function isAbaMensal(nome: string) {
  const n = normalizar(nome);
  return MESES.includes(n) || /^13/.test(n);
}

/** Convert raw sheet rows into compact tab-separated text keeping the real Excel row numbers. */
export function linhasParaTexto(linhas: unknown[][], primeiraLinha = 1): Omit<AbaPlanilha, "nome"> {
  const valoresPorLinha = new Map<number, number[]>();
  const saida: string[] = [];
  linhas.forEach((linha, index) => {
    const numero = primeiraLinha + index;
    const celulas = (linha ?? []).map((cell) => {
      if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
      if (typeof cell === "number") return Number.isFinite(cell) ? String(round2(cell)) : "";
      return cell == null ? "" : String(cell).replace(/\s+/g, " ").trim().slice(0, 120);
    });
    while (celulas.length && celulas[celulas.length - 1] === "") celulas.pop();
    if (!celulas.some((cell) => cell !== "" && cell !== "0")) return;
    valoresPorLinha.set(numero, (linha ?? []).filter((cell): cell is number => typeof cell === "number" && Number.isFinite(cell)).map(round2));
    saida.push(`L${numero}\t${celulas.join("\t")}`);
  });
  return { texto: saida.join("\n"), valoresPorLinha };
}

/** True when every non-zero value returned by the AI exists in the original Excel row. */
export function valoresConferem(valoresDaLinha: number[] | undefined, valores: number[]) {
  if (!valoresDaLinha) return false;
  return valores.filter((value) => Math.abs(value) > 0.001)
    .every((value) => valoresDaLinha.some((cell) => Math.abs(cell - round2(value)) < 0.011));
}

export async function lerPlanilha(file: File): Promise<AbaPlanilha[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  return workbook.SheetNames.map((nome) => {
    const sheet = workbook.Sheets[nome];
    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0 } };
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: true, defval: null });
    return { nome, ...linhasParaTexto(linhas, range.s.r + 1) };
  });
}
