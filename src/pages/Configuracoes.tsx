import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva, useCaixas, useLogoUrl } from "@/hooks/useCaixa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Save, Upload, UserPlus } from "lucide-react";

export default function Configuracoes() {
  const { user, isAdmin, activeCaixaId, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { data: caixa, isLoading } = useCaixaAtiva();
  const { data: caixas = [] } = useCaixas();
  const { data: logoUrl } = useLogoUrl(caixa?.logo_url);

  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cep: "",
    municipio: "",
    uf: "",
    estado: "",
    aliquota_servidor: "11",
    aliquota_patronal: "13.51",
    aliquota_suplementar: "0",
  });

  useEffect(() => {
    if (!caixa) return;
    setForm({
      nome: caixa.nome ?? "",
      empresa: caixa.empresa ?? "",
      cnpj: caixa.cnpj ?? "",
      email: caixa.email ?? "",
      telefone: caixa.telefone ?? "",
      endereco: caixa.endereco ?? "",
      cep: caixa.cep ?? "",
      municipio: caixa.municipio ?? "",
      uf: caixa.uf ?? "",
      estado: caixa.estado ?? "",
      aliquota_servidor: String(caixa.aliquota_servidor ?? 11),
      aliquota_patronal: String(caixa.aliquota_patronal ?? 13.51),
      aliquota_suplementar: String(caixa.aliquota_suplementar ?? 0),
    });
  }, [caixa]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const payload = () => ({
    nome: form.nome,
    empresa: form.empresa || null,
    cnpj: form.cnpj || null,
    email: form.email || null,
    telefone: form.telefone || null,
    endereco: form.endereco || null,
    cep: form.cep || null,
    municipio: form.municipio || null,
    uf: form.uf || null,
    estado: form.estado || null,
    aliquota_servidor: parseFloat(form.aliquota_servidor) || 0,
    aliquota_patronal: parseFloat(form.aliquota_patronal) || 0,
    aliquota_suplementar: parseFloat(form.aliquota_suplementar) || 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (caixa) {
        const { error } = await supabase
          .from("caixas_previdencia")
          .update(payload())
          .eq("id", caixa.id);
        if (error) throw error;
      } else {
        const { data: newCaixa, error } = await supabase
          .from("caixas_previdencia")
          .insert(payload())
          .select()
          .single();
        if (error) throw error;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ caixa_id: newCaixa.id })
          .eq("user_id", user!.id);
        if (profileError) throw profileError;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      await refreshProfile();
      toast.success(caixa ? "Caixa atualizada com sucesso!" : "Caixa cadastrada com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao salvar: " + err.message),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!caixa) throw new Error("Cadastre a caixa antes de enviar a logo.");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${caixa.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { error: updErr } = await supabase
        .from("caixas_previdencia")
        .update({ logo_url: path })
        .eq("id", caixa.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["logo-url"] });
      toast.success("Logo atualizada!");
    },
    onError: (err: Error) => toast.error("Erro no upload: " + err.message),
  });

  // ---- Criação de usuários (apenas admin) ----
  const [novoUsuario, setNovoUsuario] = useState({
    nome: "",
    email: "",
    password: "",
    cargo: "",
    role: "operador",
    caixa_id: "",
  });

  useEffect(() => {
    if (activeCaixaId) setNovoUsuario((p) => ({ ...p, caixa_id: p.caixa_id || activeCaixaId }));
  }, [activeCaixaId]);

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          password: novoUsuario.password,
          cargo: novoUsuario.cargo || undefined,
          role: novoUsuario.role,
          caixa_id: novoUsuario.caixa_id,
        },
      });
      if (error) throw error;
      if ((data as { error?: unknown })?.error) {
        throw new Error(JSON.stringify((data as { error: unknown }).error));
      }
    },
    onSuccess: () => {
      toast.success("Conta criada! Envie o login e a senha ao usuário.");
      setNovoUsuario((p) => ({ ...p, nome: "", email: "", password: "", cargo: "" }));
    },
    onError: (err: Error) => toast.error("Erro ao criar conta: " + err.message),
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
          Dados da caixa de previdência, logo, alíquotas e contas de acesso
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
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome da Caixa *</Label>
                <Input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} required
                  placeholder="Ex: Caixa de Previdência Municipal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa / Entidade</Label>
                <Input id="empresa" value={form.empresa} onChange={(e) => set("empresa", e.target.value)}
                  placeholder="Nome que aparece na guia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={form.telefone} onChange={(e) => set("telefone", e.target.value)}
                  placeholder="(00) 0000-0000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" value={form.endereco} onChange={(e) => set("endereco", e.target.value)}
                  placeholder="Rua, número, bairro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipio">Município</Label>
                <Input id="municipio" value={form.municipio} onChange={(e) => set("municipio", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" maxLength={2} value={form.uf}
                  onChange={(e) => set("uf", e.target.value.toUpperCase())} placeholder="SP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={form.estado} onChange={(e) => set("estado", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliq-serv">Alíquota Servidor (%)</Label>
                <Input id="aliq-serv" type="number" step="0.01" value={form.aliquota_servidor}
                  onChange={(e) => set("aliquota_servidor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliq-pat">Alíquota Patronal (%)</Label>
                <Input id="aliq-pat" type="number" step="0.01" value={form.aliquota_patronal}
                  onChange={(e) => set("aliquota_patronal", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliq-sup">Alíquota Suplementar (%)</Label>
                <Input id="aliq-sup" type="number" step="0.01" value={form.aliquota_suplementar}
                  onChange={(e) => set("aliquota_suplementar", e.target.value)} />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Logo da Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo ${form.nome}`} className="h-20 w-20 object-contain rounded border border-border" />
          ) : (
            <div className="h-20 w-20 rounded border border-dashed border-border flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="logo-file">Enviar nova logo (PNG ou JPG)</Label>
            <Input
              id="logo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!caixa || uploadLogo.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo.mutate(file);
              }}
            />
            {!caixa && <p className="text-xs text-muted-foreground">Cadastre a caixa antes de enviar a logo.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Criar conta de acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="u-nome">Nome *</Label>
              <Input id="u-nome" value={novoUsuario.nome}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">E-mail (login) *</Label>
              <Input id="u-email" type="email" value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-pass">Senha provisória * (mín. 8 caracteres)</Label>
              <Input id="u-pass" value={novoUsuario.password} minLength={8}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-cargo">Cargo</Label>
              <Input id="u-cargo" value={novoUsuario.cargo}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, cargo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-role">Perfil de acesso *</Label>
              <Select value={novoUsuario.role} onValueChange={(v) => setNovoUsuario({ ...novoUsuario, role: v })}>
                <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="gestor_financeiro">Gestor Financeiro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-caixa">Caixa vinculada *</Label>
              <Select value={novoUsuario.caixa_id || undefined}
                onValueChange={(v) => setNovoUsuario({ ...novoUsuario, caixa_id: v })}>
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
                disabled={createUser.isPending || !novoUsuario.nome || !novoUsuario.email || !novoUsuario.password || !novoUsuario.caixa_id}>
                <UserPlus className="h-4 w-4 mr-2" />
                {createUser.isPending ? "Criando..." : "Criar conta"}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            A conta já vem confirmada — basta enviar o e-mail e a senha provisória ao usuário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
