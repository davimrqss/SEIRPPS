import jsPDF from "jspdf";
import { isoToBR } from "./format";

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
  logo_url?: string | null;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/** 12.345,67 (sem o prefixo R$, como no modelo oficial) */
const num = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (v: number) => `${num(v)}%`;

const competencia = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${m}/${y}`;
};

/** Converte uma URL de imagem em data URL, para embutir no PDF. */
export async function urlToDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildGuiaPDF(
  folha: GuiaFolha,
  caixa: GuiaCaixa = {},
  logoDataUrl?: string | null
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 60;
  const R = 535;
  const SPLIT = 350;

  doc.setLineWidth(0.7);
  doc.setDrawColor(30, 30, 30);

  const text = (
    t: string,
    x: number,
    y: number,
    o?: { bold?: boolean; size?: number; align?: "left" | "right" | "center"; color?: [number, number, number]; italic?: boolean }
  ) => {
    const style = o?.italic ? (o?.bold ? "bolditalic" : "italic") : o?.bold ? "bold" : "normal";
    doc.setFont("helvetica", style).setFontSize(o?.size ?? 8.5);
    doc.setTextColor(...(o?.color ?? [20, 20, 20]));
    doc.text(t, x, y, { align: o?.align ?? "left" });
  };

  // ---------- Cabeçalho: logo à esquerda, dados ao lado ----------
  const headTop = 40;
  const logoW = 95;
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.height / props.width;
      const w = logoW;
      const h = Math.min(w * ratio, 100);
      doc.addImage(logoDataUrl, M, headTop, w, h);
    } catch {
      /* logo inválida: segue sem imagem */
    }
  }

  const tx = M + logoW + 18;
  text((caixa.estado || "").toUpperCase(), tx, headTop + 18, { bold: true, size: 14 });
  text((caixa.empresa || folha.orgao || "").toUpperCase(), tx, headTop + 34, { bold: true, size: 11 });
  text((caixa.nome || "").toUpperCase(), tx, headTop + 48, { bold: true, size: 10 });
  if (caixa.cnpj) text(`CNPJ: ${caixa.cnpj}`, tx, headTop + 62, { bold: true, size: 8 });

  // ---------- Título + centro de custo ----------
  const titleY = headTop + 120;
  text("Guia de Recolhimento Previdenciário", M + 12, titleY, { bold: true, size: 12 });
  const ccLabel = `${folha.codigo_centro_custo ? folha.codigo_centro_custo + "-" : ""}${(folha.centro_custo || "").toUpperCase()}`;
  const ccLines = doc.splitTextToSize(ccLabel, R - SPLIT + 60);
  ccLines.slice(0, 2).forEach((l: string, i: number) => {
    text(l, SPLIT - 20, titleY - 10 + i * 12, { bold: true, italic: true, size: 9 });
  });

  // ---------- Quadro principal ----------
  const boxTop = titleY + 14;
  const H = 470;
  doc.rect(M, boxTop, R - M, H);
  doc.line(SPLIT, boxTop, SPLIT, boxTop + H);

  // ---- Coluna direita
  const servidor = n(folha.valor_servidor);
  const patronal = n(folha.valor_patronal);
  const suplementar = n(folha.valor_suplementar);
  const maternidade = n(folha.salario_maternidade);
  const familia = n(folha.salario_familia);
  const doenca = n(folha.aux_doenca);
  const juros = n(folha.juros_multa);
  const liquido = servidor + patronal + suplementar - (maternidade + familia + doenca);
  const total = liquido + juros;

  const red: [number, number, number] = [190, 30, 30];
  const rightRows: { label: string; value?: string; h: number; color?: [number, number, number]; big?: boolean; divider?: boolean }[] = [
    { label: "Competência :", value: competencia(folha.mes_referencia) + (folha.is_13 ? " (13º)" : ""), h: 52, divider: true },
    { label: "Data de Recolhimento:", value: isoToBR(folha.vencimento).replace(/-/g, "/"), h: 52, divider: true },
    { label: "( + ) Segurados:", value: num(servidor), h: 32, divider: true },
    { label: "( + ) Empresa:", value: num(patronal), h: 24 },
    { label: "( + ) Suplementar:", value: num(suplementar), h: 24, divider: true },
    { label: "( - ) Salário Maternidade:", value: num(maternidade), h: 30, color: red, divider: true },
    { label: "( - ) Salário Família:", value: num(familia), h: 30, color: red, divider: true },
    { label: "( - ) Aux. Doença:", value: num(doenca), h: 30, color: red, divider: true },
    { label: "Total Líquido:", value: num(liquido), h: 42, divider: true },
    { label: "( + ) Juros / Multa", value: num(juros), h: 42, divider: true },
    { label: "TOTAL:", value: num(total), h: 42, divider: true, big: true },
  ];

  let ry = boxTop;
  rightRows.forEach((row) => {
    text(row.label, SPLIT + 10, ry + 20, { size: 8.5, color: row.color });
    if (row.value !== undefined)
      text(row.value, R - 10, ry + 20, {
        align: "right",
        bold: true,
        size: row.big ? 10 : 9.5,
      });
    ry += row.h;
    if (row.divider) doc.line(SPLIT, ry, R, ry);
  });
  text("Autenticação Mecânica", (SPLIT + R) / 2, ry + 40, { align: "center", size: 8.5 });

  // ---- Coluna esquerda
  let ly = boxTop;
  const leftLine = () => doc.line(M, ly, SPLIT, ly);

  text("Carimbo Padronizado CNPJ:", (M + SPLIT) / 2, ly + 20, { align: "center", size: 8.5 });
  ly += 190;
  leftLine();

  const field = (label: string, value: string, h: number) => {
    text(label, M + 8, ly + 14, { size: 7 });
    text(value.toUpperCase(), M + 8, ly + 30, { bold: true, size: 8.5 });
    ly += h;
    leftLine();
  };
  field("EMPRESA", caixa.empresa || folha.orgao || "", 43);
  field("ENDEREÇO", caixa.endereco || "", 43);

  // CEP / MUNICIPIO / UF
  const c1 = M + 130;
  const c2 = M + 235;
  text("CEP", M + 8, ly + 14, { size: 7 });
  text("MUNICIPIO", c1 + 8, ly + 14, { size: 7 });
  text("UF", c2 + 8, ly + 14, { size: 7 });
  text(caixa.cep ? `CEP ${caixa.cep}` : "", M + 8, ly + 30, { bold: true, size: 8.5 });
  text((caixa.municipio || "").toUpperCase(), c1 + 8, ly + 30, { bold: true, size: 8.5 });
  text((caixa.uf || "").toUpperCase(), c2 + 8, ly + 30, { bold: true, size: 8.5 });
  doc.line(c1, ly, c1, ly + 43);
  doc.line(c2, ly, c2, ly + 43);
  ly += 43;
  leftLine();

  // Bloco final da esquerda
  text("N.º de Servidores:", M + 8, ly + 20, { size: 8.5 });
  text(String(folha.num_empregados ?? 0), M + 120, ly + 20, { bold: true, size: 9.5 });
  text("Salário de Contribuição:", M + 8, ly + 44, { size: 8.5 });
  text(`R$ ${num(n(folha.base_calculo))}`, M + 120, ly + 44, { bold: true, size: 10 });
  text("Grupo Folha :", M + 8, ly + 66, { size: 8.5 });
  text(folha.grupo_folha || "1 - Normal", M + 120, ly + 66, { bold: true, size: 9 });
  text(`Aliquota Associados: ${pct(n(folha.aliquota_servidor))}`, M + 8, ly + 92, { size: 8 });
  text(`Aliquota Empresa: ${pct(n(folha.aliquota_patronal))}`, M + 8, ly + 104, { size: 8 });
  text(`Aliquota Suplementar: ${pct(n(folha.aliquota_suplementar))}`, M + 8, ly + 116, { size: 8 });

  return doc;
}

export const guiaFileName = (folha: GuiaFolha) =>
  `guia-${(folha.centro_custo || "guia").replace(/\s+/g, "-").toLowerCase()}-${folha.mes_referencia}.pdf`;

export async function downloadGuia(folha: GuiaFolha, caixa?: GuiaCaixa, logoUrl?: string | null) {
  const logo = await urlToDataUrl(logoUrl);
  buildGuiaPDF(folha, caixa, logo).save(guiaFileName(folha));
}

export async function previewGuia(folha: GuiaFolha, caixa?: GuiaCaixa, logoUrl?: string | null) {
  const logo = await urlToDataUrl(logoUrl);
  const url = buildGuiaPDF(folha, caixa, logo).output("bloburl");
  window.open(url as unknown as string, "_blank");
}
