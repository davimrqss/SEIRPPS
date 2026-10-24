import { describe, expect, it } from "vitest";
import { extrairGuias, linhasParaTexto, type MapaColunas } from "@/lib/planilhaGuias";

const mapa: MapaColunas = {
  linha_cabecalho: 3, descricao: 2, remuneracao: 3, base_calculo: 4, salario_familia: 5, salario_maternidade: 6,
  aux_doenca: 7, valor_servidor: 8, valor_patronal: 9, pago_servidor: 10, data_pagamento_servidor: 11,
  pago_patronal: 0, data_pagamento_patronal: 0,
};

const aba = linhasParaTexto([
  [null, "Centro de Custo", "Remuneração", "Base Cálculo", "SF", "SM", "AD", "Servidor (11%)", "Patronal", "Repassado", "Data"],
  [null, "101012-GABINETE DO VICE PREFEITO", null, null, null, null, null, null, null, null, null],
  [null, "102001-GUARDA MUNICIPAL", 119238.59, 85629.76, null, null, null, 9419.28, 11568.62, 9419.28, new Date(2026, 7, 5)],
  [null, "TOTAL", 119238.59, 85629.76, 0, 0, 0, 9419.28, 11568.62, 9419.28, null],
  [null, "80000 SECRETARIA DEPOIS DO TOTAL", 6000, 6000, null, null, null, 660, 810.6, null, null],
], 3);

describe("planilha de guias", () => {
  it("mantém o número real da linha do Excel e ignora linhas vazias", () => {
    expect(aba.texto.split("\n")[0]).toBe("L3\t\tCentro de Custo\tRemuneração\tBase Cálculo\tSF\tSM\tAD\tServidor (11%)\tPatronal\tRepassado\tData");
    expect(aba.linhas.has(4)).toBe(true);
  });

  it("cria uma guia por linha com valores, copiando exatamente as células", () => {
    const guias = extrairGuias(aba, mapa);
    expect(guias).toHaveLength(1);
    expect(guias[0]).toMatchObject({
      linha: 5, codigo: "102001", descricao: "GUARDA MUNICIPAL", remuneracao: 119238.59, base_calculo: 85629.76,
      valor_servidor: 9419.28, valor_patronal: 11568.62, pago_servidor: 9419.28, data_pagamento_servidor: "2026-08-05", pago_patronal: 0,
    });
  });

  it("para de ler na linha de TOTAL", () => {
    expect(extrairGuias(aba, mapa).some((guia) => guia.descricao.includes("DEPOIS DO TOTAL"))).toBe(false);
  });
});
