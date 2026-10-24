import jsPDF from "jspdf";
import { isoToBR } from "./format";
import { calcularValoresGuia } from "./guiaCalculations";
import ippnLogo from "@/assets/ippn-logo-fundo-branco.png";

export interface GuiaFolha {
  centro_custo: string;
  codigo_centro_custo?: string | null;
  orgao: string;
  mes_referencia: string;
  data_emissao?: string | null;
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
  aliquota_juros_servidor?: number | string | null;
  aliquota_juros_patronal?: number | string | null;
  aliquota_correcao_servidor?: number | string | null;
  aliquota_correcao_patronal?: number | string | null;
  indice_correcao?: string | null;
  aplica_correcao?: boolean | null;
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
  indice_correcao?: string | null;
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
  return buildGuiasPDF([folha], caixa, logoDataUrl);
}

/** Gera um único PDF com uma guia por página, na ordem recebida. */
export function buildGuiasPDF(
  folhas: GuiaFolha[],
  caixa: GuiaCaixa = {},
  logoDataUrl?: string | null
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: guiasFileName(folhas).replace(/\.pdf$/, "") });
  folhas.forEach((folha, i) => {
    if (i > 0) doc.addPage();
    drawGuia(doc, folha, caixa, logoDataUrl);
  });
  return doc;
}

