import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound, Search, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixas } from "@/hooks/useCaixa";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador global",
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
    if (activeCaixaId) {
      setForm((anterior) => ({
        ...anterior,
        caixa_id: anterior.caixa_id || activeCaixaId,
      }));
    }
  }, [activeCaixaId]);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas-acesso", activeCaixaId],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, cargo, caixa_id")
        .order("nome");

      if (error) throw error;

      const ids = (profiles ?? []).map((profile) => profile.user_id);

      let roles: { user_id: string; role: string }[] = [];

      if (ids.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", ids);

        if (rolesError) throw rolesError;

        roles = rolesData ?? [];
      }

      return (profiles ?? [])
        .map((profile) => ({
          ...profile,
          roles: roles
            .filter((role) => role.user_id === profile.user_id)
            .map((role) => role.role),
        }))
        .filter(
          (profile) =>
            profile.caixa_id === activeCaixaId ||
            profile.roles.includes("admin"),
        );
    },
    enabled: !!activeCaixaId,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "admin-create-user",
        {
          // 1. CORPO ENVIADO À FUNÇÃO
          body: {
            nome: form.nome,
            email: form.email,
            password: form.password,
            cargo: form.cargo || undefined,
            role: form.role,
            caixa_id:
              form.role === "admin"
                ? null
                : form.caixa_id,
          },
        },
      );

      if (error) throw error;

      if ((data as { error?: unknown })?.error) {
        throw new Error(
          JSON.stringify((data as { error: unknown }).error),
        );
      }
    },

    onSuccess: () => {
      toast.success(
        "Conta criada! Envie o e-mail e a senha ao usuário.",
      );

      setForm((anterior) => ({
        ...anterior,
        nome: "",
        email: "",
        password: "",
        cargo: "",
        caixa_id:
          anterior.role === "admin"
            ? ""
            : activeCaixaId || "",
      }));

      queryClient.invalidateQueries({
        queryKey: ["contas-acesso"],
      });
    },

    onError: (error: Error) => {
      toast.error("Erro ao criar conta: " + error.message);
    },
  });

  const filtradas = contas.filter((conta) =>
    [conta.nome, conta.cargo].some((valor) =>
      (valor ?? "").toLowerCase().includes(busca.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Contas de Acesso
        </h1>

      </div>

      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Nova conta de acesso
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createUser.mutate();
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="u-nome">Nome *</Label>

                <Input
                  id="u-nome"
                  value={form.nome}
                  required
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nome: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-email">E-mail (login) *</Label>

                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  required
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-pass">
                  Senha * (mín. 6 caracteres)
                </Label>

                <Input
                  id="u-pass"
                  type="password"
                  value={form.password}
                  minLength={6}
                  required
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-cargo">Cargo</Label>

                <Select
                  value={form.cargo || undefined}
                  onValueChange={(cargo) =>
                    setForm({
                      ...form,
                      cargo,
                    })
                  }
                >
                  <SelectTrigger id="u-cargo">
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Gestor Financeiro">
                      Gestor Financeiro
                    </SelectItem>

                    <SelectItem value="Operador">
                      Operador
                    </SelectItem>

                    <SelectItem value="Fiscal">
                      Fiscal
                    </SelectItem>

                    <SelectItem value="Contador">
                      Contador
                    </SelectItem>

                    <SelectItem value="Diretor">
                      Diretor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-role">
                  Perfil de acesso *
                </Label>

                <Select
                  value={form.role}

                  // 2. ONVALUECHANGE DO PERFIL
                  onValueChange={(role) =>
                    setForm({
                      ...form,
                      role,
                      caixa_id:
                        role === "admin"
                          ? ""
                          : form.caixa_id || activeCaixaId || "",
                    })
                  }
                >
                  <SelectTrigger id="u-role">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="admin">
                      Administrador global
                    </SelectItem>

                    <SelectItem value="gestor_financeiro">
                      Gestor Financeiro
                    </SelectItem>

                    <SelectItem value="operador">
                      Operador
                    </SelectItem>

                    <SelectItem value="fiscal">
                      Fiscal (somente leitura)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-caixa">
                  {form.role === "admin"
                    ? "Caixa vinculada"
                    : "Caixa vinculada *"}
                </Label>

                <Select
                  value={form.caixa_id || undefined}
                  onValueChange={(caixaId) =>
                    setForm({
                      ...form,
                      caixa_id: caixaId,
                    })
                  }

                  // 3. DISABLED DO SELETOR DE CAIXA
                  disabled={
                    !isAdmin ||
                    form.role === "admin"
                  }
                >
                  <SelectTrigger id="u-caixa">
                    <SelectValue
                      placeholder={
                        form.role === "admin"
                          ? "Administrador não precisa de caixa"
                          : "Selecionar caixa"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {caixas.map((caixa) => (
                      <SelectItem
                        key={caixa.id}
                        value={caixa.id}
                      >
                        {caixa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {form.role === "admin" && (
                )}
              </div>

              <div className="flex justify-end pt-2 md:col-span-2">
                <Button
                  type="submit"

                  // 4. DISABLED DO BOTÃO
                  disabled={
                    createUser.isPending ||
                    !form.nome ||
                    !form.email ||
                    form.password.length < 6 ||
                    (
                      form.role !== "admin" &&
                      !form.caixa_id
                    )
                  }
                >
                  <KeyRound className="mr-2 h-4 w-4" />

                  {createUser.isPending
                    ? "Criando..."
                    : "Criar conta"}
                </Button>
              </div>
            </form>

          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Buscar por nome ou cargo..."
              className="pl-9"
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Nome
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Cargo
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Perfil de acesso
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  filtradas.map((conta) => (
                    <tr
                      key={conta.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {conta.nome}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {conta.cargo ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {conta.roles.length === 0 ? (
                            <span className="text-muted-foreground">
                              -
                            </span>
                          ) : (
                            conta.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                              >
                                {role === "admin"
                                  ? "Administrador global"
                                  : ROLE_LABEL[role] ?? role}
                              </Badge>
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
