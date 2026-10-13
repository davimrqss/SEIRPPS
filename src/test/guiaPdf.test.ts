import { describe, expect, it } from "vitest";
import { guiaFileName } from "@/lib/guiaPdf";
import type { GuiaFolha } from "@/lib/guiaPdf";

describe("Nome do arquivo da guia", () => {
  it("usa GRPPS seguido da descrição, sem competência", () => {
    expect(guiaFileName({ centro_custo: "Câmara dos Vereadores", mes_referencia: "2026-10" } as GuiaFolha)).toBe("GRPPS - Câmara dos Vereadores.pdf");
  });
});