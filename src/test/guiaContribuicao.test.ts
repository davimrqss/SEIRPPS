import { describe, expect, it } from "vitest";
import { calcularContribuicao } from "@/lib/guiaCalculations";

describe("Contribuições e alíquotas no cadastro", () => {
  it("calcula a alíquota servidor pela contribuição e base", () => {
    expect(calcularContribuicao(10000, 11, 1400)).toEqual({ contribuicao: 1400, aliquota: 14 });
  });
  it("calcula a alíquota patronal pela contribuição e base", () => {
    expect(calcularContribuicao(10000, 22, 2500)).toEqual({ contribuicao: 2500, aliquota: 25 });
  });
  it("mantém o valor digitado e recalcula a alíquota ao mudar a base", () => {
    expect(calcularContribuicao(20000, 11, 1400)).toEqual({ contribuicao: 1400, aliquota: 7 });
  });
  it("volta a calcular a contribuição ao editar a alíquota", () => {
    expect(calcularContribuicao(10000, 15, null)).toEqual({ contribuicao: 1500, aliquota: 15 });
  });
  it("não divide por zero quando a base ainda está vazia", () => {
    expect(calcularContribuicao(0, 11, 1400)).toEqual({ contribuicao: 1400, aliquota: 0 });
  });
  it("preserva centavos e precisão na alíquota calculada", () => {
    const resultado = calcularContribuicao(9876.54, 11, 1234.56);
    expect(resultado.contribuicao).toBe(1234.56);
    expect(resultado.aliquota).toBeCloseTo(12.49992406247, 9);
  });
});