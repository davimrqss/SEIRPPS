import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Percent, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLogoUrl } from "@/hooks/useCaixa";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export default function CaixaEditar() {
  const { id: caixaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEditCaixasEOrgaos } = usePermissions();
  const readOnly = !canEditCaixasEOrgaos;

  const { data: caixa, isLoading } = useQuery({
    queryKey: ["caixa-editar", caixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixas_previdencia")
        .select("*")
        .eq("id", caixaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!caixaId,
  });

  const { data: logoUrl } = useLogoUrl(caixa?.logo_url);

  const [form, setForm] = useState({
    nome: "", razao_social: "", empresa: "", cnpj: "", email: "", telefone: "", endereco: "",
    cep: "", municipio: "", uf: "", estado: "",
    aliquota_servidor: "11", aliquota_patronal: "13.51", aliquota_suplementar: "0", indice_correcao: "INPC",
  });

  useEffect(() => {
    if (!caixa) return;
    setForm({
      nome: caixa.nome ?? "",
      razao_social: caixa.razao_social ?? "",
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
      indice_correcao: caixa.indice_correcao ?? "INPC",
    });
  }, [caixa]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("caixas_previdencia")
        .update({
          nome: form.nome,
          razao_social: form.razao_social || null,
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
          indice_correcao: form.indice_correcao.trim() || "INPC",
        })
        .eq("id", caixaId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["caixas"] });
      queryClient.invalidateQueries({ queryKey: ["caixas-lista"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-editar", caixaId] });
      toast.success("Dados da caixa salvos!");
    },
    onError: (err: Error) => toast.error("Erro ao salvar: " + err.message),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${caixaId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { error: updErr } = await supabase
        .from("caixas_previdencia")
        .update({ logo_url: path })
        .eq("id", caixaId!);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
      queryClient.invalidateQueries({ queryKey: ["caixa-editar", caixaId] });
      queryClient.invalidateQueries({ queryKey: ["logo-url"] });
      toast.success("Logo atualizada!");
    },
    onError: (err: Error) => toast.error("Erro no upload: " + err.message),
  });

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
  }
  if (!caixa) {
    return <div className="py-20 text-center text-muted-foreground">Caixa não encontrada.</div>;
  }

  const field = (id: keyof typeof form, label: string, extra?: Partial<React.ComponentProps<typeof Input>>) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={form[id]}
        disabled={readOnly}
        onChange={(e) => set(id, e.target.value)}
        {...extra}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/caixas")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{caixa.nome}</h1>
        <p className="text-muted-foreground mt-1">
          {readOnly ? "Visualização dos dados da caixa" : "Edite os dados, a logo e as alíquotas padrão"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />Dados da Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {field("nome", "Nome (exibição no site) *")}
          {field("razao_social", "Razão Social (usada nas guias PDF)")}
          {field("empresa", "Empresa")}
          {field("cnpj", "CNPJ")}
          {field("email", "E-mail", { type: "email" })}
          {field("telefone", "Telefone")}
          {field("endereco", "Endereço")}
          {field("cep", "CEP")}
          {field("municipio", "Município")}
          {field("uf", "UF", { maxLength: 2 })}
          {field("estado", "Estado")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-5 w-5 text-primary" />Alíquotas padrão
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {field("aliquota_servidor", "Servidor (%)", { type: "number", step: "0.01" })}
          {field("aliquota_patronal", "Patronal (%)", { type: "number", step: "0.01" })}
          {field("aliquota_suplementar", "Suplementar (%)", { type: "number", step: "0.01" })}
          {field("indice_correcao", "Índice de correção", { placeholder: "INPC, IPCA..." })}
          <p className="md:col-span-2 lg:col-span-4 text-xs text-muted-foreground">
            A alíquota suplementar definida aqui é usada quando a folha for marcada com "Sim".
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5 text-primary" />Logo da caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logo ${caixa.nome}`} className="h-20 w-20 object-contain rounded border border-border" />
          ) : (
            <div className="h-20 w-20 rounded border border-dashed border-border flex items-center justify-center">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          {!readOnly && (
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo.mutate(file);
                }}
              />
              <p className="text-xs text-muted-foreground">PNG ou JPG. Aparece ao lado do nome no menu.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button size="lg" onClick={() => salvar.mutate()} disabled={salvar.isPending || !form.nome}>
            <Save className="h-4 w-4 mr-2" />
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      )}
    </div>
  );
}
