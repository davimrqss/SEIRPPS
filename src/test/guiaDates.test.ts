import { describe, expect, it } from "vitest";
import { guiaDatesSchema } from "@/lib/guiaDates";

describe("Datas livres da guia", () => {
  it("aceita emissão em qualquer dia válido", () => {
    for (const dataEmissao of ["2026-10-01", "2026-10-13", "2026-10-31"]) {
      expect(guiaDatesSchema.safeParse({ dataEmissao, vencimento: "2026-10-20" }).success).toBe(true);
    }
  });
  it("aceita vencimento em qualquer dia válido", () => {
    for (const vencimento of ["2026-10-01", "2026-10-13", "2026-10-31", "2027-02-28"]) {
      expect(guiaDatesSchema.safeParse({ dataEmissao: "2026-10-21", vencimento }).success).toBe(true);
    }
  });
  it("continua rejeitando datas inválidas ou vazias", () => {
    expect(guiaDatesSchema.safeParse({ dataEmissao: "", vencimento: "2026-02-30" }).success).toBe(false);
  });
});