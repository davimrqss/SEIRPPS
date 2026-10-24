import { describe, expect, it } from "vitest";
import { buildGuiasPDF, guiaFileName, guiasFileName } from "@/lib/guiaPdf";
import type { GuiaFolha } from "@/lib/guiaPdf";

const guia = (centro_custo: string): GuiaFolha => ({
  centro_custo,
  orgao: "Prefeitura",
  mes_referencia: "2026-10",
  vencimento: "2026-11-20",
  remuneracao: 1000,
  base_calculo: 1000,
  valor_servidor: 140,
  valor_patronal: 200,
  aliquota_servidor: 14,
  aliquota_patronal: 20,
  is_13: false,
  tipo: "folha",
  paga: false,
});

describe("Nome do arquivo da guia", () => {
  it("usa GRPPS seguido da descrição, sem competência", () => {
    expect(guiaFileName({ centro_custo: "Câmara dos Vereadores", mes_referencia: "2026-10" } as GuiaFolha)).toBe("GRPPS - Câmara dos Vereadores.pdf");
  });

  it("com várias guias selecionadas, usa a quantidade no nome", () => {
    expect(guiasFileName([guia("A"), guia("B"), guia("C")])).toBe("GRPPS - 3 guias.pdf");
  });
});

describe("PDF de várias guias", () => {
  it("gera uma página por guia selecionada", () => {
    expect(buildGuiasPDF([guia("A"), guia("B"), guia("C")]).getNumberOfPages()).toBe(3);
  });
});
