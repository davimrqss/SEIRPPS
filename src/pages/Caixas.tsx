import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { safeErrorMessage } from "@/lib/safeError";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelecao } from "@/hooks/useSelecao";
import {
  BarraSelecao, BotaoExcluirSelecionados, CheckboxTodos, ConfirmarExclusaoEmMassa,
} from "@/components/SelecaoEmMassa";

export default function Caixas() {
  const { canEditCaixasEOrgaos } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [removendo, setRemovendo] = useState<{ id: string; nome: string } | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const { data: caixas = [], isLoading } = useQuery({
    queryKey: ["caixas-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_previdencia")
        .select("id, nome, empresa, cnpj, municipio, uf")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const criarCaixa = async () => {
    setCriando(true);
    const { data, error } = await supabase
      .from("caixas_previdencia")
      .insert({ nome: "Nova caixa de previdência" })
      .select("id")
      .single();
    setCriando(false);
    if (error) {
      toast.error(safeErrorMessage("Não foi possível criar a caixa"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["caixas-lista"] });
    queryClient.invalidateQueries({ queryKey: ["caixas"] });
    navigate(`/caixas/${data.id}`);
  };

  /** Remove a caixa e tudo o que pertence a ela, na ordem das dependências. */
  const excluirUma = async (id: string) => {
    const { data: folhas, error: folhasErr } = await supabase
      .from("folhas_pagamento")
      .select("id")
      .eq("caixa_id", id);
    if (folhasErr) throw folhasErr;
    const folhaIds = (folhas ?? []).map((f) => f.id);
    if (folhaIds.length) {
      const { error } = await supabase.from("pagamentos").delete().in("folha_id", folhaIds);
      if (error) throw error;
    }
    for (const tabela of ["folhas_pagamento", "centros_custo", "descricoes_guias", "orgaos"] as const) {
      const { error } = await supabase.from(tabela).delete().eq("caixa_id", id);
      if (error) throw error;
    }
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ caixa_id: null })
      .eq("caixa_id", id);
    if (profErr) throw profErr;
    const { error } = await supabase.from("caixas_previdencia").delete().eq("id", id);
    if (error) throw error;
  };

  const atualizarListas = () => {
    queryClient.invalidateQueries({ queryKey: ["caixas-lista"] });
    queryClient.invalidateQueries({ queryKey: ["caixas"] });
    queryClient.invalidateQueries({ queryKey: ["caixa"] });
  };

  const excluirCaixa = async () => {
    if (!removendo) return;
    setExcluindo(true);
    try {
      await excluirUma(removendo.id);
      setRemovendo(null);
      toast.success("Caixa de previdência excluída.");
    } catch {
      toast.error(safeErrorMessage("Não foi possível excluir a caixa"));
    } finally {
      atualizarListas();
      setExcluindo(false);
    }
  };

  const filtradas = caixas.filter((c) =>
    [c.nome, c.empresa, c.cnpj, c.municipio].some((v) =>
      (v ?? "").toLowerCase().includes(busca.toLowerCase())
    )
  );

  const selecao = useSelecao(filtradas.map((c) => c.id));
  const [excluirVarias, setExcluirVarias] = useState(false);
  const [excluindoVarias, setExcluindoVarias] = useState(false);

  const excluirSelecionadas = async () => {
    setExcluindoVarias(true);
    let excluidas = 0;
    try {
      for (const id of selecao.selecionados) {
        await excluirUma(id);
        excluidas += 1;
      }
      toast.success(`${excluidas} caixa(s) de previdência excluída(s).`);
      setExcluirVarias(false);
    } catch {
      toast.error(
        safeErrorMessage(
          excluidas
            ? `${excluidas} caixa(s) excluída(s); não foi possível excluir as demais`
            : "Não foi possível excluir as caixas"
        )
      );
    } finally {
      selecao.limpar();
      atualizarListas();
      setExcluindoVarias(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caixas de Previdência</h1>
        </div>
        {canEditCaixasEOrgaos && (
          <Button onClick={criarCaixa} disabled={criando}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Caixa
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou município..."
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {canEditCaixasEOrgaos && (
            <BarraSelecao quantidade={selecao.selecionados.length} onLimpar={selecao.limpar}>
              <BotaoExcluirSelecionados onClick={() => setExcluirVarias(true)} />
            </BarraSelecao>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {canEditCaixasEOrgaos && (
                    <th className="w-10 py-3 pl-4">
                      <CheckboxTodos todos={selecao.todos} parcial={selecao.parcial} onChange={selecao.alternarTodos} />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Empresa</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">CNPJ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Município</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma caixa encontrada
                    </td>
                  </tr>
                ) : (
                  filtradas.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      {canEditCaixasEOrgaos && (
                        <td className="py-3 pl-4">
                          <Checkbox aria-label={`Selecionar ${c.nome}`} checked={selecao.estaMarcado(c.id)}
                            onCheckedChange={() => selecao.alternar(c.id)} />
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-foreground">{c.nome}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.empresa ?? "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{c.cnpj ?? "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {c.municipio ? `${c.municipio}${c.uf ? " / " + c.uf : ""}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/caixas/${c.id}`}>
                              <Pencil className="h-4 w-4 mr-1" />
                              {canEditCaixasEOrgaos ? "Editar" : "Visualizar"}
                            </Link>
                          </Button>
                          {canEditCaixasEOrgaos && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir caixa"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRemovendo({ id: c.id, nome: c.nome })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta caixa de previdência?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removendo?.nome}</strong> será removida junto com suas guias, pagamentos,
              descrições e órgãos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); excluirCaixa(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluindo}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmarExclusaoEmMassa
        open={excluirVarias}
        onOpenChange={setExcluirVarias}
        titulo={`Excluir ${selecao.selecionados.length} caixa(s) de previdência?`}
        descricao="As caixas selecionadas serão removidas junto com suas guias, pagamentos, descrições e órgãos. Esta ação não pode ser desfeita."
        excluindo={excluindoVarias}
        onConfirm={excluirSelecionadas}
      />
    </div>
  );
}
