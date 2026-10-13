import { z } from "zod";

// Dates are required and valid, but neither is restricted to a day of the month.
export const guiaDatesSchema = z.object({
  dataEmissao: z.string().date(),
  vencimento: z.string().date(),
});