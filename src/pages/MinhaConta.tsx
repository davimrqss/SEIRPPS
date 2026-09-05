import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KeyRound, Mail, Save, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MinhaConta() {
  const { user, profile, refreshProfile } = useAuth();
  const { canEditOwnCredentials } = usePermissions();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoSolic, setTipoSolic] = useState<"email" | "senha" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNome(profile?.nome ?? "");
    setEmail(user?.email ?? "");
  }, [profile?.nome, user?.email]);

  const { data: avatarData } = useQuery({
    queryKey: ["avatar-url", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!data?.avatar_url) return null;
      const { data: signed } = await supabase.storage
        .from("logos")
        .createSignedUrl(data.avatar_url, 3600);
      return signed?.signedUrl ?? null;
    },
    enabled: !!user,
  });

  const salvarNome = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    await refreshProfile();
    toast.success("Nome atualizado!");
  };

  const enviarFoto = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `avatars/${user!.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) return toast.error("Erro no upload: " + error.message);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("user_id", user!.id);
    if (updErr) return toast.error("Erro ao salvar foto: " + updErr.message);
    queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
    toast.success("Foto atualizada!");
  };

  const atualizarCredenciais = async () => {
    const payload: { email?: string; password?: string } = {};
    if (email && email !== user?.email) payload.email = email;
    if (senha) payload.password = senha;
    if (!payload.email && !payload.password) return toast.info("Nada para alterar.");
    const { error } = await supabase.auth.updateUser(payload);
    if (error) return toast.error("Erro: " + error.message);
    setSenha("");
    toast.success("Dados de acesso atualizados!");
  };

  const abrirSolicitacao = async (tipo: "email" | "senha") => {
    const { error } = await supabase.from("solicitacoes_conta").insert({
      user_id: user!.id,
      tipo,
      valor_solicitado: tipo === "email" ? email : null,
      mensagem: mensagem || null,
    });
    if (error) return toast.error("Erro: " + error.message);
    setMensagem("");
    setTipoSolic(null);
    toast.success("Solicitação enviada ao administrador.");
  };

  const iniciais = (profile?.nome ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-muted-foreground mt-1">Seus dados pessoais e de acesso</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarData && <AvatarImage src={avatarData} alt={profile?.nome ?? "Foto de perfil"} />}
              <AvatarFallback>{iniciais}</AvatarFallback>
            </Avatar>
            <Input
              type="file"
              accept="image/*"
              className="max-w-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) enviarFoto(file);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarNome} disabled={saving || !nome}>
              <Save className="h-4 w-4 mr-2" />Salvar nome
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-primary" />Dados de acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} disabled={!canEditOwnCredentials} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input id="senha" type="password" value={senha} placeholder="••••••••"
              onChange={(e) => setSenha(e.target.value)} disabled={!canEditOwnCredentials} />
          </div>

          {canEditOwnCredentials ? (
            <div className="flex justify-end">
              <Button onClick={atualizarCredenciais}>
                <Save className="h-4 w-4 mr-2" />Salvar alterações
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Alterações de e-mail e senha precisam da aprovação de um administrador.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTipoSolic("email")}>
                  <Mail className="h-4 w-4 mr-2" />Solicitar troca de e-mail
                </Button>
                <Button variant="outline" onClick={() => setTipoSolic("senha")}>
                  <KeyRound className="h-4 w-4 mr-2" />Solicitar troca de senha
                </Button>
              </div>
              {tipoSolic && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Label htmlFor="msg">
                    Detalhes da solicitação ({tipoSolic === "email" ? "e-mail" : "senha"})
                  </Label>
                  <Textarea id="msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Explique o motivo da solicitação" />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setTipoSolic(null)}>Cancelar</Button>
                    <Button onClick={() => abrirSolicitacao(tipoSolic)}>
                      <Send className="h-4 w-4 mr-2" />Enviar solicitação
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas vinculadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vínculo com Google e Apple ainda não está habilitado neste sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
