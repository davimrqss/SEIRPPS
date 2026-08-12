// Helpers de formatação para valores em R$ e datas (pt-BR)

/** Formata o que o usuário digita em um campo de moeda: "1520" -> "1.520", "1520,5" -> "1.520,5" */
export function formatCurrencyInput(raw: string): string {
  if (raw == null) return "";
  // mantém apenas dígitos e separador decimal (vírgula ou ponto digitado como decimal)
  let cleaned = raw.replace(/[^\d.,]/g, "");
  // considera apenas a última vírgula como separador decimal
  cleaned = cleaned.replace(/\./g, "");
  const parts = cleaned.split(",");
  let intPart = parts.shift() ?? "";
  let decPart = parts.join("").slice(0, 2);

  intPart = intPart.replace(/^0+(?=\d)/, "");
  const intFormatted = intPart ? Number(intPart).toLocaleString("pt-BR") : "";

  if (cleaned.includes(",")) {
    return `${intFormatted || "0"},${decPart}`;
  }
  return intFormatted;
}

/** Converte o texto de um campo de moeda em número: "1.520,50" -> 1520.5 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Número -> texto para input de moeda: 1520.5 -> "1.520,50" */
export function currencyToInput(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "2026-07-05" -> "05-07-2026" */
export function isoToBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
}

/** "05-07-2026" ou "05/07/2026" -> "2026-07-05" (ou "" se inválido) */
export function brToISO(br: string): string {
  const digits = (br || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  if (isNaN(date.getTime()) || date.getMonth() + 1 !== Number(m) || date.getDate() !== Number(d)) return "";
  return `${y}-${m}-${d}`;
}

/** Máscara de digitação: "05072026" -> "05-07-2026" */
export function maskDateInput(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join("-");
}
