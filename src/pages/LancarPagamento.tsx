import { useState } from "react";
import { ArrowLeft, CreditCard, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateField } from "@/components/DateField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, parseCurrency } from "@/lib/format";
import { resumirPagamentos } from "@/lib/guiaCalculations";

export default function LancarPagamento() {
  const { folhaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [natureza, setNatureza] = useState<"servidor" | "patronal">("servidor");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: guia, isLoading } = useQuery({ queryKey: ["guia", folhaId], queryFn: async () => { const { data, error } = await supabase.from("folhas_pagamento").select("*").eq("id", folhaId ?? "").single(); if (error) throw error; return data; }, enabled: Boolean(folhaId) });
  const { data: pagamentos = [] } = useQuery({ queryKey: ["pagamentos-guia", folhaId], queryFn: async () => { const { data, error } = await supabase.from("pagamentos").select("*").eq("folha_id", folhaId ?? ""); if (error) throw error; return data ?? []; }, enabled: Boolean(folhaId) });
  const resumo = guia ? resumirPagamentos(guia, pagamentos) : null;
  const saldo = natureza === "servidor" ? resumo?.saldoServidor ?? 0 : resumo?.saldoPatronal ?? 0;

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const valorNumerico = parseCurrency(valor);
    if (!guia || valorNumerico <= 0 || !data) { toast({ title: "Preencha valor e data", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.from("pagamentos").insert({ folha_id: guia.id, natureza, valor_pago: valorNumerico, valor_recebido: valorNumerico, data_pagamento: `${data}T12:00:00`, observacoes: observacoes || null });
    if (error) { setLoading(false); toast({ title: "Erro ao lançar pagamento", description: error.message, variant: "destructive" }); return; }
    const novoPagoServidor = resumo!.pagoServidor + (natureza === "servidor" ? valorNumerico : 0);
    const novoPagoPatronal = resumo!.pagoPatronal + (natureza === "patronal" ? valorNumerico : 0);
    const paga = novoPagoServidor + 0.009 >= resumo!.devidoServidor && novoPagoPatronal + 0.009 >= resumo!.devidoPatronal;
    await supabase.from("folhas_pagamento").update({ paga }).eq("id", guia.id);
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["folhas-guias"] }), queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] })]);
    setLoading(false); toast({ title: "Pagamento lançado!" }); navigate("/guias");
  };
  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
  if (!guia || !resumo) return <div className="py-20 text-center text-muted-foreground">Guia não encontrada.</div>;
  return <div className="max-w-3xl space-y-6"><div><Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/guias")}><ArrowLeft className="mr-1 h-4 w-4" />Buscar guias</Button><h1 className="text-2xl font-bold">Lançar Pagamento</h1><p className="mt-1 text-muted-foreground">{guia.centro_custo} · {guia.orgao}</p></div>
    <Card><CardHeader><CardTitle className="text-base">Saldos da guia</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Saldo nome="Servidor" devido={resumo.devidoServidor} pago={resumo.pagoServidor} saldo={resumo.saldoServidor} /><Saldo nome="Patronal" devido={resumo.devidoPatronal} pago={resumo.pagoPatronal} saldo={resumo.saldoPatronal} /></CardContent></Card>
    <form onSubmit={salvar}><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Novo pagamento</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Parte</Label><Select value={natureza} onValueChange={(value: "servidor" | "patronal") => setNatureza(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="servidor">Servidor</SelectItem><SelectItem value="patronal">Patronal</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Saldo atual: {fmtBRL(saldo)}</p></div><div className="space-y-2"><Label>Valor pago</Label><CurrencyInput value={valor} onValueChange={setValor} /></div><div className="space-y-2"><Label>Data do pagamento</Label><DateField value={data} onChange={setData} /></div></div><div className="space-y-2"><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div><div className="flex justify-end"><Button type="submit" disabled={loading || saldo <= 0}><Save className="mr-2 h-4 w-4" />{loading ? "Salvando..." : "Lançar pagamento"}</Button></div></CardContent></Card></form>
  </div>;
}
function Saldo({ nome, devido, pago, saldo }: { nome: string; devido: number; pago: number; saldo: number }) { return <div className="rounded-md border border-border p-4"><p className="font-semibold">{nome}</p><p className="text-sm text-muted-foreground">Devido: {fmtBRL(devido)}</p><p className="text-sm text-muted-foreground">Pago: {fmtBRL(pago)}</p><p className="mt-1 font-bold">Saldo: {fmtBRL(saldo)}</p></div>; }