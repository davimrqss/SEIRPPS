import * as XLSX from "xlsx";

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const normalizar = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const dataLocal = (date: Date) => Number.isNaN(date.getTime()) ? ""
  : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const round2 = (value: number) => Math.round(value * 100) / 100;

export type AbaPlanilha = { nome: string; texto: string; linhas: Map<number, string[]> };

/** Column numbers (1 = first cell after the "L<row>" marker) chosen by the AI; 0 means absent. */
export type MapaColunas = {
  linha_cabecalho: number; descricao: number; remuneracao: number; base_calculo: number;
  salario_familia: number; salario_maternidade: number; aux_doenca: number;
  valor_servidor: number; valor_patronal: number; pago_servidor: number; data_pagamento_servidor: number;
  pago_patronal: number; data_pagamento_patronal: number;
};

export type GuiaPlanilha = {
  linha: number; codigo: string; descricao: string; remuneracao: number; base_calculo: number;
  salario_familia: number; salario_maternidade: number; aux_doenca: number;
  valor_servidor: number; valor_patronal: number; pago_servidor: number; data_pagamento_servidor: string;
  pago_patronal: number; data_pagamento_patronal: string;
};

export function isAbaMensal(nome: string) {
  const n = normalizar(nome);
  return MESES.includes(n) || /^13/.test(n);
}

/** Convert raw sheet rows into compact tab-separated text keeping the real Excel row numbers. */
export function linhasParaTexto(linhas: unknown[][], primeiraLinha = 1): Omit<AbaPlanilha, "nome"> {
  const mapa = new Map<number, string[]>();
  const saida: string[] = [];
  linhas.forEach((linha, index) => {
    const numero = primeiraLinha + index;
    const celulas = (linha ?? []).map((cell) => {
      if (cell instanceof Date) return dataLocal(cell);
      if (typeof cell === "number") return Number.isFinite(cell) ? String(round2(cell)) : "";
      return cell == null ? "" : String(cell).replace(/\s+/g, " ").trim().slice(0, 120);
    });
    while (celulas.length && celulas[celulas.length - 1] === "") celulas.pop();
    if (!celulas.some((cell) => cell !== "" && cell !== "0")) return;
    mapa.set(numero, celulas);
    saida.push(`L${numero}\t${celulas.join("\t")}`);
  });
  return { texto: saida.join("\n"), linhas: mapa };
}

const numero = (value: string | undefined) => {
  const n = Number(value);
  return value && Number.isFinite(n) ? Math.abs(n) : 0;
};
const data = (value: string | undefined) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

/** Read every guide row exactly from the original cells, using the AI column map. */
export function extrairGuias(aba: Pick<AbaPlanilha, "linhas">, mapa: MapaColunas): GuiaPlanilha[] {
  const cel = (celulas: string[], coluna: number) => coluna > 0 ? celulas[coluna - 1] : undefined;
  const guias: GuiaPlanilha[] = [];
  for (const [linha, celulas] of [...aba.linhas.entries()].sort((a, b) => a[0] - b[0])) {
    if (linha <= mapa.linha_cabecalho) continue;
    const rotulo = (cel(celulas, mapa.descricao) ?? "").trim();
    if (!rotulo) continue;
    if (/^(sub)?total\b/i.test(normalizar(rotulo))) break;
    const guia: GuiaPlanilha = {
      linha, codigo: "", descricao: rotulo,
      remuneracao: numero(cel(celulas, mapa.remuneracao)), base_calculo: numero(cel(celulas, mapa.base_calculo)),
      salario_familia: numero(cel(celulas, mapa.salario_familia)), salario_maternidade: numero(cel(celulas, mapa.salario_maternidade)),
      aux_doenca: numero(cel(celulas, mapa.aux_doenca)),
      valor_servidor: numero(cel(celulas, mapa.valor_servidor)), valor_patronal: numero(cel(celulas, mapa.valor_patronal)),
      pago_servidor: numero(cel(celulas, mapa.pago_servidor)), data_pagamento_servidor: data(cel(celulas, mapa.data_pagamento_servidor)),
      pago_patronal: numero(cel(celulas, mapa.pago_patronal)), data_pagamento_patronal: data(cel(celulas, mapa.data_pagamento_patronal)),
    };
    if (guia.base_calculo <= 0 && guia.valor_servidor <= 0 && guia.valor_patronal <= 0) continue;
    const match = rotulo.match(/^(\d{3,})\s*[-–]?\s*(.+)$/);
    if (match) { guia.codigo = match[1]; guia.descricao = match[2].trim(); }
    guias.push(guia);
  }
  return guias;
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

const REGRAS: [Exclude<keyof MapaColunas, "linha_cabecalho">, RegExp][] = [
  ["descricao", /^(centro de custo|descricao)/], ["remuneracao", /^remuneracao/], ["base_calculo", /^base/],
  ["salario_familia", /^(\(-\) )?salario[- ]familia/], ["salario_maternidade", /^(\(-\) )?salario[- ]maternidade/],
  ["aux_doenca", /^(\(-\) )?aux(ilio)?[- ]doenca/], ["valor_servidor", /^servidor/], ["valor_patronal", /^patronal/],
  ["pago_servidor", /repassado servidor/], ["data_pagamento_servidor", /^data.*repasse.*servidor/],
  ["pago_patronal", /repassado patronal/], ["data_pagamento_patronal", /^data.*repasse.*patronal/],
];

/** Recognise the usual RPPS summary layout by its header names; null when the layout is unknown. */
export function detectarColunas(aba: Pick<AbaPlanilha, "linhas">): MapaColunas | null {
  for (const [linha, celulas] of [...aba.linhas.entries()].sort((a, b) => a[0] - b[0])) {
    const titulos = celulas.map(normalizar);
    if (!titulos.some((titulo) => REGRAS[0][1].test(titulo))) continue;
    const mapa = { linha_cabecalho: linha } as MapaColunas;
    for (const [campo, regra] of REGRAS) mapa[campo] = titulos.findIndex((titulo) => regra.test(titulo)) + 1;
    return mapa.descricao && mapa.base_calculo && mapa.valor_servidor && mapa.valor_patronal ? mapa : null;
  }
  return null;
}