function drawGuia(
  doc: jsPDF,
  folha: GuiaFolha,
  caixa: GuiaCaixa,
  logoDataUrl?: string | null
) {
  const M = 36;
  const R = 559;
  const MID = (M + R) / 2;
  const LABEL_W = 132;
  const MIN_ROW_H = 16;
  const TEXT_LINE_H = 7;

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
      doc.text(lines, x, y, { align: o?.align ?? "left", lineHeightFactor: 1 });
      return;
    }
    doc.text(t, x, y, { align: o?.align ?? "left" });
  };

  // ---------- Logo da caixa: centralizada e proporcional ----------
  let y = 30;
  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const isJacoprev = /jacoprev/i.test(`${caixa.nome ?? ""} ${caixa.razao_social ?? ""}`);
      const maxH = isJacoprev ? 88 : 60;
      const maxW = isJacoprev ? 288 : 207;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(logoDataUrl, MID - w / 2, y, w, h);
      y += h + 12;
    } catch {
      /* logo inválida: segue sem imagem */
    }
  }
  const razao = (caixa.razao_social || "-").toUpperCase();
  text(razao, MID, y + 4, { align: "center", bold: true, size: 11 });
  y += 20;

  // ---------- Dados ----------
  const bruto = n(folha.remuneracao);
  const base = n(folha.base_calculo);
  const servidor = n(folha.valor_servidor);
  const patronal = n(folha.valor_patronal);
  const suplementar = n(folha.valor_suplementar);
  const deducoes = n(folha.salario_maternidade) + n(folha.salario_familia) + n(folha.aux_doenca);
  const somaPatronal = patronal + suplementar;
  const calc = calcularValoresGuia(folha as Parameters<typeof calcularValoresGuia>[0]);
  const indiceCorrecao = folha.indice_correcao || (folha.aplica_correcao == null ? caixa.indice_correcao : null);
  const correcaoLabel = `CORREÇÃO MONETÁRIA${indiceCorrecao ? ` (${indiceCorrecao})` : ""}`;
  const decimo = folha.is_13 ? "Sim" : "Não";
  const comp = competencia(folha.mes_referencia);
  const emissao = folha.data_emissao ? isoToBR(folha.data_emissao).replace(/-/g, "/") : "-";
  const venc = isoToBR(folha.vencimento).replace(/-/g, "/");

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
    const valueW = MID - M - LABEL_W - 8;
    const lineCount = (value: string | undefined, width: number, size: number) => {
      if (!value) return 1;
      doc.setFont("helvetica", "bold").setFontSize(size);
      return Math.max(1, (doc.splitTextToSize(value, width) as string[]).length);
    };
    const rowHeights = Array.from({ length: rows }, (_, i) => {
      const leftRow = left[i];
      const rightRow = right[i];
      const lines = Math.max(
        lineCount(leftRow?.label, LABEL_W - 8, 7),
        lineCount(leftRow?.value, valueW, 7.5),
        lineCount(rightRow?.label, LABEL_W - 8, 7),
        lineCount(rightRow?.value, valueW, 7.5)
      );
      return Math.max(MIN_ROW_H, lines * TEXT_LINE_H + 6);
    });
    const h = rowHeights.reduce((sum, height) => sum + height, 0);
    doc.rect(M, top, R - M, h);
    doc.line(MID, top, MID, top + h);
    doc.line(M + LABEL_W, top, M + LABEL_W, top + h);
    doc.line(MID + LABEL_W, top, MID + LABEL_W, top + h);

    const paint = (list: Row[], x0: number, x1: number) => {
      let ry = top;
      list.forEach((row, i) => {
        if (i > 0) doc.line(x0, ry, x1, ry);
        text(row.label, x0 + 4, ry + 10, { size: 7, maxW: LABEL_W - 8 });
        if (row.value) text(row.value, x0 + LABEL_W + 4, ry + 10, { size: 7.5, bold: true, maxW: x1 - x0 - LABEL_W - 8 });
        ry += rowHeights[i];
      });
    };
    paint(left, M, MID);
    paint(right, MID, R);
    top += h;

    // Descrição em largura total, no antigo espaço de observações.
    doc.setFont("helvetica", "bold").setFontSize(8);
    const descriptionLines = doc.splitTextToSize(folha.centro_custo || "-", R - M - 16) as string[];
    const descriptionH = Math.max(44, 24 + descriptionLines.length * 9);
    doc.rect(M, top, R - M, descriptionH);
    text("DESCRIÇÃO", MID, top + 12, { align: "center", size: 7 });
    text(folha.centro_custo || "-", M + 8, top + 25, { bold: true, size: 8, maxW: R - M - 16 });
    return top + descriptionH;
  };

  // ---------- Guia Servidor ----------
  const servidorLeft: Row[] = [
    { label: "RAZÃO SOCIAL", value: razao },
    { label: "CNPJ", value: caixa.cnpj || "-" },
    { label: "ÓRGÃO PAGADOR", value: folha.orgao || "-" },
    { label: "PLANO DE BENEFÍCIO", value: "Plano Previdenciário" },
    { label: "COMPETÊNCIA", value: comp },
    { label: "13°", value: decimo },
  ];
  const servidorRight: Row[] = [
    { label: "DATA DE EMISSÃO", value: emissao },
    { label: "VENCIMENTO", value: venc },
    { label: "TOTAL BRUTO", value: brl(bruto) },
    { label: "BASE DE CÁLCULO", value: brl(base) },
    { label: "ALÍQUOTA", value: aliq(n(folha.aliquota_servidor), servidor) },
    { label: "SERVIDOR", value: brl(servidor) },
    { label: "TOTAL DA CONTRIBUIÇÃO", value: brl(servidor) },
    { label: "JUROS / MULTA", value: brl(calc.jurosServidor) },
    { label: correcaoLabel, value: brl(calc.correcaoServidor) },
    { label: "VALOR A SER PAGO", value: brl(calc.devidoServidor) },
  ];

  y = drawSection("GUIA SERVIDOR", servidorLeft, servidorRight, y) + 20;

  // ---------- Guia Patronal ----------
  const patronalLeft: Row[] = [
    { label: "RAZÃO SOCIAL", value: razao },
    { label: "CNPJ", value: caixa.cnpj || "-" },
    { label: "ÓRGÃO PAGADOR", value: folha.orgao || "-" },
    { label: "PLANO DE BENEFÍCIO", value: "Plano Previdenciário" },
    { label: "COMPETÊNCIA", value: comp },
    { label: "13°", value: decimo },
  ];
  const patronalRight: Row[] = [
    { label: "DATA DE EMISSÃO", value: emissao },
    { label: "VENCIMENTO", value: venc },
    { label: "TOTAL BRUTO", value: brl(bruto) },
    { label: "BASE DE CÁLCULO", value: brl(base) },
    { label: "ALÍQUOTA PATRONAL", value: aliq(n(folha.aliquota_patronal), patronal) },
    { label: "ALÍQUOTA SUPLEMENTAR", value: aliq(n(folha.aliquota_suplementar), suplementar) },
    { label: "SOMA PATRONAL E SUPLEMENTAR", value: brl(somaPatronal) },
    { label: "DEDUÇÕES", value: brl(deducoes) },
    { label: "TOTAL DA CONTRIBUIÇÃO", value: brl(somaPatronal - deducoes) },
    { label: "JUROS / MULTA", value: brl(calc.jurosPatronal) },
    { label: correcaoLabel, value: brl(calc.correcaoPatronal) },
    { label: "VALOR A SER PAGO", value: brl(calc.devidoPatronal) },
  ];

  y = drawSection("GUIA PATRONAL", patronalLeft, patronalRight, y) + 20;

  // ---------- Total geral ----------
  const total = calc.devidoPatronal + calc.devidoServidor;
  const boxW = 190;
  doc.rect(R - boxW, y + 12, boxW, 22);
  text("Total:", R - boxW + 10, y + 27, { bold: true, size: 10 });
  text(brl(total), R - 10, y + 27, { align: "right", bold: true, size: 10 });

}

