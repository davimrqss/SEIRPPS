import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCentrosCusto, useOrgaos } from "@/hooks/useCadastros";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type CentroCusto = Tables<"centros_custo"> & { orgaos?: { nome: string } | null };

const empty = { nome: "", codigo: "", descricao: "", orgao_id: "" };

export default function CentrosCusto() {
  const { activeCaixaId } = useAuth();
  const { canEditCentrosCusto } = usePermissions();
  const queryClient = useQueryClient();
  const { data: centros = [], isLoading } = useCentrosCusto();
  const { data: orgaos = [] } = useOrgaos();

  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const [removing, setRemoving] = useState<CentroCusto | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openNovo = () => { setEditing(null); setForm(empty); setDialogOpen(true); };

  const openEdit = (c: CentroCusto) => {
    setEditing(c);
    setForm({
      nome: c.nome ?? "", codigo: c.codigo ?? "",
      descricao: c.descricao ?? "", orgao_id: c.orgao_id ?? "",
    });
    setDialogOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["centros-custo"] });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast.error("Selecione uma caixa de previdência.");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome,
      codigo: form.codigo,
      descricao: form.descricao || null,
      orgao_id: form.orgao_id || null,
    };
    const { error } = editing
      ? await supabase.from("centros_custo").update(payload).eq("id", editing.id)
      : await supabase.from("centros_custo").insert({ ...payload, caixa_id: activeCaixaId });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    invalidate();
    setDialogOpen(false);
    toast.success(editing ? "Centro de custo atualizado!" : "Centro de custo cadastrado!");
  };

  const handleDelete = async () => {
    if (!removing) return;
    const { error } = await supabase.from("centros_custo").delete().eq("id", removing.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    invalidate();
    setRemoving(null);
    toast.success("Centro de custo excluído.");
  };

  const filtrados = (centros as CentroCusto[]).filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centros de Custo</h1>
          <p className="text-muted-foreground mt-1">Códigos usados nas folhas de pagamento</p>
        </div>
        {canEditCentrosCusto && (
          <Button onClick={openNovo}><Plus className="h-4 w-4 mr-2" />Novo Centro de Custo</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código..." className="pl-9"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Órgão</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Descrição</th>
                  {canEditCentrosCusto && (
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum centro de custo cadastrado
                  </td></tr>
                ) : (
                  filtrados.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{c.codigo}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{c.nome}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.orgaos?.nome ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.descricao}</td>
                      {canEditCentrosCusto && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" aria-label="Editar centro de custo" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Excluir centro de custo"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cc-cod">Código *</Label>
              <Input id="cc-cod" required value={form.codigo} onChange={(e) => set("codigo", e.target.value)}
                placeholder="Ex: 001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-nome">Nome *</Label>
              <Input id="cc-nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Secretaria de Educação" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cc-orgao">Órgão</Label>
              <Select value={form.orgao_id || undefined} onValueChange={(v) => set("orgao_id", v)}>
                <SelectTrigger id="cc-orgao"><SelectValue placeholder="Selecionar órgão" /></SelectTrigger>
                <SelectContent>
                  {orgaos.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cc-desc">Descrição</Label>
              <Input id="cc-desc" value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.nome || !form.codigo}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
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
