import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search } from "lucide-react";
import { mockFuncionarios, type Funcionario } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

export default function Cadastro() {
  const { toast } = useToast();
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const funcionariosFiltrados = mockFuncionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.cpf.includes(busca) ||
      f.orgao.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogOpen(false);
    toast({
      title: "Cadastro realizado!",
      description: "Funcionário cadastrado com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie funcionários e contas da caixa de previdência
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cadastro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Funcionário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input placeholder="Nome completo" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input placeholder="000.000.000-00" required />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Órgão</Label>
                  <Input placeholder="Ex: Prefeitura Municipal" required />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input placeholder="Ex: Administrador" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou órgão..."
                className="pl-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    CPF
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Órgão
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Cargo
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    E-mail
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {funcionariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum funcionário encontrado
                    </td>
                  </tr>
                ) : (
                  funcionariosFiltrados.map((func) => (
                    <tr
                      key={func.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {func.nome}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {func.cpf}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {func.orgao}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {func.cargo}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {func.email}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          className={
                            func.status === "ativo"
                              ? "bg-success/10 text-success hover:bg-success/20"
                              : "bg-muted text-muted-foreground"
                          }
                        >
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
