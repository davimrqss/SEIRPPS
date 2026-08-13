import jsPDF from "jspdf";
import { fmtBRL, isoToBR } from "./format";

export interface GuiaFolha {
  centro_custo: string;
  orgao: string;
  mes_referencia: string;
  vencimento: string;
  remuneracao: number | string;
  base_calculo: number | string;
  valor_servidor: number | string;
  valor_patronal: number | string;
  aliquota_servidor: number | string;
  aliquota_patronal: number | string;
  is_13: boolean;
  tipo: string;
  paga: boolean;
}

const formatMes = (mes: string) =>
  new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export function buildGuiaPDF(folha: GuiaFolha, caixaNome = "Caixa de Previdência") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  doc.setFillColor(22, 101, 82);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(caixaNome, M, 42);
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text("Guia de Recolhimento de Contribuição Previdenciária", M, 62);
  y = 130;

  doc.setTextColor(30, 30, 30);
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(label, M, y);
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.setTextColor(25, 25, 25);
    doc.text(value, W - M, y, { align: "right" });
    y += 24;
    doc.setDrawColor(230, 230, 230);
    doc.line(M, y - 14, W - M, y - 14);
  };

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Identificação", M, y);
  y += 24;
  row("Centro de Custo", folha.centro_custo);
  row("Órgão", folha.orgao);
  row("Mês de Referência", formatMes(folha.mes_referencia));
  row("Vencimento", isoToBR(folha.vencimento));
  row("Tipo de Folha", folha.tipo.charAt(0).toUpperCase() + folha.tipo.slice(1));
  row("13° Salário", folha.is_13 ? "Sim" : "Não");

  y += 12;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Valores", M, y);
  y += 24;
  row("Remuneração", fmtBRL(Number(folha.remuneracao)));
  row("Base de Cálculo", fmtBRL(Number(folha.base_calculo)));
  row(`Contribuição Servidor (${folha.aliquota_servidor}%)`, fmtBRL(Number(folha.valor_servidor)));
  row(`Contribuição Patronal (${folha.aliquota_patronal}%)`, fmtBRL(Number(folha.valor_patronal)));

  const total = Number(folha.valor_servidor) + Number(folha.valor_patronal);
  y += 8;
  doc.setFillColor(240, 247, 244);
  doc.rect(M, y - 4, W - M * 2, 42, "F");
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.setTextColor(22, 101, 82);
  doc.text("TOTAL A RECOLHER", M + 14, y + 24);
  doc.setFontSize(14);
  doc.text(fmtBRL(total), W - M - 14, y + 24, { align: "right" });
  y += 70;

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Situação: ${folha.paga ? "Paga" : "Pendente"}`, M, y);
  y += 16;
  doc.text(
    `Documento gerado em ${new Date().toLocaleString("pt-BR")}`,
    M,
    y
  );

  return doc;
}

export const guiaFileName = (folha: GuiaFolha) =>
  `guia-${folha.centro_custo.replace(/\s+/g, "-").toLowerCase()}-${folha.mes_referencia}.pdf`;

export function downloadGuia(folha: GuiaFolha, caixaNome?: string) {
  buildGuiaPDF(folha, caixaNome).save(guiaFileName(folha));
}

export function previewGuia(folha: GuiaFolha, caixaNome?: string) {
  const url = buildGuiaPDF(folha, caixaNome).output("bloburl");
  window.open(url as unknown as string, "_blank");
}
