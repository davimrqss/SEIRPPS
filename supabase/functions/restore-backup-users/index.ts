import { createClient } from "npm:@supabase/supabase-js@2";

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

  const restored: Array<{ email: string; id: string }> = [];
  for (const user of users) {
    const password = Deno.env.get(user.passwordEnv);
    if (!password) return Response.json({ error: "Senha de restauração indisponível" }, { status: 500, headers: corsHeaders });

    const { data, error } = await admin.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { nome: user.nome },
    });
    if (error || !data.user) {
      return Response.json({ error: error?.message ?? `Falha ao recriar ${user.email}` }, { status: 400, headers: corsHeaders });
    }
    restored.push({ email: user.email, id: data.user.id });
  }

  return Response.json({ restored }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});