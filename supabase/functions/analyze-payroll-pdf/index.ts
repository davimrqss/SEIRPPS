import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const BodySchema = z.object({
  pages: z.array(z.string().min(1).max(10_000)).min(1).max(5),
});

const RowSchema = z.object({
  codigo_centro_custo: z.string(),
  centro_custo: z.string(),
  competencia: z.string(),
  grupo_folha: z.string(),
  num_servidores: z.number(),
  remuneracao: z.number(),
  base_calculo: z.number(),
  aliquota_servidor: z.number(),
  aliquota_patronal: z.number(),
  aliquota_suplementar: z.number(),
  valor_servidor: z.number(),
  valor_patronal: z.number(),
  valor_suplementar: z.number(),
  salario_maternidade: z.number(),
  salario_familia: z.number(),
  aux_doenca: z.number(),
  observacoes: z.string(),
});

const ResultSchema = z.object({ rows: z.array(RowSchema) });

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SYSTEM_PROMPT = `Você extrai resumos consolidados de folhas de pagamento brasileiras. Cada bloco corresponde a um centro de custo e pode repetir dados em páginas adjacentes. Retorne exatamente uma linha por código de centro, nunca uma linha por servidor. Use exclusivamente os totais consolidados do bloco: TOTAL REMUNERAÇÕES, Qtde de Funcionários e ENCARGOS PREVIDENCIÁRIOS RPPS. A base_calculo é BASE DE CÁLCULO PREVIDÊNCIA PRÓPRIA. valor_servidor é VALOR DA CONTRIBUIÇÃO DO SEGURADO (PREV. PRÓPRIA). valor_patronal é VALOR CONTRIBUIÇÃO PATRONAL (PREV. PRÓPRIA), antes das deduções. valor_suplementar é a contribuição suplementar. Extraia salário maternidade, salário família e auxílio doença da seção RPPS. Converta números brasileiros para números decimais. competencia deve ser AAAA-MM. grupo_folha deve ser "1 - Normal" ou "2 - 13° Salário". Use 0 quando um valor monetário não estiver presente. Não invente códigos, valores ou datas. Em observacoes, descreva somente ambiguidades relevantes.`;

const rowJsonSchema = {
  type: "object",
  properties: {
    codigo_centro_custo: { type: "string" }, centro_custo: { type: "string" },
    competencia: { type: "string" }, grupo_folha: { type: "string" },
    num_servidores: { type: "number" }, remuneracao: { type: "number" },
    base_calculo: { type: "number" }, aliquota_servidor: { type: "number" },
    aliquota_patronal: { type: "number" }, aliquota_suplementar: { type: "number" },
    valor_servidor: { type: "number" }, valor_patronal: { type: "number" },
    valor_suplementar: { type: "number" }, salario_maternidade: { type: "number" },
    salario_familia: { type: "number" }, aux_doenca: { type: "number" },
    observacoes: { type: "string" },
  },
  required: [
    "codigo_centro_custo", "centro_custo", "competencia", "grupo_folha",
    "num_servidores", "remuneracao", "base_calculo", "aliquota_servidor",
    "aliquota_patronal", "aliquota_suplementar", "valor_servidor", "valor_patronal",
    "valor_suplementar", "salario_maternidade", "salario_familia", "aux_doenca",
    "observacoes",
  ],
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function callGemini(apiKey: string, pages: string[], signal: AbortSignal) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: `Analise estes blocos de resumo e devolva JSON estruturado. Remova duplicatas pelo código do centro.\n\n${pages.join("\n\n---\n\n")}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { rows: { type: "array", items: rowJsonSchema } },
        required: ["rows"],
      },
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
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * (2 ** attempt));
      continue;
    }

    const payload = await response.json().catch(() => null) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      promptFeedback?: { blockReason?: string };
    } | null;

    if (!response.ok) {
      const safeMessage = response.status === 401 || response.status === 403
        ? "A chave do Google AI não foi aceita. Verifique a chave e as permissões no Google AI Studio."
        : response.status === 429
          ? "O limite temporário da API do Google foi atingido. Aguarde e tente novamente."
          : "O Google Gemini não conseguiu analisar este lote.";
      throw Object.assign(new Error(safeMessage), { statusCode: response.status });
    }

    const candidate = payload?.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) {
      throw Object.assign(new Error("O Gemini não retornou dados para este lote."), { statusCode: 422 });
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(text);
    } catch {
      throw Object.assign(new Error("O Gemini retornou uma resposta que não pôde ser lida."), { statusCode: 422 });
    }
    const validated = ResultSchema.safeParse(decoded);
    if (!validated.success) {
      throw Object.assign(new Error("O Gemini não conseguiu estruturar os resumos deste lote."), { statusCode: 422 });
    }
    return validated.data;
  }

  throw Object.assign(new Error("O Google Gemini está temporariamente indisponível."), { statusCode: 503 });
}

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Não autenticado" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!url || !anonKey || !serviceKey || !geminiKey) {
      return json({ error: "A análise por IA não está configurada." }, 500);
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: roles, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (roleError) return json({ error: "Não foi possível validar a permissão." }, 500);
    const canImport = (roles ?? []).some(({ role }) =>
      ["admin", "gestor_financeiro", "operador"].includes(role),
    );
    if (!canImport) return json({ error: "Seu perfil não pode importar folhas." }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "O conteúdo do PDF é inválido ou excede o limite." }, 400);

    const output = await callGemini(geminiKey, parsed.data.pages, req.signal);
    return json(output);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "Análise cancelada." }, 499);
    }
    const status = typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500;
    const message = error instanceof Error ? error.message : "Erro inesperado ao analisar o PDF.";
    return json({ error: message }, Number.isFinite(status) ? status : 500);
  }
});