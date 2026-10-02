import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { safeErrorMessage } from "@/lib/safeError";

type DescricaoGuia = Tables<"descricoes_guias">;

const empty = { nome: "" };

export default function CentrosCusto() {
  const { activeCaixaId } = useAuth();
  const { canEditCentrosCusto } = usePermissions();
  const queryClient = useQueryClient();
  const { data: descricoes = [], isLoading } = useQuery({
    queryKey: ["descricoes-guias", activeCaixaId],
    queryFn: async () => {
      if (!activeCaixaId) return [];
      const { data, error } = await supabase
        .from("descricoes_guias")
        .select("*")
        .eq("caixa_id", activeCaixaId)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(activeCaixaId),
  });

  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DescricaoGuia | null>(null);
  const [removing, setRemoving] = useState<DescricaoGuia | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openNovo = () => { setEditing(null); setForm(empty); setDialogOpen(true); };

  const openEdit = (c: DescricaoGuia) => {
    setEditing(c);
    setForm({ nome: c.nome });
    setDialogOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["descricoes-guias"] });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast.error("Selecione uma caixa de previdência.");
      return;
    }
    setSaving(true);
    const nome = form.nome.trim();
    if (!nome || nome.length > 200) {
      toast.error("Informe uma descrição com até 200 caracteres.");
      setSaving(false);
      return;
    }
    const payload = { nome };
    const { error } = editing
      ? await supabase.from("descricoes_guias").update(payload).eq("id", editing.id)
      : await supabase.from("descricoes_guias").insert({ ...payload, caixa_id: activeCaixaId });
    setSaving(false);
    if (error) {
      toast.error(safeErrorMessage("Não foi possível salvar a descrição"));
      return;
    }
    invalidate();
    setDialogOpen(false);
    toast.success(editing ? "Descrição atualizada!" : "Descrição cadastrada!");
  };

  const handleDelete = async () => {
    if (!removing) return;
    const { error } = await supabase.from("descricoes_guias").delete().eq("id", removing.id);
    if (error) {
      toast.error(safeErrorMessage("Não foi possível excluir a descrição"));
      return;
    }
    invalidate();
    setRemoving(null);
    toast.success("Descrição excluída.");
  };

  const filtrados = (descricoes as DescricaoGuia[]).filter((item) =>
    item.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Descrições</h1>
        </div>
        {canEditCentrosCusto && (
          <Button onClick={openNovo}><Plus className="h-4 w-4 mr-2" />Nova Descrição</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar descrição..." maxLength={200} className="pl-9"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Descrição</th>
                  {canEditCentrosCusto && (
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={2} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={2} className="py-12 text-center text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma descrição cadastrada
                  </td></tr>
                ) : (
                  filtrados.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{c.nome}</td>
                      {canEditCentrosCusto && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" aria-label="Editar descrição" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Excluir descrição"
                              className="text-destructive hover:text-destructive" onClick={() => setRemoving(c)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Descrição" : "Nova Descrição"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao-nome">Descrição *</Label>
              <Input id="descricao-nome" required maxLength={200} value={form.nome} onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Folha mensal" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.nome.trim()}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Descrição?</AlertDialogTitle>
            <AlertDialogDescription>{removing?.nome} será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
