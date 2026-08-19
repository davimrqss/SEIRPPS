import jsPDF from "jspdf";
import { fmtBRL, isoToBR } from "./format";

export interface GuiaFolha {
  centro_custo: string;
  codigo_centro_custo?: string | null;
  orgao: string;
  mes_referencia: string;
  vencimento: string;
  remuneracao: number | string;
  base_calculo: number | string;
  valor_servidor: number | string;
  valor_patronal: number | string;
  valor_suplementar?: number | string | null;
  salario_maternidade?: number | string | null;
  salario_familia?: number | string | null;
  aux_doenca?: number | string | null;
  juros_multa?: number | string | null;
  num_empregados?: number | null;
  grupo_folha?: string | null;
  aliquota_servidor: number | string;
  aliquota_patronal: number | string;
  aliquota_suplementar?: number | string | null;
  is_13: boolean;
  tipo: string;
  paga: boolean;
}

export interface GuiaCaixa {
  nome?: string | null;
  cnpj?: string | null;
  empresa?: string | null;
  endereco?: string | null;
  cep?: string | null;
  municipio?: string | null;
  uf?: string | null;
  estado?: string | null;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

const competencia = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${m}/${y}`;
};

export function buildGuiaPDF(folha: GuiaFolha, caixa: GuiaCaixa = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 36;
  const R = W - M;
  const colSplit = M + (R - M) * 0.55;

  const line = (y: number, x1 = M, x2 = R) => {
    doc.setDrawColor(120, 120, 120);
    doc.line(x1, y, x2, y);
  };
  const label = (t: string, x: number, y: number) => {
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(90, 90, 90);
    doc.text(t.toUpperCase(), x, y);
  };
  const value = (t: string, x: number, y: number, opts?: { bold?: boolean; size?: number; align?: "left" | "right"; color?: [number, number, number] }) => {
    doc
      .setFont("helvetica", opts?.bold ? "bold" : "normal")
      .setFontSize(opts?.size ?? 9)
      .setTextColor(...(opts?.color ?? [20, 20, 20]));
    doc.text(t, x, y, { align: opts?.align ?? "left" });
  };

  // ---- Cabeçalho
  let y = M;
  doc.setDrawColor(60, 60, 60).setLineWidth(1);
  doc.rect(M, y, R - M, 62);
  doc.setLineWidth(0.5);
  value(caixa.nome || "Caixa de Previdência", M + 10, y + 20, { bold: true, size: 12 });
  value(
    "GUIA DE RECOLHIMENTO DE PREVIDÊNCIA PRÓPRIA",
    M + 10,
    y + 36,
    { bold: true, size: 9 }
  );
  const enderecoLinha = [caixa.endereco, caixa.municipio, caixa.uf, caixa.cep]
    .filter(Boolean)
    .join(" - ");
  value(enderecoLinha || caixa.estado || "", M + 10, y + 50, { size: 7.5, color: [90, 90, 90] });
  if (caixa.cnpj) value(`CNPJ: ${caixa.cnpj}`, R - 10, y + 20, { size: 8, align: "right" });

  y += 62;

  // ---- Bloco identificação (esquerda) / competência (direita)
  const boxTop = y + 12;
  const rowsLeft: [string, string][] = [
    ["Empresa / Órgão", caixa.empresa || folha.orgao],
    ["Centro de custo", `${folha.codigo_centro_custo ? folha.codigo_centro_custo + " - " : ""}${folha.centro_custo}`],
    ["Nº de empregados", String(folha.num_empregados ?? 0)],
    ["Grupo folha", folha.grupo_folha || "1 - Normal"],
    ["Salário de contribuição (base)", fmtBRL(n(folha.base_calculo))],
    ["Remuneração total", fmtBRL(n(folha.remuneracao))],
    ["Alíquota segurado", `${n(folha.aliquota_servidor)}%`],
    ["Alíquota patronal", `${n(folha.aliquota_patronal)}%`],
  ];

  let ly = boxTop;
  doc.rect(M, boxTop - 12, colSplit - M, rowsLeft.length * 26 + 18);
  rowsLeft.forEach(([l, v]) => {
    ly += 22;
    label(l, M + 8, ly - 10);
    value(v, M + 8, ly + 2, { bold: true });
    line(ly + 8, M + 8, colSplit - 8);
    ly += 4;
  });

  // Direita: valores da guia
  const servidor = n(folha.valor_servidor);
  const patronal = n(folha.valor_patronal);
  const suplementar = n(folha.valor_suplementar);
  const maternidade = n(folha.salario_maternidade);
  const familia = n(folha.salario_familia);
  const doenca = n(folha.aux_doenca);
  const juros = n(folha.juros_multa);
  const deducoes = maternidade + familia + doenca;
  const bruto = servidor + patronal + suplementar;
  const liquido = bruto - deducoes;
  const total = liquido + juros;

  let ry = boxTop;
  doc.rect(colSplit, boxTop - 12, R - colSplit, rowsLeft.length * 26 + 18);
  const rowRight = (l: string, v: string, opts?: { red?: boolean; bold?: boolean }) => {
    ry += 22;
    label(l, colSplit + 8, ry - 10);
    value(v, R - 8, ry - 10, {
      align: "right",
      bold: opts?.bold ?? true,
      color: opts?.red ? [190, 30, 30] : [20, 20, 20],
    });
    line(ry + 2, colSplit + 8, R - 8);
    ry += 4;
  };
  rowRight("Competência", competencia(folha.mes_referencia) + (folha.is_13 ? " (13º)" : ""));
  rowRight("Data de recolhimento", isoToBR(folha.vencimento));
  rowRight("Contribuição segurados", fmtBRL(servidor));
  rowRight("Contribuição empresa (patronal)", fmtBRL(patronal));
  rowRight("Contribuição suplementar", fmtBRL(suplementar));
  rowRight("(-) Salário maternidade", fmtBRL(maternidade), { red: true });
  rowRight("(-) Salário família", fmtBRL(familia), { red: true });
  rowRight("(-) Auxílio doença", fmtBRL(doenca), { red: true });

  y = Math.max(ly, ry) + 22;

  // ---- Totais
  doc.rect(M, y, R - M, 78);
  const totRow = (l: string, v: string, ty: number, big = false) => {
    value(l, M + 10, ty, { bold: big, size: big ? 11 : 9 });
    value(v, R - 10, ty, { bold: true, size: big ? 13 : 9, align: "right" });
  };
  totRow("Total líquido", fmtBRL(liquido), y + 20);
  line(y + 28);
  totRow("Juros / Multa", fmtBRL(juros), y + 44);
  line(y + 52);
  doc.setFillColor(240, 245, 242);
  doc.rect(M + 1, y + 53, R - M - 2, 24, "F");
  totRow("TOTAL A RECOLHER", fmtBRL(total), y + 70, true);

  y += 100;

  // ---- Autenticação mecânica
  doc.rect(M, y, R - M, 70);
  label("Autenticação mecânica", M + 10, y + 16);
  value(`Situação: ${folha.paga ? "Paga" : "Pendente"}`, M + 10, y + 62, {
    size: 7.5,
    color: [110, 110, 110],
  });
  value(
    `Emitido em ${new Date().toLocaleString("pt-BR")}`,
    R - 10,
    y + 62,
    { size: 7.5, align: "right", color: [110, 110, 110] }
  );

  return doc;
}

export const guiaFileName = (folha: GuiaFolha) =>
  `guia-${folha.centro_custo.replace(/\s+/g, "-").toLowerCase()}-${folha.mes_referencia}.pdf`;

export function downloadGuia(folha: GuiaFolha, caixa?: GuiaCaixa) {
  buildGuiaPDF(folha, caixa).save(guiaFileName(folha));
}

export function previewGuia(folha: GuiaFolha, caixa?: GuiaCaixa) {
  const url = buildGuiaPDF(folha, caixa).output("bloburl");
  window.open(url as unknown as string, "_blank");
}
