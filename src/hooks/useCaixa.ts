import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Dados completos da caixa ativa (a do perfil, ou a selecionada pelo admin). */
export function useCaixaAtiva() {
  const { activeCaixaId } = useAuth();

  return useQuery({
    queryKey: ["caixa", activeCaixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_previdencia")
        .select("*")
        .eq("id", activeCaixaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeCaixaId,
  });
}

/** Lista de caixas visíveis ao usuário (admins veem todas). */
export function useCaixas() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["caixas", isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_previdencia")
        .select("id, nome, logo_url")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** URL assinada da logo guardada no storage (bucket privado "logos"). */
export function useLogoUrl(path?: string | null) {
  return useQuery({
    queryKey: ["logo-url", path],
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage
        .from("logos")
        .createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
}
