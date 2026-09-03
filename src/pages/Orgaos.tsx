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
import { Building, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrgaos } from "@/hooks/useCadastros";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Orgao = Tables<"orgaos">;

const empty = {
  nome: "", cnpj: "", endereco: "", cep: "", municipio: "", uf: "", telefone: "", email: "",
};

export default function Orgaos() {
  const { activeCaixaId } = useAuth();
  const { canEditCaixasEOrgaos } = usePermissions();
  const queryClient = useQueryClient();
  const { data: orgaos = [], isLoading } = useOrgaos();

  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Orgao | null>(null);
  const [removing, setRemoving] = useState<Orgao | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openNovo = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (o: Orgao) => {
    setEditing(o);
    setForm({
      nome: o.nome ?? "", cnpj: o.cnpj ?? "", endereco: o.endereco ?? "", cep: o.cep ?? "",
      municipio: o.municipio ?? "", uf: o.uf ?? "", telefone: o.telefone ?? "", email: o.email ?? "",
    });
    setDialogOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["orgaos"] });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast.error("Selecione uma caixa de previdência.");
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome,
      cnpj: form.cnpj || null,
      endereco: form.endereco || null,
      cep: form.cep || null,
      municipio: form.municipio || null,
      uf: form.uf || null,
      telefone: form.telefone || null,
      email: form.email || null,
    };
    const { error } = editing
      ? await supabase.from("orgaos").update(payload).eq("id", editing.id)
      : await supabase.from("orgaos").insert({ ...payload, caixa_id: activeCaixaId });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    invalidate();
    setDialogOpen(false);
    toast.success(editing ? "Órgão atualizado!" : "Órgão cadastrado!");
  };

  const handleDelete = async () => {
    if (!removing) return;
    const { error } = await supabase.from("orgaos").delete().eq("id", removing.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    invalidate();
    setRemoving(null);
    toast.success("Órgão excluído.");
  };

  const filtrados = orgaos.filter(
    (o) =>
      o.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (o.cnpj ?? "").includes(busca) ||
      (o.municipio ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Órgãos</h1>
          <p className="text-muted-foreground mt-1">Órgãos vinculados à caixa de previdência</p>
        </div>
        {canEditCaixasEOrgaos && (
          <Button onClick={openNovo}><Plus className="h-4 w-4 mr-2" />Novo Órgão</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CNPJ ou município..." className="pl-9"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">CNPJ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Endereço</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Município/UF</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contato</th>
                  {canEditCaixasEOrgaos && (
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum órgão cadastrado
                  </td></tr>
                ) : (
                  filtrados.map((o) => (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{o.nome}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{o.cnpj}</td>
                      <td className="py-3 px-4 text-muted-foreground">{o.endereco}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {[o.municipio, o.uf].filter(Boolean).join(" / ")}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {[o.telefone, o.email].filter(Boolean).join(" · ")}
                      </td>
                      {canEditCaixasEOrgaos && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" aria-label="Editar órgão" onClick={() => openEdit(o)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Excluir órgão"
                              className="text-destructive hover:text-destructive" onClick={() => setRemoving(o)}>
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
          <DialogHeader><DialogTitle>{editing ? "Editar Órgão" : "Novo Órgão"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="o-nome">Nome *</Label>
              <Input id="o-nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Prefeitura Municipal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-cnpj">CNPJ</Label>
              <Input id="o-cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-tel">Telefone</Label>
              <Input id="o-tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="o-end">Endereço</Label>
              <Input id="o-end" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-cep">CEP</Label>
              <Input id="o-cep" value={form.cep} onChange={(e) => set("cep", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-mun">Município</Label>
              <Input id="o-mun" value={form.municipio} onChange={(e) => set("municipio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-uf">UF</Label>
              <Input id="o-uf" maxLength={2} value={form.uf}
                onChange={(e) => set("uf", e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-email">E-mail</Label>
              <Input id="o-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.nome}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir órgão?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.nome} será removido. Centros de custo vinculados ficarão sem órgão.
            </AlertDialogDescription>
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
