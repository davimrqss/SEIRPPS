import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CreditCard, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function LancarPagamento() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    centroCusto: "",
    orgao: "",
    mesReferencia: "",
    remuneracao: "",
    baseCalculo: "",
    aliquotaServidor: "11",
    aliquotaPatronal: "22",
    is13: false,
    tipo: "servidor",
    valorPago: "",
    valorRecebido: "",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.caixa_id) {
      toast({ title: "Erro", description: "Você precisa estar vinculado a uma caixa de previdência.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const baseCalc = parseFloat(form.baseCalculo) || 0;
    const aliqServ = parseFloat(form.aliquotaServidor) || 0;
    const aliqPat = parseFloat(form.aliquotaPatronal) || 0;

    const { data: folha, error } = await supabase.from("folhas_pagamento").insert({
      centro_custo: form.centroCusto,
      orgao: form.orgao,
      mes_referencia: form.mesReferencia,
      vencimento: form.mesReferencia + "-20",
      remuneracao: parseFloat(form.remuneracao) || 0,
      base_calculo: baseCalc,
      valor_servidor: baseCalc * (aliqServ / 100),
      valor_patronal: baseCalc * (aliqPat / 100),
      aliquota_servidor: aliqServ,
      aliquota_patronal: aliqPat,
      is_13: form.is13,
      tipo: form.tipo,
      caixa_id: profile.caixa_id,
    }).select().single();

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // If payment values provided, create pagamento
    const valorPago = parseFloat(form.valorPago) || 0;
    const valorRecebido = parseFloat(form.valorRecebido) || 0;
    if (valorPago > 0 || valorRecebido > 0) {
      await supabase.from("pagamentos").insert({
        folha_id: folha.id,
        valor_pago: valorPago,
        valor_recebido: valorRecebido,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["folhas"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] });
    toast({ title: "Folha lançada com sucesso!", description: `${form.centroCusto} - ${form.mesReferencia}` });
    setLoading(false);
    navigate("/folhas");
  };

  const baseCalc = parseFloat(form.baseCalculo) || 0;
  const aliqServ = parseFloat(form.aliquotaServidor) || 0;
  const aliqPat = parseFloat(form.aliquotaPatronal) || 0;
  const valorServidor = baseCalc * (aliqServ / 100);
  const valorPatronal = baseCalc * (aliqPat / 100);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lançar Pagamento</h1>
        <p className="text-muted-foreground mt-1">Registre uma nova folha de pagamento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da Folha</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="mesReferencia">Mês de Referência</Label>
                <Input id="mesReferencia" type="month" value={form.mesReferencia} onChange={(e) => handleChange("mesReferencia", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Folha</Label>
                <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="patronal">Patronal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch id="is13" checked={form.is13} onCheckedChange={(v) => handleChange("is13", v)} />
                <Label htmlFor="is13">13° Salário</Label>
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
                <Input id="remuneracao" type="number" step="0.01" placeholder="0,00" value={form.remuneracao} onChange={(e) => handleChange("remuneracao", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCalculo">Base de Cálculo (R$)</Label>
                <Input id="baseCalculo" type="number" step="0.01" placeholder="0,00" value={form.baseCalculo} onChange={(e) => handleChange("baseCalculo", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aliqServ">Alíquota Servidor (%)</Label>
                <Input id="aliqServ" type="number" step="0.01" value={form.aliquotaServidor} onChange={(e) => handleChange("aliquotaServidor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliqPat">Alíquota Patronal (%)</Label>
                <Input id="aliqPat" type="number" step="0.01" value={form.aliquotaPatronal} onChange={(e) => handleChange("aliquotaPatronal", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Servidor</p>
                <p className="text-lg font-bold text-foreground">{fmt(valorServidor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Patronal</p>
                <p className="text-lg font-bold text-foreground">{fmt(valorPatronal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Lançamento do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorPago">Valor Pago (R$)</Label>
                <Input id="valorPago" type="number" step="0.01" placeholder="0,00" value={form.valorPago} onChange={(e) => handleChange("valorPago", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorRecebido">Valor Recebido pela Caixa (R$)</Label>
                <Input id="valorRecebido" type="number" step="0.01" placeholder="0,00" value={form.valorRecebido} onChange={(e) => handleChange("valorRecebido", e.target.value)} />
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
