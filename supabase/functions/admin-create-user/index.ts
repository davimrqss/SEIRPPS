import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  nome: z.string().min(1).max(200),
  caixa_id: z.string().uuid().nullable().optional(),
  role: z.enum(["admin", "gestor_financeiro", "operador", "fiscal"]),
  cargo: z.string().max(200).optional(),
})
.superRefine((data, ctx) => {
    if (data.role !== "admin" && !data.caixa_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["caixa_id"],
        message: "A caixa é obrigatória para este perfil",
      });
    }
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Não autenticado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, password, nome, caixa_id, role, cargo } = parsed.data;

    const admin = createClient(url, service);
    const { data: adminRole, error: roleErr } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) return json({ error: "Não foi possível validar a permissão" }, 500);
    if (!adminRole) return json({ error: "Apenas administradores podem criar contas" }, 403);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
    }

    const newUserId = created.user.id;

    const { error: profErr } = await admin
      .from("profiles")
      .upsert(
        { user_id: newUserId, nome, caixa_id : role === "admin" ? null : caixa id, cargo: cargo ?? null },
        { onConflict: "user_id" },
      );
    if (profErr) return json({ error: profErr.message }, 500);

    const { error: roleInsErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role });
    if (roleInsErr) return json({ error: roleInsErr.message }, 500);

    return json({ user_id: newUserId, email });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
