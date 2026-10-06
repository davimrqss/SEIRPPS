import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateField } from "@/components/DateField";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva, useLogoUrl } from "@/hooks/useCaixa";
import { useOrgaos } from "@/hooks/useCadastros";
import { supabase } from "@/integrations/supabase/client";
import { currencyToInput, fmtBRL, parseCurrency } from "@/lib/format";
import { calcularValoresGuia, camposAcrescimosGuia } from "@/lib/guiaCalculations";
import { CorrecaoMonetaria } from "@/components/CorrecaoMonetaria";
import { buildGuiaPDF, urlToDataUrl } from "@/lib/guiaPdf";
import type { Tables } from "@/integrations/supabase/types";
import { z } from "zod";
import { safeErrorMessage } from "@/lib/safeError";

type Guia = Tables<"folhas_pagamento">;

const GuiaSchema = z.object({
  descricao: z.string().trim().min(1).max(200),
  orgaoId: z.string().uuid(),
  dataEmissao: z.string().date(),
  vencimento: z.string().date(),
});

export type CentroOpt = { id: string; nome: string; codigo: string | null; orgaos?: { nome: string } | null };

export default function NovaFolha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCaixaId } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const { data: logoUrl } = useLogoUrl(caixa?.logo_url);
  const { data: orgaos = [] } = useOrgaos();
  const [loading, setLoading] = useState(false);
  const [salvarDescricao, setSalvarDescricao] = useState(false);
  const [aplicaCorrecao, setAplicaCorrecao] = useState(false);
  const [valorServidorManual, setValorServidorManual] = useState<string | null>(null);
  const [valorPatronalManual, setValorPatronalManual] = useState<string | null>(null);
  const [form, setForm] = useState({
    descricao: "", orgaoId: "", dataEmissao: "", vencimento: "", grupoFolha: "1 - Normal",
    remuneracao: "", baseCalculo: "", aliquotaServidor: "11", aliquotaPatronal: "22",
    aliquotaSuplementar: "0", usaSuplementar: "nao", salarioMaternidade: "", salarioFamilia: "",
    auxDoenca: "", jurosMulta: "",
    pagamentoServidor: "", dataPagamentoServidor: "", pagamentoPatronal: "", dataPagamentoPatronal: "",
  });

  const { data: descricoes = [] } = useQuery({
    queryKey: ["descricoes-guias", activeCaixaId],
    queryFn: async () => {
      if (!activeCaixaId) return [];
      const { data, error } = await supabase.from("descricoes_guias").select("*").eq("caixa_id", activeCaixaId).order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(activeCaixaId),
  });

  useEffect(() => {
    if (!caixa) return;
    setForm((prev) => ({ ...prev, aliquotaServidor: String(caixa.aliquota_servidor), aliquotaPatronal: String(caixa.aliquota_patronal), aliquotaSuplementar: String(caixa.aliquota_suplementar) }));
  }, [caixa]);

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const base = parseCurrency(form.baseCalculo);
  const aliqServidor = Number(form.aliquotaServidor) || 0;
  const aliqPatronal = Number(form.aliquotaPatronal) || 0;
  const aliqSuplementar = form.usaSuplementar === "sim" ? Number(form.aliquotaSuplementar) || 0 : 0;
  const servidor = valorServidorManual === null ? base * aliqServidor / 100 : parseCurrency(valorServidorManual);
  const patronal = valorPatronalManual === null ? base * aliqPatronal / 100 : parseCurrency(valorPatronalManual);
  const suplementar = base * aliqSuplementar / 100;
  const acrescimos = camposAcrescimosGuia(Number(form.jurosMulta) || 0, aplicaCorrecao, caixa);

  const preview = useMemo(() => calcularValoresGuia({
    valor_servidor: servidor, valor_patronal: patronal, valor_suplementar: suplementar,
    salario_maternidade: parseCurrency(form.salarioMaternidade), salario_familia: parseCurrency(form.salarioFamilia),
    aux_doenca: parseCurrency(form.auxDoenca), ...acrescimos,
  } as Guia), [servidor, patronal, suplementar, form, aplicaCorrecao, caixa]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeCaixaId || !GuiaSchema.safeParse(form).success) {
      toast({ title: "Preencha os campos obrigatórios", description: "Descrição, órgão e datas são obrigatórios.", variant: "destructive" });
      return;
    }
    if (form.vencimento.slice(-2) !== "20") {
      toast({ title: "Confira o vencimento", description: "O vencimento deve ser no dia 20.", variant: "destructive" });
      return;
    }
    const pagamentoServidor = parseCurrency(form.pagamentoServidor);
    const pagamentoPatronal = parseCurrency(form.pagamentoPatronal);
    if ((pagamentoServidor > 0 && !form.dataPagamentoServidor) || (pagamentoPatronal > 0 && !form.dataPagamentoPatronal)) {
      toast({ title: "Data do pagamento", description: "Informe a data de cada pagamento preenchido.", variant: "destructive" });
      return;
    }
    const orgao = orgaos.find((item) => item.id === form.orgaoId);
    if (!orgao) return;
    const popup = window.open("", "_blank");
    setLoading(true);
    const payload = {
      caixa_id: activeCaixaId, centro_custo: form.descricao.trim(), codigo_centro_custo: null,
      orgao: orgao.nome, orgao_id: orgao.id, mes_referencia: form.vencimento.slice(0, 7),
      data_emissao: form.dataEmissao, vencimento: form.vencimento, num_empregados: 0,
      grupo_folha: form.grupoFolha, remuneracao: parseCurrency(form.remuneracao), base_calculo: base,
      valor_servidor: servidor, valor_patronal: patronal, valor_suplementar: suplementar,
      salario_maternidade: parseCurrency(form.salarioMaternidade), salario_familia: parseCurrency(form.salarioFamilia),
      aux_doenca: parseCurrency(form.auxDoenca), juros_multa: preview.jurosServidor + preview.jurosPatronal,
      aliquota_servidor: aliqServidor, aliquota_patronal: aliqPatronal,
      ...acrescimos,
      is_13: form.grupoFolha.includes("13"), tipo: "folha", paga: false,
    };
    const { data: guia, error } = await supabase.from("folhas_pagamento").insert(payload).select().single();
    if (error || !guia) {
      popup?.close(); setLoading(false);
      toast({ title: "Erro ao cadastrar guia", description: safeErrorMessage("Não foi possível cadastrar a guia"), variant: "destructive" });
      return;
    }
    if (salvarDescricao) {
      await supabase.from("descricoes_guias").upsert({ caixa_id: activeCaixaId, nome: form.descricao.trim() }, { onConflict: "caixa_id,nome" });
    }
    const pagamentos = [
      pagamentoServidor > 0 ? { folha_id: guia.id, natureza: "servidor", valor_pago: pagamentoServidor, valor_recebido: pagamentoServidor, data_pagamento: `${form.dataPagamentoServidor}T12:00:00`, observacoes: "Pagamento informado no cadastro da guia" } : null,
      pagamentoPatronal > 0 ? { folha_id: guia.id, natureza: "patronal", valor_pago: pagamentoPatronal, valor_recebido: pagamentoPatronal, data_pagamento: `${form.dataPagamentoPatronal}T12:00:00`, observacoes: "Pagamento informado no cadastro da guia" } : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null);
    if (pagamentos.length) await supabase.from("pagamentos").insert(pagamentos);
    const paga = pagamentoServidor + 0.009 >= preview.devidoServidor && pagamentoPatronal + 0.009 >= preview.devidoPatronal;
    if (paga) await supabase.from("folhas_pagamento").update({ paga: true }).eq("id", guia.id);
    const logo = await urlToDataUrl(logoUrl);
    const pdfUrl = buildGuiaPDF(guia, caixa ?? undefined, logo).output("bloburl") as unknown as string;
    if (popup) popup.location.href = pdfUrl; else window.open(pdfUrl, "_blank");
    setLoading(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["folhas-guias"] }),
      queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["descricoes-guias"] }),
    ]);
    toast({ title: "Guia cadastrada!", description: "O PDF foi aberto em uma nova aba." });
    navigate("/guias");
  };

  const percent = (id: string, label: string, field: string) => <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min="0" step="0.01" value={form[field as keyof typeof form]} onChange={(e) => set(field, e.target.value)} /></div>;
  const money = (id: string, label: string, field: string, required = false) => <div className="space-y-2"><Label htmlFor={id}>{label}</Label><CurrencyInput id={id} value={form[field as keyof typeof form]} onValueChange={(value) => set(field, value)} required={required} /></div>;

