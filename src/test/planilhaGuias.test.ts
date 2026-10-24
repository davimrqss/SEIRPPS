import { describe, expect, it } from "vitest";
import { linhasParaTexto, valoresConferem } from "@/lib/planilhaGuias";

describe("planilha de guias", () => {
  it("mantém o número real da linha do Excel e ignora linhas vazias", () => {
    const { texto, valoresPorLinha } = linhasParaTexto([
      [null, "Centro de Custo", "Remuneração"],
      [null, null, null],
      [null, "102001-GUARDA MUNICIPAL", 119238.59, 85629.76],
    ], 2);
    expect(texto.split("\n")).toEqual(["L2\t\tCentro de Custo\tRemuneração", "L4\t\t102001-GUARDA MUNICIPAL\t119238.59\t85629.76"]);
    expect(valoresPorLinha.get(4)).toEqual([119238.59, 85629.76]);
  });

  it("aceita valores da IA que existem na linha original", () => {
    expect(valoresConferem([119238.59, 85629.76, 9419.28, 11568.62], [119238.59, 85629.76, 9419.28, 11568.62, 0])).toBe(true);
  });

  it("aponta valor da IA que não existe na linha original", () => {
    expect(valoresConferem([119238.59, 85629.76, 9419.28], [119238.59, 85629.76, 9491.28])).toBe(false);
  });
});
