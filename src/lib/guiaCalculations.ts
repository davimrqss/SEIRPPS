import type { Tables } from "@/integrations/supabase/types";

export type Guia = Tables<"folhas_pagamento">;
export type Pagamento = Tables<"pagamentos">;
export type NaturezaPagamento = "servidor" | "patronal";

const number = (value: unknown) => Number(value ?? 0) || 0;
const round = (value: number) => Math.round(value * 100) / 100;

export function calcularValoresGuia(guia: Guia) {
  const servidorBase = number(guia.valor_servidor);
  const patronalBase = number(guia.valor_patronal) + number(guia.valor_suplementar)
    - number(guia.salario_maternidade) - number(guia.salario_familia) - number(guia.aux_doenca);
  const jurosServidor = servidorBase * number(guia.aliquota_juros_servidor) / 100;
  const jurosPatronal = patronalBase * number(guia.aliquota_juros_patronal) / 100;
  const correcaoServidor = servidorBase * number(guia.aliquota_correcao_servidor) / 100;
  const correcaoPatronal = patronalBase * number(guia.aliquota_correcao_patronal) / 100;

  return {
    servidorBase: round(servidorBase),
    patronalBase: round(patronalBase),
    jurosServidor: round(jurosServidor),
    jurosPatronal: round(jurosPatronal),
    correcaoServidor: round(correcaoServidor),
    correcaoPatronal: round(correcaoPatronal),
    devidoServidor: round(servidorBase + jurosServidor + correcaoServidor),
    devidoPatronal: round(patronalBase + jurosPatronal + correcaoPatronal),
  };
}

export function resumirPagamentos(guia: Guia, pagamentos: Pagamento[]) {
  const valores = calcularValoresGuia(guia);
  const pagos = pagamentos.filter((p) => p.folha_id === guia.id).reduce(
    (acc, pagamento) => {
      if (pagamento.natureza === "servidor") acc.servidor += number(pagamento.valor_recebido);
      if (pagamento.natureza === "patronal") acc.patronal += number(pagamento.valor_recebido);
      if (!pagamento.natureza) acc.naoClassificado += number(pagamento.valor_recebido);
      return acc;
    },
    { servidor: 0, patronal: 0, naoClassificado: 0 },
  );

  const saldoServidor = Math.max(0, round(valores.devidoServidor - pagos.servidor));
  const saldoPatronal = Math.max(0, round(valores.devidoPatronal - pagos.patronal));
  const status = (pago: number, devido: number) => pago <= 0 ? "pendente" : pago + 0.009 >= devido ? "pago" : "parcial";

  return {
    ...valores,
    pagoServidor: round(pagos.servidor),
    pagoPatronal: round(pagos.patronal),
    pagamentoNaoClassificado: round(pagos.naoClassificado),
    saldoServidor,
    saldoPatronal,
    statusServidor: status(pagos.servidor, valores.devidoServidor),
    statusPatronal: status(pagos.patronal, valores.devidoPatronal),
    paga: saldoServidor <= 0.009 && saldoPatronal <= 0.009,
  };
}