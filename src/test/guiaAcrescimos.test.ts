import { describe, expect, it } from "vitest";
import { calcularValoresGuia, camposAcrescimosGuia, type Guia } from "@/lib/guiaCalculations";
import { buildGuiaPDF } from "@/lib/guiaPdf";

const baseGuia = {
  valor_servidor: 1000, valor_patronal: 2000, valor_suplementar: 100,
  salario_maternidade: 50, salario_familia: 30, aux_doenca: 20,
  centro_custo: "Teste", orgao: "Órgão", mes_referencia: "2026-10",
  data_emissao: "2026-10-21", vencimento: "2026-11-20",
  remuneracao: 10000, base_calculo: 10000, aliquota_servidor: 10,
  aliquota_patronal: 20, is_13: false, tipo: "folha", paga: false,
} as Guia;

describe("Acréscimos das guias", () => {
  it("aplica juros e correção comuns sobre cada contribuição", () => {
    const campos = camposAcrescimosGuia(2, true, { aliquota_correcao: 3, indice_correcao: "IPCA" });
    const valores = calcularValoresGuia({ ...baseGuia, ...campos });
    expect(valores.jurosServidor).toBe(20);
    expect(valores.jurosPatronal).toBe(40);
    expect(valores.correcaoServidor).toBe(30);
    expect(valores.correcaoPatronal).toBe(60);
    expect(valores.devidoServidor).toBe(1050);
    expect(valores.devidoPatronal).toBe(2100);
  });
  it("Não zera a correção das duas partes", () => {
    const campos = camposAcrescimosGuia(2, false, { aliquota_correcao: 3, indice_correcao: "INPC" });
    expect(campos.aliquota_correcao_servidor).toBe(0);
    expect(campos.aliquota_correcao_patronal).toBe(0);
    expect(campos.indice_correcao).toBeNull();
  });
  it("preserva taxas históricas separadas no cálculo", () => {
    const valores = calcularValoresGuia({ ...baseGuia, aliquota_juros_servidor: 1, aliquota_juros_patronal: 2, aliquota_correcao_servidor: 3, aliquota_correcao_patronal: 4 });
    expect(valores.devidoServidor).toBe(1040);
    expect(valores.devidoPatronal).toBe(2120);
  });
  it("PDF usa o índice salvo e cabe em uma página", () => {
    const guia = { ...baseGuia, ...camposAcrescimosGuia(2, true, { aliquota_correcao: 3, indice_correcao: "IPCA" }) };
    const doc = buildGuiaPDF(guia, { indice_correcao: "INPC" });
    expect(doc.getNumberOfPages()).toBe(1);
    const pdf = doc.output();
    expect(pdf).toContain("IPCA");
    expect(pdf).not.toContain("INPC");
  });
});