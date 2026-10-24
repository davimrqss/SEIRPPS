import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";

const BodySchema = z.object({
  sheetName: z.string().trim().min(1).max(100),
  text: z.string().min(1).max(80_000),
});

const RowSchema = z.object({
  linha: z.number().int().nonnegative(),
  codigo: z.string().max(40),
  descricao: z.string().max(200),
  remuneracao: z.number().finite(),
  base_calculo: z.number().finite(),
  salario_familia: z.number().finite(),
  salario_maternidade: z.number().finite(),
  aux_doenca: z.number().finite(),
  valor_servidor: z.number().finite(),
  valor_patronal: z.number().finite(),
  pago_servidor: z.number().finite(),
  data_pagamento_servidor: z.string().max(10),
  pago_patronal: z.number().finite(),
  data_pagamento_patronal: z.string().max(10),
  observacoes: z.string().max(500),
});
const ResultSchema = z.object({ rows: z.array(RowSchema).max(300) });

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Você lê planilhas brasileiras de resumo de base de cálculo previdenciária (RPPS). A planilha chega como linhas separadas por TAB; cada linha começa com "L<número>" indicando o número real da linha no Excel. Identifique as linhas de cabeçalho e use-as para mapear as colunas.
Retorne exatamente uma linha de saída para cada linha de centro de custo/descrição que tenha remuneração, base de cálculo ou contribuição maior que zero. Ignore linhas vazias, linhas de TOTAL, subtotais e resumos de repasse abaixo da tabela (ex.: "Repasses ADM", "FUNDEB", "Agentes").
Campos:
- linha: número da linha Excel (o número após "L").
- codigo: código numérico no início do rótulo (ex.: "102001" em "102001-GUARDA MUNICIPAL"); vazio se não houver.
- descricao: o rótulo sem o código e sem hífen inicial, sem espaços extras (ex.: "GUARDA MUNICIPAL").
- remuneracao: coluna Remuneração. base_calculo: coluna Base Cálculo.
- salario_familia, salario_maternidade, aux_doenca: colunas de dedução correspondentes, como valores positivos.
- valor_servidor: valor a ser repassado do servidor/segurado. valor_patronal: valor a ser repassado patronal.
- pago_servidor e pago_patronal: valores já repassados (seção "Valores Repassados"); 0 se vazio.
- data_pagamento_servidor e data_pagamento_patronal: data do repasse no formato AAAA-MM-DD; vazio se não houver.
- observacoes: apenas ambiguidades relevantes; vazio se não houver.
Copie os números exatamente como aparecem (já estão em formato decimal com ponto). Use 0 para valores ausentes. Nunca invente linhas, códigos, valores ou datas.`;

const rowJsonSchema = {
  type: "object",
  properties: {
    linha: { type: "integer" }, codigo: { type: "string" }, descricao: { type: "string" },
    remuneracao: { type: "number" }, base_calculo: { type: "number" },
    salario_familia: { type: "number" }, salario_maternidade: { type: "number" }, aux_doenca: { type: "number" },
    valor_servidor: { type: "number" }, valor_patronal: { type: "number" },
    pago_servidor: { type: "number" }, data_pagamento_servidor: { type: "string" },
    pago_patronal: { type: "number" }, data_pagamento_patronal: { type: "string" },
    observacoes: { type: "string" },
  },
  required: [
    "linha", "codigo", "descricao", "remuneracao", "base_calculo", "salario_familia",
    "salario_maternidade", "aux_doenca", "valor_servidor", "valor_patronal", "pago_servidor",
    "data_pagamento_servidor", "pago_patronal", "data_pagamento_patronal", "observacoes",
  ],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode, safe: true });

async function callGemini(apiKey: string, sheetName: string, text: string, signal: AbortSignal) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: `Aba: ${sheetName}\n\n${text}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object", properties: { rows: { type: "array", items: rowJsonSchema } }, required: ["rows"] },
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
    if (!validated.success) throw fail("O Gemini não conseguiu organizar os valores desta aba.", 422);
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
