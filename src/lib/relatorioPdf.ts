import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtBRL } from "./format";

export interface LinhaRelatorio {
  mes: string;
  orgao: string;
  remuneracao: number;
  base: number;
  devidoServidor: number;
  devidoPatronal: number;
  pagoServidor: number;
  pagoPatronal: number;
  saldoServidor: number;
  saldoPatronal: number;
}

const mesBR = (mes: string) => new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

export function downloadRelatorioMensal(
  linhas: LinhaRelatorio[],
  caixaNome: string,
  periodo: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold").setFontSize(16).text("Panorama previdenciário", 40, 42);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`${caixaNome} · ${periodo}`, 40, 59);

  autoTable(doc, {
    startY: 76,
    head: [["Mês", "Órgão", "Remuneração", "Base", "Devido serv.", "Pago serv.", "Saldo devedor servidor", "Devido patr.", "Pago patr.", "Saldo devedor patronal"]],
    body: linhas.map((l) => [mesBR(l.mes), l.orgao, fmtBRL(l.remuneracao), fmtBRL(l.base), fmtBRL(l.devidoServidor), fmtBRL(l.pagoServidor), fmtBRL(l.saldoServidor), fmtBRL(l.devidoPatronal), fmtBRL(l.pagoPatronal), fmtBRL(l.saldoPatronal)]),
    styles: { font: "helvetica", fontSize: 7, cellPadding: 4 },
    headStyles: { fillColor: [30, 120, 95] },
    columnStyles: { 1: { cellWidth: 110 } },
  });

  const total = linhas.reduce((a, l) => ({
    remuneracao: a.remuneracao + l.remuneracao,
    base: a.base + l.base,
    devidoServidor: a.devidoServidor + l.devidoServidor,
    devidoPatronal: a.devidoPatronal + l.devidoPatronal,
    pagoServidor: a.pagoServidor + l.pagoServidor,
    pagoPatronal: a.pagoPatronal + l.pagoPatronal,
    saldoServidor: a.saldoServidor + l.saldoServidor,
    saldoPatronal: a.saldoPatronal + l.saldoPatronal,
  }), { remuneracao: 0, base: 0, devidoServidor: 0, devidoPatronal: 0, pagoServidor: 0, pagoPatronal: 0, saldoServidor: 0, saldoPatronal: 0 });
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`Total: remuneração ${fmtBRL(total.remuneracao)} · base ${fmtBRL(total.base)} · saldo devedor servidor ${fmtBRL(total.saldoServidor)} · saldo devedor patronal ${fmtBRL(total.saldoPatronal)}`, 40, finalY + 22);
  doc.save(`panorama-previdenciario-${periodo.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}