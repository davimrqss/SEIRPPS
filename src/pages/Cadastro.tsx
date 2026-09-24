import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KeyRound, Search, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixas } from "@/hooks/useCaixa";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gestor_financeiro: "Gestor Financeiro",
  operador: "Operador",
  fiscal: "Fiscal",
};

export default function Cadastro() {
  const { activeCaixaId, isAdmin } = useAuth();
  const { canManageUsers } = usePermissions();
  const { data: caixas = [] } = useCaixas();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    cargo: "",
    role: "gestor_financeiro",
    caixa_id: "",
  });

  useEffect(() => {
    if (activeCaixaId) setForm((p) => ({ ...p, caixa_id: p.caixa_id || activeCaixaId }));
  }, [activeCaixaId]);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas-acesso", activeCaixaId],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, user_id, nome, cargo, caixa_id")
      .order("nome");

    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.user_id);

    let roles: { user_id: string; role: string }[] = [];

    if (ids.length) {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);

      if (rolesError) throw rolesError;
      roles = rolesData ?? [];
    }

    return (profiles ?? [])
      .map((p) => ({
        ...p,
        roles: roles
          .filter((r) => r.user_id === p.user_id)
          .map((r) => r.role),
      }))
      .filter(
        (p) =>
          p.caixa_id === activeCaixaId ||
          p.roles.includes("admin")
      );
  },
  enabled: !!activeCaixaId,
});

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          nome: form.nome,
          email: form.email,
          password: form.password,
          cargo: form.cargo || undefined,
          role: form.role,
          caixa_id: form.caixa_id,
        },
      });
      if (error) throw error;
      if ((data as { error?: unknown })?.error) {
        throw new Error(JSON.stringify((data as { error: unknown }).error));
      }
    },
    onSuccess: () => {
      toast.success("Conta criada! Envie o e-mail e a senha provisória ao usuário.");
      setForm((p) => ({ ...p, nome: "", email: "", password: "", cargo: "" }));
      queryClient.invalidateQueries({ queryKey: ["contas-acesso"] });
    },
    onError: (err: Error) => toast.error("Erro ao criar conta: " + err.message),
  });

  const filtradas = contas.filter((c) =>
    [c.nome, c.cargo].some((v) => (v ?? "").toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contas de Acesso</h1>
        <p className="text-muted-foreground mt-1">
          Crie os logins do sistema e vincule cada conta a uma caixa de previdência
        </p>
      </div>

      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />Nova conta de acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="u-nome">Nome *</Label>
                <Input id="u-nome" value={form.nome} required
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-email">E-mail (login) *</Label>
                <Input id="u-email" type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-pass">Senha provisória * (mín. 8 caracteres)</Label>
                <Input id="u-pass" value={form.password} minLength={8} required
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-cargo">Cargo</Label>
                <Select value={form.cargo || undefined} onValueChange={(v) => setForm({ ...form, cargo: v })}>
                  <SelectTrigger id="u-cargo"><SelectValue placeholder="Selecionar cargo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gestor Financeiro">Gestor Financeiro</SelectItem>
                    <SelectItem value="Operador">Operador</SelectItem>
                    <SelectItem value="Fiscal">Fiscal</SelectItem>
                    <SelectItem value="Contador">Contador</SelectItem>
                    <SelectItem value="Diretor">Diretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-role">Perfil de acesso *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor_financeiro">Gestor Financeiro</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="fiscal">Fiscal (somente leitura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-caixa">Caixa vinculada *</Label>
                <Select
                  value={form.caixa_id || undefined}
                  onValueChange={(v) => setForm({ ...form, caixa_id: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="u-caixa"><SelectValue placeholder="Selecionar caixa" /></SelectTrigger>
                  <SelectContent>
                    {caixas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end pt-2">
                <Button type="submit"
                  disabled={createUser.isPending || !form.nome || !form.email || !form.password || !form.caixa_id}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  {createUser.isPending ? "Criando..." : "Criar conta"}
                </Button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              A conta já vem confirmada — não é enviado e-mail de confirmação.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou cargo..." className="pl-9"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Perfil de acesso</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
                ) : filtradas.length === 0 ? (
                  <tr><td colSpan={3} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma conta encontrada
                  </td></tr>
                ) : (
                  filtradas.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{c.nome}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.cargo ?? "-"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.roles.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            c.roles.map((r) => (
                              <Badge key={r} variant="secondary">{r === "admin" ? "Administrador Global" : ROLE_LABEL[r] ?? r}</Badge>
                            ))
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
    </div>
  );
}
