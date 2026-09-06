import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { fmtBRL, parseCurrency } from "@/lib/format";

export default function NovaFolha() {
  const { toast } = useToast();
  const { activeCaixaId } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    centroCusto: "",
    codigoCentroCusto: "",
    orgao: "",
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
    tipo: "servidor",
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

  const baseCalc = parseCurrency(form.baseCalculo);
  const aliqServ = parseFloat(form.aliquotaServidor) || 0;
  const aliqPat = parseFloat(form.aliquotaPatronal) || 0;
  const aliqSup = form.usaSuplementar === "sim" ? parseFloat(form.aliquotaSuplementar) || 0 : 0;
  const valorServidor = baseCalc * (aliqServ / 100);
  const valorPatronal = baseCalc * (aliqPat / 100);
  const valorSuplementar = baseCalc * (aliqSup / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaixaId) {
      toast({ title: "Erro", description: "Selecione uma caixa de previdência.", variant: "destructive" });
      return;
    }
    if (!form.vencimento) {
      toast({ title: "Data inválida", description: "Informe o vencimento no formato dd-mm-aaaa.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const mesReferencia = form.vencimento.slice(0, 7);

    const { error } = await supabase.from("folhas_pagamento").insert({
      centro_custo: form.centroCusto,
      codigo_centro_custo: form.codigoCentroCusto || null,
      orgao: form.orgao,
      mes_referencia: mesReferencia,
      vencimento: form.vencimento,
      num_empregados: parseInt(form.numEmpregados) || 0,
      grupo_folha: form.grupoFolha,
      remuneracao: parseCurrency(form.remuneracao),
      base_calculo: baseCalc,
      valor_servidor: valorServidor,
      valor_patronal: valorPatronal,
      valor_suplementar: valorSuplementar,
      salario_maternidade: parseCurrency(form.salarioMaternidade),
      salario_familia: parseCurrency(form.salarioFamilia),
      aux_doenca: parseCurrency(form.auxDoenca),
      juros_multa: parseCurrency(form.jurosMulta),
      aliquota_servidor: aliqServ,
      aliquota_patronal: aliqPat,
      is_13: form.grupoFolha.includes("13"),
      tipo: form.tipo,
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
              <div className="space-y-2">
                <Label htmlFor="codigoCentroCusto">Código Centro de Custo</Label>
                <Input id="codigoCentroCusto" placeholder="Ex: 001" value={form.codigoCentroCusto} onChange={(e) => handleChange("codigoCentroCusto", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Input id="centroCusto" placeholder="Ex: Secretaria de Educação" value={form.centroCusto} onChange={(e) => handleChange("centroCusto", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgao">Órgão</Label>
                <Input id="orgao" placeholder="Ex: Prefeitura Municipal" value={form.orgao} onChange={(e) => handleChange("orgao", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vencimento">Data de Recolhimento</Label>
                <DateField id="vencimento" value={form.vencimento} onChange={(v) => handleChange("vencimento", v)} required />
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Folha</Label>
                <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="patronal">Patronal</SelectItem>
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
                <Label htmlFor="aliqSup">Alíquota Suplementar (%)</Label>
                <Input id="aliqSup" type="number" step="0.01" value={form.aliquotaSuplementar} onChange={(e) => handleChange("aliquotaSuplementar", e.target.value)} />
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
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorServidor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patronal</p>
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorPatronal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suplementar</p>
                <p className="text-lg font-bold text-foreground">{fmtBRL(valorSuplementar)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a recolher</p>
                <p className="text-lg font-bold text-foreground">
                  {fmtBRL(
                    valorServidor + valorPatronal + valorSuplementar
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
