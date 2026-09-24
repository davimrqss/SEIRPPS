import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva } from "@/hooks/useCaixa";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateField } from "@/components/DateField";
import { currencyToInput, fmtBRL, parseCurrency } from "@/lib/format";
import { useCentrosCusto } from "@/hooks/useCadastros";

export type CentroOpt = {
  id: string;
  nome: string;
  codigo: string | null;
  orgaos?: { nome: string } | null;
};

export default function NovaFolha() {
  const { toast } = useToast();
  const { activeCaixaId } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: centros = [] } = useCentrosCusto();
  const [centroId, setCentroId] = useState("");
  const [valorServidorManual, setValorServidorManual] = useState<string | null>(null);
  const [valorPatronalManual, setValorPatronalManual] = useState<string | null>(null);
  const [form, setForm] = useState({
    centroCusto: "",
    codigoCentroCusto: "",
    orgao: "",
    dataEmissao: "",
    vencimento: "",
    numEmpregados: "",
    grupoFolha: "1 - Normal",
    remuneracao: "",
    baseCalculo: "",
    aliquotaServidor: "11",
    aliquotaPatronal: "22",
    aliquotaSuplementar: "0",
    usaSuplementar: "nao",
    salarioMaternidade: "",
    salarioFamilia: "",
    auxDoenca: "",
    jurosMulta: "",
  });

  // Alíquotas padrão vindas da caixa ativa
  useEffect(() => {
    if (!caixa) return;
    setForm((prev) => ({
      ...prev,
      aliquotaServidor: String(caixa.aliquota_servidor ?? prev.aliquotaServidor),
      aliquotaPatronal: String(caixa.aliquota_patronal ?? prev.aliquotaPatronal),
      aliquotaSuplementar: String(caixa.aliquota_suplementar ?? prev.aliquotaSuplementar),
    }));
  }, [caixa]);

  const handleChange = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selecionarCentro = (id: string) => {
    setCentroId(id);
    const c = (centros as CentroOpt[]).find((x) => x.id === id);
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      centroCusto: c.nome,
      codigoCentroCusto: c.codigo ?? "",
      orgao: c.orgaos?.nome ?? prev.orgao,
    }));
  };

  const baseCalc = parseCurrency(form.baseCalculo);
  const aliqServ = parseFloat(form.aliquotaServidor) || 0;
  const aliqPat = parseFloat(form.aliquotaPatronal) || 0;
  const aliqSup = form.usaSuplementar === "sim" ? parseFloat(form.aliquotaSuplementar) || 0 : 0;
  const valorServidor = baseCalc * (aliqServ / 100);
  const valorPatronal = baseCalc * (aliqPat / 100);
  const valorSuplementar = baseCalc * (aliqSup / 100);
  const valorServidorFinal = valorServidorManual === null ? valorServidor : parseCurrency(valorServidorManual);
  const valorPatronalFinal = valorPatronalManual === null ? valorPatronal : parseCurrency(valorPatronalManual);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast({ title: "Erro", description: "Selecione uma caixa de previdência.", variant: "destructive" });
      return;
    }
    if (!form.centroCusto) {
      toast({ title: "Centro de custo", description: "Selecione um centro de custo.", variant: "destructive" });
      return;
    }
    if (!form.dataEmissao || !form.vencimento) {
      toast({ title: "Datas obrigatórias", description: "Informe as datas de emissão e vencimento.", variant: "destructive" });
      return;
    }
    if (form.dataEmissao.slice(-2) !== "21" || form.vencimento.slice(-2) !== "20") {
      toast({ title: "Confira as datas", description: "A emissão deve ser no dia 21 e o vencimento no dia 20.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const mesReferencia = form.vencimento.slice(0, 7);

    const { error } = await supabase.from("folhas_pagamento").insert({
      centro_custo: form.centroCusto,
      codigo_centro_custo: form.codigoCentroCusto || null,
      orgao: form.orgao,
      mes_referencia: mesReferencia,
      data_emissao: form.dataEmissao,
      vencimento: form.vencimento,
      num_empregados: parseInt(form.numEmpregados) || 0,
      grupo_folha: form.grupoFolha,
      remuneracao: parseCurrency(form.remuneracao),
      base_calculo: baseCalc,
      valor_servidor: valorServidorFinal,
      valor_patronal: valorPatronalFinal,
      valor_suplementar: valorSuplementar,
      salario_maternidade: parseCurrency(form.salarioMaternidade),
      salario_familia: parseCurrency(form.salarioFamilia),
      aux_doenca: parseCurrency(form.auxDoenca),
      juros_multa: parseCurrency(form.jurosMulta),
      aliquota_servidor: aliqServ,
      aliquota_patronal: aliqPat,
      is_13: form.grupoFolha.includes("13"),
      tipo: "folha",
      caixa_id: activeCaixaId,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["folhas"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-guias"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] });
    toast({ title: "Folha lançada com sucesso!", description: `${form.centroCusto} - ${mesReferencia}` });
    navigate("/folhas");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/folhas")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Nova Folha de Pagamento</h1>
        <p className="text-muted-foreground mt-1">Cadastre os dados da folha e as contribuições</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da Folha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Select value={centroId || undefined} onValueChange={selecionarCentro}>
                  <SelectTrigger id="centroCusto">
                    <SelectValue placeholder={centros.length ? "Selecionar centro de custo" : "Nenhum centro de custo cadastrado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(centros as CentroOpt[]).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo} - {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataEmissao">Data de Emissão</Label>
                <DateField id="dataEmissao" value={form.dataEmissao} onChange={(v) => handleChange("dataEmissao", v)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vencimento">Data de Vencimento</Label>
                <DateField id="vencimento" value={form.vencimento} onChange={(v) => handleChange("vencimento", v)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numEmpregados">Nº de Servidores</Label>
                <Input id="numEmpregados" type="number" min="0" value={form.numEmpregados} onChange={(e) => handleChange("numEmpregados", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grupoFolha">Grupo Folha</Label>
                <Select value={form.grupoFolha} onValueChange={(v) => handleChange("grupoFolha", v)}>
                  <SelectTrigger id="grupoFolha"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 - Normal">1 - Normal</SelectItem>
                    <SelectItem value="2 - 13° Salário">2 - 13° Salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="remuneracao">Remuneração (R$)</Label>
                <CurrencyInput id="remuneracao" value={form.remuneracao} onValueChange={(v) => handleChange("remuneracao", v)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCalculo">Salário de Contribuição / Base (R$)</Label>
                <CurrencyInput id="baseCalculo" value={form.baseCalculo} onValueChange={(v) => handleChange("baseCalculo", v)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aliqServ">Alíquota Segurado (%)</Label>
                <Input id="aliqServ" type="number" step="0.01" value={form.aliquotaServidor} onChange={(e) => handleChange("aliquotaServidor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliqPat">Alíquota Patronal (%)</Label>
                <Input id="aliqPat" type="number" step="0.01" value={form.aliquotaPatronal} onChange={(e) => handleChange("aliquotaPatronal", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usaSup">Alíquota Suplementar</Label>
                <Select value={form.usaSuplementar} onValueChange={(v) => handleChange("usaSuplementar", v)}>
                  <SelectTrigger id="usaSup"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim ({form.aliquotaSuplementar}%)</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorServidor">Contribuição Servidor (R$)</Label>
                <CurrencyInput
                  id="valorServidor"
                  value={valorServidorManual ?? currencyToInput(valorServidor)}
                  onValueChange={setValorServidorManual}
                />
                <p className="text-xs text-muted-foreground">
                  {valorServidorManual === null ? "Calculado automaticamente" : "Valor informado manualmente"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorPatronal">Contribuição Patronal (R$)</Label>
                <CurrencyInput
                  id="valorPatronal"
                  value={valorPatronalManual ?? currencyToInput(valorPatronal)}
                  onValueChange={setValorPatronalManual}
                />
                <p className="text-xs text-muted-foreground">
                  {valorPatronalManual === null ? "Calculado automaticamente" : "Valor informado manualmente"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salMat">Salário Maternidade (R$)</Label>
                <CurrencyInput id="salMat" value={form.salarioMaternidade} onValueChange={(v) => handleChange("salarioMaternidade", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salFam">Salário Família (R$)</Label>
                <CurrencyInput id="salFam" value={form.salarioFamilia} onValueChange={(v) => handleChange("salarioFamilia", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auxDoenca">Auxílio Doença (R$)</Label>
                <CurrencyInput id="auxDoenca" value={form.auxDoenca} onValueChange={(v) => handleChange("auxDoenca", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurosMulta">Juros / Multa (R$)</Label>
                <CurrencyInput id="jurosMulta" value={form.jurosMulta} onValueChange={(v) => handleChange("jurosMulta", v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Segurados</p>
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorServidorFinal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patronal</p>
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorPatronalFinal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suplementar</p>
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorSuplementar)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a recolher</p>
                <p className="text-lg font-bold text-foreground">
                  {fmtBRL(
                    valorServidorFinal + valorPatronalFinal + valorSuplementar
                    - parseCurrency(form.salarioMaternidade)
                    - parseCurrency(form.salarioFamilia)
                    - parseCurrency(form.auxDoenca)
                    + parseCurrency(form.jurosMulta)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Folha"}
          </Button>
        </div>
      </form>
    </div>
  );
}