return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          onClick={() => navigate("/guias")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Guias de Recolhimento
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Cadastrar Guia</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: IDENTIFICAÇÃO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação da guia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  list="descricoes-cadastradas"
                  maxLength={200}
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  placeholder="Digite ou selecione uma descrição"
                />
                <datalist id="descricoes-cadastradas">
                  {descricoes.map((item) => (
                    <option key={item.id} value={item.nome} />
                  ))}
                </datalist>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="salvar-descricao"
                    checked={salvarDescricao}
                    onCheckedChange={(value) => setSalvarDescricao(value === true)}
                  />
                  <Label htmlFor="salvar-descricao" className="font-normal">
                    Cadastrar esta descrição para reutilizar
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Órgão pagador *</Label>
                <Select value={form.orgaoId} onValueChange={(value) => set("orgaoId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o órgão" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgaos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Data de emissão *</Label>
                <DateField value={form.dataEmissao} onChange={(value) => set("dataEmissao", value)} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <DateField value={form.vencimento} onChange={(value) => set("vencimento", value)} />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={form.grupoFolha} onValueChange={(value) => set("grupoFolha", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 - Normal">Normal</SelectItem>
                    <SelectItem value="2 - 13° Salário">13° Salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: CONTRIBUIÇÕES */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contribuições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {money("remuneracao", "Remuneração (R$)", "remuneracao", true)}
              {money("base", "Base de cálculo (R$)", "baseCalculo", true)}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {percent("as", "Alíquota servidor (%)", "aliquotaServidor")}
              {percent("ap", "Alíquota patronal (%)", "aliquotaPatronal")}
              <div className="space-y-2">
                <Label>Alíquota suplementar</Label>
                <Select value={form.usaSuplementar} onValueChange={(value) => set("usaSuplementar", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não aplicar</SelectItem>
                    <SelectItem value="sim">Aplicar {form.aliquotaSuplementar}%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CONTRIBUIÇÕES COM OS TEXTOS INFORMATIVOS JÁ REMOVIDOS */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Contribuição servidor (R$)</Label>
                <CurrencyInput
                  value={valorServidorManual ?? currencyToInput(servidor)}
                  onValueChange={setValorServidorManual}
                />
              </div>
              <div className="space-y-2">
                <Label>Contribuição patronal (R$)</Label>
                <CurrencyInput
                  value={valorPatronalManual ?? currencyToInput(patronal)}
                  onValueChange={setValorPatronalManual}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {money("mat", "Salário maternidade", "salarioMaternidade")}
              {money("fam", "Salário família", "salarioFamilia")}
              {money("aux", "Auxílio doença", "auxDoenca")}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {percent("juros-multa", "Juros e Multa (%)", "jurosMulta")}
              <CorrecaoMonetaria
                id="correcao"
                checked={aplicaCorrecao}
                onChange={setAplicaCorrecao}
                indice={caixa?.indice_correcao}
                aliquota={caixa?.aliquota_correcao}
                disabled={!caixa}
              />
            </div>

            <div className="grid gap-4 rounded-md bg-muted p-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Devido servidor</p>
                <p className="text-xl font-bold">{fmtBRL(preview.devidoServidor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Devido patronal</p>
                <p className="text-xl font-bold">{fmtBRL(preview.devidoPatronal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: PAGAMENTOS INICIAIS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos iniciais (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {money("ps", "Valor pago — servidor", "pagamentoServidor")}
              <div className="space-y-2">
                <Label>Data — servidor</Label>
                <DateField
                  value={form.dataPagamentoServidor}
                  onChange={(value) => set("dataPagamentoServidor", value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              {money("pp", "Valor pago — patronal", "pagamentoPatronal")}
              <div className="space-y-2">
                <Label>Data — patronal</Label>
                <DateField
                  value={form.dataPagamentoPatronal}
                  onChange={(value) => set("dataPagamentoPatronal", value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Cadastrando..." : "Cadastrar e visualizar PDF"}
          </Button>
        </div>
      </form>
    </div>
  );
