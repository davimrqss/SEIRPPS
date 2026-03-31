import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

export default function Configuracoes() {
  const { user, hasRole, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole("admin");

  const { data: caixa, isLoading } = useQuery({
    queryKey: ["minha-caixa"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("caixa_id")
        .eq("user_id", user!.id)
        .single();

      if (!profile?.caixa_id) return null;

      const { data, error } = await supabase
        .from("caixas_previdencia")
        .select("*")
        .eq("id", profile.caixa_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
  });

  useEffect(() => {
    if (caixa) {
      setForm({
        nome: caixa.nome || "",
        cnpj: caixa.cnpj || "",
        email: caixa.email || "",
        telefone: caixa.telefone || "",
        endereco: caixa.endereco || "",
      });
    }
  }, [caixa]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (caixa) {
        // Update existing
        const { error } = await supabase
          .from("caixas_previdencia")
          .update(form)
          .eq("id", caixa.id);
        if (error) throw error;
      } else {
        // Create new caixa and link to profile
        const { data: newCaixa, error: insertError } = await supabase
          .from("caixas_previdencia")
          .insert(form)
          .select()
          .single();
        if (insertError) throw insertError;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ caixa_id: newCaixa.id })
          .eq("user_id", user!.id);
        if (profileError) throw profileError;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["minha-caixa"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await refreshProfile();
      toast.success(caixa ? "Caixa atualizada com sucesso!" : "Caixa cadastrada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Apenas administradores podem acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Cadastre ou edite os dados da sua Caixa de Previdência
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Dados da Caixa de Previdência
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome da Caixa *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Caixa de Previdência Municipal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@caixa.gov.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Rua, número, cidade - UF"
                />
              </div>
              <div className="md:col-span-2 flex justify-end pt-4">
                <Button type="submit" disabled={saveMutation.isPending || !form.nome}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : caixa ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
