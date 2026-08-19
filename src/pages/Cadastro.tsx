import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Cadastro() {
  const { toast } = useToast();
  const { activeCaixaId } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", cpf: "", orgao: "", cargo: "", dataNascimento: "", email: "" });

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios", activeCaixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("caixa_id", activeCaixaId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCaixaId,
  });

  const funcionariosFiltrados = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.cpf.includes(busca) ||
      f.orgao.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast({ title: "Erro", description: "Selecione uma caixa de previdência primeiro.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("funcionarios").insert({
      nome: formData.nome,
      cpf: formData.cpf,
      orgao: formData.orgao,
      cargo: formData.cargo,
      data_nascimento: formData.dataNascimento || null,
      email: formData.email || null,
      caixa_id: activeCaixaId,
    });


    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    setDialogOpen(false);
    setFormData({ nome: "", cpf: "", orgao: "", cargo: "", dataNascimento: "", email: "" });
    queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
    toast({ title: "Cadastro realizado!", description: "Funcionário cadastrado com sucesso." });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro</h1>
          <p className="text-muted-foreground mt-1">Gerencie funcionários da caixa de previdência</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Cadastro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Funcionário</DialogTitle></DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input placeholder="Nome completo" required value={formData.nome} onChange={(e) => setFormData(p => ({...p, nome: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input placeholder="000.000.000-00" required value={formData.cpf} onChange={(e) => setFormData(p => ({...p, cpf: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formData.dataNascimento} onChange={(e) => setFormData(p => ({...p, dataNascimento: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Órgão</Label>
                  <Input placeholder="Ex: Prefeitura Municipal" required value={formData.orgao} onChange={(e) => setFormData(p => ({...p, orgao: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input placeholder="Ex: Administrador" value={formData.cargo} onChange={(e) => setFormData(p => ({...p, cargo: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF ou órgão..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">CPF</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Órgão</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">E-mail</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {funcionariosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum funcionário encontrado
                  </td></tr>
                ) : (
                  funcionariosFiltrados.map((func) => (
                    <tr key={func.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{func.nome}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{func.cpf}</td>
                      <td className="py-3 px-4 text-muted-foreground">{func.orgao}</td>
                      <td className="py-3 px-4 text-muted-foreground">{func.cargo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{func.email}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={func.status === "ativo" ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground"}>
                          {func.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
