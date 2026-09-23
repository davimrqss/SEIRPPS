import { createClient } from "npm:@supabase/supabase-js@2";
import backupData from "./backup-data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const users = [
  {
    id: "b23c4a72-05fe-405c-af80-5e2a4fdc3eb1",
    email: "davimarques2290@gmail.com",
    passwordEnv: "TEMP_MIGRATION_DAVI_PASSWORD",
    nome: "Davi Marques",
  },
  {
    id: "7f72b661-283e-4bd2-8322-f052ee4b310c",
    email: "meta.investing@outlook.com",
    passwordEnv: "TEMP_MIGRATION_META_PASSWORD",
    nome: "Gabriel Martins",
  },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Método inválido" }, { status: 405, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return Response.json({ error: "Configuração indisponível" }, { status: 500, headers: corsHeaders });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profiles, error: profilesError } = await admin.from("profiles").select("id").limit(1);
  if (profilesError) return Response.json({ error: profilesError.message }, { status: 500, headers: corsHeaders });
  if ((profiles?.length ?? 0) > 0) {
    return Response.json({ error: "Restauração já iniciada" }, { status: 409, headers: corsHeaders });
  }

  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return Response.json({ error: listError.message }, { status: 500, headers: corsHeaders });

  const restored: Array<{ email: string; id: string }> = [];
  for (const user of users) {
    const password = Deno.env.get(user.passwordEnv);
    if (!password) return Response.json({ error: "Senha de restauração indisponível" }, { status: 500, headers: corsHeaders });

    const existing = existingUsers.users.find((candidate) => candidate.id === user.id || candidate.email?.toLowerCase() === user.email);
    const result = existing
      ? await admin.auth.admin.updateUserById(existing.id, { email: user.email, password, email_confirm: true, user_metadata: { nome: user.nome } })
      : await admin.auth.admin.createUser({ id: user.id, email: user.email, password, email_confirm: true, user_metadata: { nome: user.nome } });
    const { data, error } = result;
    if (error || !data.user) {
      return Response.json({ error: error?.message ?? `Falha ao recriar ${user.email}` }, { status: 400, headers: corsHeaders });
    }
    restored.push({ email: user.email, id: data.user.id });
  }

  const order = ["caixas_previdencia", "orgaos", "centros_custo", "folhas_pagamento", "funcionarios", "pagamentos", "profiles", "user_roles", "solicitacoes_conta"] as const;
  const imported: Record<string, number> = {};
  for (const table of order) {
    const rows = backupData[table];
    if (!rows.length) {
      imported[table] = 0;
      continue;
    }
    const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
    if (error) return Response.json({ error: `${table}: ${error.message}`, restored, imported }, { status: 500, headers: corsHeaders });
    imported[table] = rows.length;
  }

  return Response.json({ restored, imported }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});