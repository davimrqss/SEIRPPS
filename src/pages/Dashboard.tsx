import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Download, FileText, TrendingUp, UserRound, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva } from "@/hooks/useCaixa";
import { useOrgaos } from "@/hooks/useCadastros";
import { fmtBRL } from "@/lib/format";
import { resumirPagamentos } from "@/lib/guiaCalculations";
import { downloadRelatorioMensal, type LinhaRelatorio } from "@/lib/relatorioPdf";

const mesBR = (mes: string) => new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export default function Dashboard() {
  const { activeCaixaId } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const { data: orgaos = [] } = useOrgaos();
  const [mes, setMes] = useState("todos");
  const [orgao, setOrgao] = useState("todos");

  const { data: guias = [], isLoading } = useQuery({
    queryKey: ["folhas-dashboard", activeCaixaId],
    queryFn: async () => {
      if (!activeCaixaId) return [];
      const { data, error } = await supabase.from("folhas_pagamento").select("*").eq("caixa_id", activeCaixaId).order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(activeCaixaId),
  });
  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos-dashboard", activeCaixaId, guias.map((g) => g.id).join(",")],
    queryFn: async () => {
      if (!guias.length) return [];
      const { data, error } = await supabase.from("pagamentos").select("*").in("folha_id", guias.map((g) => g.id));
      if (error) throw error;
      return data ?? [];
    },
    enabled: guias.length > 0,
  });

  const meses = useMemo(() => [...new Set(guias.map((g) => g.mes_referencia))].sort().reverse(), [guias]);
  const filtradas = useMemo(() => guias.filter((g) => (mes === "todos" || g.mes_referencia === mes) && (orgao === "todos" || g.orgao_id === orgao)), [guias, mes, orgao]);
  const resumos = useMemo(() => filtradas.map((guia) => ({ guia, resumo: resumirPagamentos(guia, pagamentos) })), [filtradas, pagamentos]);
  const total = resumos.reduce((acc, { resumo }) => ({
    devidoServidor: acc.devidoServidor + resumo.devidoServidor, pagoServidor: acc.pagoServidor + resumo.pagoServidor,
    saldoServidor: acc.saldoServidor + resumo.saldoServidor, devidoPatronal: acc.devidoPatronal + resumo.devidoPatronal,
    pagoPatronal: acc.pagoPatronal + resumo.pagoPatronal, saldoPatronal: acc.saldoPatronal + resumo.saldoPatronal,
  }), { devidoServidor: 0, pagoServidor: 0, saldoServidor: 0, devidoPatronal: 0, pagoPatronal: 0, saldoPatronal: 0 });

  const relatorio = useMemo<LinhaRelatorio[]>(() => {
    const grupos = new Map<string, LinhaRelatorio>();
    resumos.forEach(({ guia, resumo }) => {
      const key = `${guia.mes_referencia}|${guia.orgao_id ?? guia.orgao}`;
      const atual = grupos.get(key) ?? { mes: guia.mes_referencia, orgao: guia.orgao, remuneracao: 0, base: 0, devidoServidor: 0, devidoPatronal: 0, pagoServidor: 0, pagoPatronal: 0, saldoServidor: 0, saldoPatronal: 0 };
      atual.remuneracao += Number(guia.remuneracao); atual.base += Number(guia.base_calculo);
      atual.devidoServidor += resumo.devidoServidor; atual.devidoPatronal += resumo.devidoPatronal;
      atual.pagoServidor += resumo.pagoServidor; atual.pagoPatronal += resumo.pagoPatronal;
      atual.saldoServidor += resumo.saldoServidor; atual.saldoPatronal += resumo.saldoPatronal;
      grupos.set(key, atual);
    });
    return [...grupos.values()].sort((a, b) => b.mes.localeCompare(a.mes) || a.orgao.localeCompare(b.orgao));
  }, [resumos]);

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
  const stats = [
    { title: "Devido — Servidor", value: total.devidoServidor, icon: UserRound },
    { title: "Pago — Servidor", value: total.pagoServidor, icon: CheckCircle },
    { title: "Saldo — Servidor", value: total.saldoServidor, icon: AlertTriangle },
    { title: "Devido — Patronal", value: total.devidoPatronal, icon: Building2 },
    { title: "Pago — Patronal", value: total.pagoPatronal, icon: CheckCircle },
    { title: "Saldo — Patronal", value: total.saldoPatronal, icon: AlertTriangle },
  ];

  return <div className="space-y-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-2xl font-bold text-foreground">Dashboard</h1><p className="mt-1 text-muted-foreground">Panorama previdenciário da caixa ativa</p></div><div className="grid gap-3 sm:grid-cols-2"><Select value={mes} onValueChange={setMes}><SelectTrigger className="min-w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((item) => <SelectItem key={item} value={item}>{mesBR(item)}</SelectItem>)}</SelectContent></Select><Select value={orgao} onValueChange={setOrgao}><SelectTrigger className="min-w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os órgãos</SelectItem>{orgaos.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map((stat) => <Card key={stat.title}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{stat.title}</p><p className="mt-1 text-xl font-bold text-foreground">{fmtBRL(stat.value)}</p></div><stat.icon className="h-6 w-6 text-primary" /></CardContent></Card>)}</div>
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Panorama mensal por órgão</CardTitle><Button variant="outline" size="sm" disabled={!relatorio.length} onClick={() => downloadRelatorioMensal(relatorio, caixa?.nome ?? "Caixa de Previdência", mes === "todos" ? "todos-os-periodos" : mesBR(mes))}><Download className="mr-2 h-4 w-4" />Exportar PDF</Button></CardHeader><CardContent>{!relatorio.length ? <p className="py-8 text-center text-muted-foreground">Nenhuma guia encontrada para os filtros selecionados.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-sm"><thead><tr className="border-b border-border">{["Mês", "Órgão", "Remuneração", "Base", "Devido serv.", "Pago serv.", "Saldo serv.", "Devido patr.", "Pago patr.", "Saldo patr."].map((h, i) => <th key={h} className={`px-3 py-3 font-medium text-muted-foreground ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>)}</tr></thead><tbody>{relatorio.map((linha) => <tr key={`${linha.mes}-${linha.orgao}`} className="border-b border-border/50"><td className="px-3 py-3">{mesBR(linha.mes)}</td><td className="px-3 py-3 font-medium">{linha.orgao}</td>{[linha.remuneracao, linha.base, linha.devidoServidor, linha.pagoServidor, linha.saldoServidor, linha.devidoPatronal, linha.pagoPatronal, linha.saldoPatronal].map((v, i) => <td key={i} className="px-3 py-3 text-right">{fmtBRL(v)}</td>)}</tr>)}</tbody></table></div>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Guias recentes</CardTitle></CardHeader><CardContent>{!resumos.length ? <p className="py-8 text-center text-muted-foreground">Nenhuma guia cadastrada.</p> : <div className="space-y-2">{resumos.slice(0, 5).map(({ guia, resumo }) => <div key={guia.id} className="flex flex-col gap-2 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{guia.centro_custo}</p><p className="text-sm text-muted-foreground">{guia.orgao} · {mesBR(guia.mes_referencia)}</p></div><div className="flex gap-2"><Badge variant="outline">Servidor: {fmtBRL(resumo.saldoServidor)}</Badge><Badge variant="outline">Patronal: {fmtBRL(resumo.saldoPatronal)}</Badge></div></div>)}</div>}</CardContent></Card>
  </div>;
}