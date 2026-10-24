import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const BodySchema = z.object({
  sheetName: z.string().trim().min(1).max(100),
  text: z.string().min(1).max(40_000),
});

const COLUMNS = ["linha_cabecalho", "descricao", "remuneracao", "base_calculo", "salario_familia", "salario_maternidade", "aux_doenca", "valor_servidor", "valor_patronal", "pago_servidor", "data_pagamento_servidor", "pago_patronal", "data_pagamento_patronal"] as const;
const ResultSchema = z.object(Object.fromEntries(COLUMNS.map((key) => [key, z.number().int().min(0).max(5000)])) as Record<typeof COLUMNS[number], z.ZodNumber>);

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Você analisa a estrutura de planilhas brasileiras de resumo de base de cálculo previdenciária (RPPS). A planilha chega como linhas separadas por TAB; cada linha começa com "L<número>", o número real da linha no Excel. As colunas são numeradas a partir de 1 logo após esse marcador (a primeira célula depois de "L<número>" é a coluna 1, mesmo quando vazia).
Não extraia valores. Devolva somente o número de cada coluna:
- linha_cabecalho: número da linha Excel do cabeçalho principal (a linha com "Centro de Custo", "Remuneração" etc.).
- descricao: coluna com o rótulo do centro de custo/descrição (ex.: "102001-GUARDA MUNICIPAL").
- remuneracao, base_calculo: colunas Remuneração e Base de Cálculo.
- salario_familia, salario_maternidade, aux_doenca: colunas das deduções correspondentes (valores, não quantidades).
- valor_servidor e valor_patronal: valores A SEREM repassados do servidor/segurado e patronal (não as colunas de diferença, corrigido ou total).
- pago_servidor e pago_patronal: valores JÁ repassados (seção "Valores Repassados").
- data_pagamento_servidor e data_pagamento_patronal: colunas da data do repasse de cada parte.
Use 0 para qualquer coluna inexistente. Nunca invente colunas.`;

const resultJsonSchema = {
  type: "object",
  properties: Object.fromEntries(COLUMNS.map((key) => [key, { type: "integer" }])),
  required: [...COLUMNS],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode, safe: true });

async function callGemini(apiKey: string, sheetName: string, text: string, signal: AbortSignal) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: `Aba: ${sheetName}\n\n${text}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: resultJsonSchema,
      thinkingConfig: { thinkingLevel: "low" },
    },
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal,
    });

    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (2 ** attempt) + Math.random() * 300);
      continue;
    }

    const payload = await response.json().catch(() => null) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null;

    if (!response.ok) {
      console.error("Gemini error", response.status, JSON.stringify(payload)?.slice(0, 500));
      if (response.status === 401 || response.status === 403) throw fail("A chave do Google AI não foi aceita. Verifique a chave no Google AI Studio.", 403);
      if (response.status === 429) throw fail("O limite temporário da API do Google foi atingido. Aguarde alguns minutos e tente novamente.", 429);
      if (response.status === 404) throw fail("O modelo do Google Gemini usado pela importação não está disponível para esta chave.", 404);
      if (response.status === 400) throw fail("O Google Gemini não aceitou o conteúdo desta aba.", 400);
      throw fail("O Google Gemini está temporariamente indisponível. Tente novamente em instantes.", 503);
    }

    const output = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!output) throw fail("O Gemini não retornou dados para esta aba.", 422);
    let decoded: unknown;
    try { decoded = JSON.parse(output); } catch { throw fail("O Gemini retornou uma resposta que não pôde ser lida.", 422); }
    const validated = ResultSchema.safeParse(decoded);
    if (!validated.success) throw fail("O Gemini não conseguiu identificar as colunas desta aba.", 422);
    return validated.data;
  }
  throw fail("O Google Gemini está temporariamente indisponível. Tente novamente em instantes.", 503);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json({ error: "Não autenticado" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!url || !anonKey || !serviceKey || !geminiKey) return json({ error: "A análise por IA não está configurada." }, 500);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: roles, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (roleError) return json({ error: "Não foi possível validar a permissão." }, 500);
    if (!(roles ?? []).some(({ role }) => ["admin", "gestor_financeiro", "operador"].includes(role))) {
      return json({ error: "Seu perfil não pode importar guias." }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "O conteúdo da planilha é inválido ou muito grande." }, 400);

    return json(await callGemini(geminiKey, parsed.data.sheetName, parsed.data.text, req.signal));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return json({ error: "Análise cancelada." }, 499);
    if (error && typeof error === "object" && "safe" in error) {
      const e = error as Error & { statusCode: number };
      return json({ error: e.message }, e.statusCode);
    }
    console.error("analyze-guias-planilha", error);
    return json({ error: "Erro inesperado ao analisar a planilha." }, 500);
  }
});
