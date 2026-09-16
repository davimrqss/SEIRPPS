import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CreditCard, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CurrencyInput } from "@/components/CurrencyInput";
import { fmtBRL, isoToBR, parseCurrency } from "@/lib/format";

const formatMes = (mes: string) =>
  new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export default function LancarPagamento() {
  const { toast } = useToast();
  const { folhaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState("servidor");
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: folha, isLoading } = useQuery({
    queryKey: ["folha", folhaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*")
        .eq("id", folhaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!folhaId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folha) return;
    const valorNum = parseCurrency(valor);
    if (valorNum <= 0) {
      toast({ title: "Valor inválido", description: "Informe o valor do pagamento.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("pagamentos").insert({
      folha_id: folha.id,
      valor_pago: valorNum,
      valor_recebido: valorNum,
      observacoes: `${tipo === "servidor" ? "Contribuição servidor" : "Contribuição patronal"}${observacoes ? " — " + observacoes : ""}`,
    });

    if (error) {
      setLoading(false);
      toast({ title: "Erro ao lançar pagamento", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("folhas_pagamento").update({ paga: true }).eq("id", folha.id);

    setLoading(false);
    queryClient.invalidateQueries({ queryKey: ["folhas"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-guias"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] });
    toast({ title: "Pagamento lançado!", description: `${folha.centro_custo} — ${fmtBRL(valorNum)}` });
    navigate("/guias");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;
  }

  if (!folha) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Folha não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/guias")}>Voltar para Guias</Button>
      </div>
    );
  }

  const valorSugerido = tipo === "servidor" ? Number(folha.valor_servidor) : Number(folha.valor_patronal);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/guias")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar para Guias
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Lançar Pagamento</h1>
        <p className="text-muted-foreground mt-1">
          {folha.centro_custo} — {formatMes(folha.mes_referencia)}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Folha</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Info label="Centro de Custo" value={folha.centro_custo} />
          <Info label="Órgão" value={folha.orgao} />
          <Info label="Mês de Referência" value={formatMes(folha.mes_referencia)} />
          <Info label="Data de Emissão" value={folha.data_emissao ? isoToBR(folha.data_emissao) : "Não informada"} />
          <Info label="Vencimento" value={isoToBR(folha.vencimento)} />
          <Info label="Remuneração" value={fmtBRL(Number(folha.remuneracao))} />
          <Info label="Base de Cálculo" value={fmtBRL(Number(folha.base_calculo))} />
          <Info label={`Servidor (${folha.aliquota_servidor}%)`} value={fmtBRL(Number(folha.valor_servidor))} />
          <Info label={`Patronal (${folha.aliquota_patronal}%)`} value={fmtBRL(Number(folha.valor_patronal))} />
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge className={folha.paga ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
              {folha.paga ? "Paga" : "Pendente"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipoPag">Tipo de Contribuição</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger id="tipoPag"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="patronal">Patronal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Valor previsto: {fmtBRL(valorSugerido)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorPag">Valor do Pagamento (R$)</Label>
                <CurrencyInput id="valorPag" value={valor} onValueChange={setValor} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Informações adicionais sobre o pagamento" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : "Lançar Pagamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground capitalize">{value}</p>
    </div>
  );
}
