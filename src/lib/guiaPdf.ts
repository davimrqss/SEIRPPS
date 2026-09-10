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
  razao_social?: string | null;
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

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const competencia = (mes: string) => {
  const [y, m] = mes.split("-");
  const nome = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${nome}-${y.slice(2)}`;
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

type Row = { label: string; value?: string };

export function buildGuiaPDF(
  folha: GuiaFolha,
  caixa: GuiaCaixa = {},
  logoDataUrl?: string | null
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 36;
  const R = 559;
  const MID = (M + R) / 2;
  const LABEL_W = 132;
  const ROW_H = 16;

  doc.setLineWidth(0.6);
  doc.setDrawColor(60, 60, 60);

  const text = (
    t: string,
    x: number,
    y: number,
    o?: { bold?: boolean; size?: number; align?: "left" | "right" | "center"; maxW?: number }
  ) => {
    doc.setFont("helvetica", o?.bold ? "bold" : "normal").setFontSize(o?.size ?? 7.5);
    doc.setTextColor(20, 20, 20);
    if (o?.maxW) {
      const lines = doc.splitTextToSize(t, o.maxW) as string[];
      doc.text(lines[0] ?? "", x, y, { align: o?.align ?? "left" });
      if (lines[1]) doc.text(lines[1], x, y + 7, { align: o?.align ?? "left" });
      return;
    }
    doc.text(t, x, y, { align: o?.align ?? "left" });
  };

  // ---------- Logo da caixa: centralizada no topo ----------
  let y = 30;
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const h = 52;
      const w = Math.min((props.width / props.height) * h, 180);
      doc.addImage(logoDataUrl, MID - w / 2, y, w, h);
      y += h + 12;
    } catch {
      /* logo inválida: segue sem imagem */
    }
  }
  const razao = (caixa.razao_social || caixa.nome || "").toUpperCase();
  text(razao, MID, y + 4, { align: "center", bold: true, size: 11 });
  y += 20;

  // ---------- Dados ----------
  const bruto = n(folha.remuneracao);
  const base = n(folha.base_calculo);
  const servidor = n(folha.valor_servidor);
  const patronal = n(folha.valor_patronal);
  const suplementar = n(folha.valor_suplementar);
  const deducoes = n(folha.salario_maternidade) + n(folha.salario_familia) + n(folha.aux_doenca);
  const juros = n(folha.juros_multa);
  const somaPatronal = patronal + suplementar;
  const pagarPatronal = somaPatronal - deducoes + juros;
  const decimo = folha.is_13 ? "Sim" : "Não";
  const comp = competencia(folha.mes_referencia);
  const venc = isoToBR(folha.vencimento).replace(/-/g, "/");
  const orgaoLabel = [folha.orgao, folha.centro_custo].filter(Boolean).join(" - ");

  const aliq = (v: number, valor: number) =>
    `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %   (${brl(valor)})`;

  const drawSection = (titulo: string, left: Row[], right: Row[], startY: number) => {
    // Faixa do título
    doc.setFillColor(226, 232, 240);
    doc.rect(M, startY, R - M, 16, "F");
    doc.rect(M, startY, R - M, 16);
    text(titulo, MID, startY + 11, { align: "center", bold: true, size: 9 });

    let top = startY + 16;
    // Subtítulo
    doc.rect(M, top, R - M, 18);
    text("GUIA DE RECOLHIMENTO PREVIDENCIÁRIO", MID, top + 12, { align: "center", bold: true, size: 8.5 });
    top += 18;

    const rows = Math.max(left.length, right.length);
    const h = rows * ROW_H;
    doc.rect(M, top, R - M, h);
    doc.line(MID, top, MID, top + h);
    doc.line(M + LABEL_W, top, M + LABEL_W, top + h);
    doc.line(MID + LABEL_W, top, MID + LABEL_W, top + h);

    const paint = (list: Row[], x0: number, x1: number) => {
      list.forEach((row, i) => {
        const ry = top + i * ROW_H;
        if (i > 0) doc.line(x0, ry, x1, ry);
        text(row.label, x0 + 4, ry + 11, { size: 7, maxW: LABEL_W - 8 });
        if (row.value) text(row.value, x0 + LABEL_W + 4, ry + 11, { size: 7.5, bold: true, maxW: x1 - x0 - LABEL_W - 8 });
      });
    };
    paint(left, M, MID);
    paint(right, MID, R);
    top += h;

    // Observações
    doc.rect(M, top, R - M, 44);
    text("OBSERVAÇÕES", MID, top + 12, { align: "center", size: 7 });
    return top + 44;
  };

  // ---------- Guia Patronal ----------
  const patronalLeft: Row[] = [
    { label: "RAZÃO SOCIAL", value: razao },
    { label: "CNPJ", value: caixa.cnpj || "-" },
    { label: "ÓRGÃO PAGADOR", value: orgaoLabel || "-" },
    { label: "PLANO DE BENEFÍCIO", value: "Plano Previdenciário" },
    { label: "COMPETÊNCIA", value: comp },
    { label: "DÉCIMO", value: decimo },
    { label: "VENCIMENTO", value: venc },
  ];
  const patronalRight: Row[] = [
    { label: "TOTAL BRUTO", value: brl(bruto) },
    { label: "BASE DE CÁLCULO", value: brl(base) },
    { label: "ALÍQUOTA PATRONAL", value: aliq(n(folha.aliquota_patronal), patronal) },
    { label: "ALÍQUOTA SUPLEMENTAR", value: aliq(n(folha.aliquota_suplementar), suplementar) },
    { label: "SOMA PATRONAL E SUPLEMENTAR", value: brl(somaPatronal) },
    { label: "DEDUÇÕES", value: brl(deducoes) },
    { label: "TOTAL DA CONTRIBUIÇÃO", value: brl(somaPatronal - deducoes) },
    { label: "JUROS / MULTA", value: brl(juros) },
    { label: "CORREÇÃO (INPC)", value: brl(0) },
    { label: "VALOR A SER PAGO", value: brl(pagarPatronal) },
  ];

  y = drawSection("GUIA PATRONAL", patronalLeft, patronalRight, y) + 20;

  // ---------- Guia Servidor ----------
  const servidorLeft: Row[] = [
    { label: "RAZÃO SOCIAL", value: razao },
    { label: "CNPJ", value: caixa.cnpj || "-" },
    { label: "ÓRGÃO PAGADOR", value: orgaoLabel || "-" },
    { label: "QTD. DE SERVIDORES", value: String(folha.num_empregados ?? 0) },
    { label: "PLANO DE BENEFÍCIO", value: "Plano Previdenciário" },
    { label: "COMPETÊNCIA", value: comp },
    { label: "DÉCIMO", value: decimo },
  ];
  const servidorRight: Row[] = [
    { label: "VENCIMENTO", value: venc },
    { label: "TOTAL BRUTO", value: brl(bruto) },
    { label: "BASE DE CÁLCULO", value: brl(base) },
    { label: "ALÍQUOTA", value: aliq(n(folha.aliquota_servidor), servidor) },
    { label: "SERVIDOR", value: brl(servidor) },
    { label: "TOTAL DA CONTRIBUIÇÃO", value: brl(servidor) },
    { label: "JUROS / MULTA", value: brl(0) },
    { label: "CORREÇÃO (INPC)", value: brl(0) },
    { label: "VALOR A SER PAGO", value: brl(servidor) },
  ];

  y = drawSection("GUIA SERVIDOR", servidorLeft, servidorRight, y);

  // ---------- Total geral ----------
  const total = pagarPatronal + servidor;
  const boxW = 190;
  doc.rect(R - boxW, y + 12, boxW, 22);
  text("Total:", R - boxW + 10, y + 27, { bold: true, size: 10 });
  text(brl(total), R - 10, y + 27, { align: "right", bold: true, size: 10 });

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
