import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Órgãos da caixa ativa. */
export function useOrgaos() {
  const { activeCaixaId } = useAuth();

  return useQuery({
    queryKey: ["orgaos", activeCaixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgaos")
        .select("*")
        .eq("caixa_id", activeCaixaId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeCaixaId,
  });
}

/** Centros de custo da caixa ativa (com o órgão vinculado). */
export function useCentrosCusto() {
  const { activeCaixaId } = useAuth();

  return useQuery({
    queryKey: ["centros-custo", activeCaixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centros_custo")
        .select("*, orgaos(nome)")
        .eq("caixa_id", activeCaixaId!)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeCaixaId,
  });
}
