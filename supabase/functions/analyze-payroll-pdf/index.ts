import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { NoObjectGeneratedError, Output, streamText } from "npm:ai";
import { z } from "npm:zod";
import { createResponsesProvider, getRequestRunId, responseHeaders } from "../_shared/ai-gateway.ts";

const BodySchema = z.object({
  pages: z.array(z.string().min(1).max(14_000)).min(1).max(100),
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
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !anonKey || !serviceKey || !aiKey) {
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

    const initialRunId = getRequestRunId(req);
    const gateway = createResponsesProvider(aiKey, initialRunId);
    const result = streamText({
      model: gateway.provider.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: ResultSchema }),
      system: `Você extrai resumos consolidados de folhas de pagamento brasileiras. Cada bloco corresponde a um centro de custo e pode repetir dados em páginas adjacentes. Retorne exatamente uma linha por código de centro, nunca uma linha por servidor. Use exclusivamente os totais consolidados do bloco: TOTAL REMUNERAÇÕES, Qtde de Funcionários e ENCARGOS PREVIDENCIÁRIOS RPPS. A base_calculo é BASE DE CÁLCULO PREVIDÊNCIA PRÓPRIA. valor_servidor é VALOR DA CONTRIBUIÇÃO DO SEGURADO (PREV. PRÓPRIA). valor_patronal é VALOR CONTRIBUIÇÃO PATRONAL (PREV. PRÓPRIA), antes das deduções. valor_suplementar é a contribuição suplementar. Extraia salário maternidade, salário família e auxílio doença da seção RPPS. Converta números brasileiros para números decimais. competencia deve ser AAAA-MM. grupo_folha deve ser "1 - Normal" ou "2 - 13° Salário". Use 0 quando um valor monetário não estiver presente. Não invente códigos, valores ou datas. Em observacoes, descreva somente ambiguidades relevantes.`,
      prompt: `Analise estes blocos de resumo e devolva JSON estruturado. Remova duplicatas pelo código do centro.\n\n${parsed.data.pages.join("\n\n---\n\n")}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
      maxRetries: 2,
      abortSignal: req.signal,
    });

    try {
      const output = await result.output;
      return json(output, 200, responseHeaders(gateway.getRunId()));
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return json({ error: "A IA não conseguiu estruturar os resumos deste arquivo." }, 422, responseHeaders(gateway.getRunId()));
      }
      throw error;
    }
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