export const guiaFileName = (folha: GuiaFolha) =>
  `GRPPS - ${(folha.centro_custo || "guia").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim()}.pdf`;

/** Nome do arquivo: o da própria guia quando é só uma; senão, a quantidade de guias. */
export const guiasFileName = (folhas: GuiaFolha[]) =>
  folhas.length === 1 ? guiaFileName(folhas[0]) : `GRPPS - ${folhas.length} guias.pdf`;

const logoDaCaixa = (caixa?: GuiaCaixa, logoUrl?: string | null) => {
  const isIPPN = /\bippn\b|ponto novo/i.test(`${caixa?.nome ?? ""} ${caixa?.razao_social ?? ""}`);
  return urlToDataUrl(isIPPN ? ippnLogo : logoUrl);
};

export async function downloadGuia(folha: GuiaFolha, caixa?: GuiaCaixa, logoUrl?: string | null) {
  const logo = await logoDaCaixa(caixa, logoUrl);
  buildGuiaPDF(folha, caixa, logo).save(guiaFileName(folha));
}

export function previewGuia(folha: GuiaFolha, caixa?: GuiaCaixa, logoUrl?: string | null, existingWindow?: Window | null) {
  return previewGuias([folha], caixa, logoUrl, existingWindow);
}

/** Abre várias guias em uma única aba (uma por página), com download manual. */
export async function previewGuias(folhas: GuiaFolha[], caixa?: GuiaCaixa, logoUrl?: string | null, existingWindow?: Window | null) {
  if (!folhas.length) return;
  const popup = existingWindow ?? window.open("", "_blank");
  if (!popup) return;
  popup.opener = null;
  const logo = await logoDaCaixa(caixa, logoUrl);
  const fileName = guiasFileName(folhas);
  const url = URL.createObjectURL(buildGuiasPDF(folhas, caixa, logo).output("blob"));
  const page = popup.document;
  page.title = fileName;
  page.body.replaceChildren();
  const download = page.createElement("a");
  download.href = url;
  download.download = fileName;
  download.textContent = "Baixar PDF";
  const frame = page.createElement("iframe");
  frame.src = url;
  frame.title = fileName;
  frame.width = "100%";
  frame.style.height = "calc(100vh - 48px)";
  frame.style.border = "0";
  const toolbar = page.createElement("nav");
  toolbar.style.height = "32px";
  toolbar.style.fontFamily = "Arial, sans-serif";
  toolbar.append(download);
  page.body.append(toolbar, frame);
  popup.addEventListener("beforeunload", () => URL.revokeObjectURL(url), { once: true });
}
