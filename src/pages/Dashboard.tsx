import { useMemo, useState } from "react";
import { CheckCircle, Download, FileText, TrendingUp, UserRound, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva } from "@/hooks/useCaixa";
import { useOrgaos } from "@/hooks/useCadastros";
import { fmtBRL } from "@/lib/format";
import { resumirPagamentos } from "@/lib/guiaCalculations";
import { downloadRelatorioMensal, type LinhaRelatorio } from "@/lib/relatorioPdf";

const mesBR = (mes: string) => new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const barConfig = {
  servidor: { label: "Servidor", color: "hsl(var(--primary))" },
  patronal: { label: "Patronal", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

const pieConfig = {
  pago: { label: "Pago", color: "hsl(var(--success))" },
  pendente: { label: "Pendente", color: "hsl(var(--warning))" },
} satisfies ChartConfig;

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

  const colunas = useMemo(() => {
    const porMes = new Map<string, { mes: string; servidor: number; patronal: number }>();
    relatorio.forEach((linha) => {
      const atual = porMes.get(linha.mes) ?? { mes: linha.mes, servidor: 0, patronal: 0 };
      atual.servidor += linha.saldoServidor <= 0.009 ? linha.pagoServidor : linha.saldoServidor;
      atual.patronal += linha.saldoPatronal <= 0.009 ? linha.pagoPatronal : linha.saldoPatronal;
      porMes.set(linha.mes, atual);
    });
    return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((item) => ({
      ...item,
      label: mesBR(item.mes).replace(" de ", "/"),
    }));
  }, [relatorio]);

  const pizza = useMemo(() => [
    { status: "pago", valor: total.pagoServidor + total.pagoPatronal, fill: "var(--color-pago)" },
    { status: "pendente", valor: total.saldoServidor + total.saldoPatronal, fill: "var(--color-pendente)" },
  ].filter((item) => item.valor > 0.009), [total]);

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
const servidorQuitado = total.saldoServidor <= 0.009;
const patronalQuitado = total.saldoPatronal <= 0.009;

const stats = [
  {
    title: servidorQuitado ? "Pago — Servidor" : "Devido — Servidor",
    value: servidorQuitado ? total.pagoServidor : total.saldoServidor,
    icon: servidorQuitado ? CheckCircle : UserRound,
  },
  {
    title: patronalQuitado ? "Pago — Patronal" : "Devido — Patronal",
    value: patronalQuitado ? total.pagoPatronal : total.saldoPatronal,
    icon: patronalQuitado ? CheckCircle : Building2,
  },
];

return (
  <div className="space-y-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard
        </h1>

        <p className="mt-1 text-muted-foreground">
          Panorama previdenciário da caixa ativa
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="min-w-48">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">
              Todos os meses
            </SelectItem>

            {meses.map((item) => (
              <SelectItem key={item} value={item}>
                {mesBR(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={orgao} onValueChange={setOrgao}>
          <SelectTrigger className="min-w-52">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="todos">
              Todos os órgãos
            </SelectItem>

            {orgaos.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                {stat.title}
              </p>

              <p className="mt-1 text-xl font-bold text-foreground">
                {fmtBRL(stat.value)}
              </p>
            </div>

            <stat.icon className="h-6 w-6 text-primary" />
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servidor e patronal por mês</CardTitle>
        </CardHeader>
        <CardContent>
          {colunas.length ? (
            <ChartContainer config={barConfig} className="h-72 w-full">
              <BarChart data={colunas} accessibilityLayer margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { notation: "compact" })}`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtBRL(Number(value))} />} />
                <Bar dataKey="servidor" fill="var(--color-servidor)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="patronal" fill="var(--color-patronal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-20 text-center text-muted-foreground">Sem dados para exibir.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição dos valores</CardTitle>
        </CardHeader>
        <CardContent>
          {pizza.length ? (
            <ChartContainer config={pieConfig} className="h-72 w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => (
                  <div className="flex min-w-36 items-center justify-between gap-3">
                    <span>{pieConfig[name as keyof typeof pieConfig]?.label}</span>
                    <span className="font-mono font-medium tabular-nums">{fmtBRL(Number(value))}</span>
                  </div>
                )} />} />
                <Pie data={pizza} dataKey="valor" nameKey="status" innerRadius={58} outerRadius={92} paddingAngle={2}>
                  {pizza.map((item) => <Cell key={item.status} fill={item.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="py-20 text-center text-muted-foreground">Sem dados para exibir.</p>
          )}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Panorama mensal por órgão
        </CardTitle>

        <Button
          variant="outline"
          size="sm"
          disabled={!relatorio.length}
          onClick={() =>
            downloadRelatorioMensal(
              relatorio,
              caixa?.nome ?? "Caixa de Previdência",
              mes === "todos" ? "todos-os-periodos" : mesBR(mes),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </CardHeader>

      <CardContent>
        {!relatorio.length ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhuma guia encontrada para os filtros selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Mês",
                    "Órgão",
                    "Remuneração",
                    "Base",
                    "Servidor",
                    "Patronal",
                    ].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-3 font-medium text-muted-foreground ${
                            i < 2 ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                </tr>
              </thead>

              <tbody>
                {relatorio.map((linha) => (
                  <tr
                    key={`${linha.mes}-${linha.orgao}`}
                    className="border-b border-border/50"
                  >
                    <td className="px-3 py-3">
                      {mesBR(linha.mes)}
                    </td>

                    <td className="px-3 py-3 font-medium">
                      {linha.orgao}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {fmtBRL(linha.remuneracao)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {fmtBRL(linha.base)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <span className="block text-xs text-muted-foreground">
                        {linha.saldoServidor <= 0.009 ? "Pago" : "Devido"}
                      </span>

                      <span className="font-medium">
                        {fmtBRL(
                          linha.saldoServidor <= 0.009
                            ? linha.pagoServidor
                            : linha.saldoServidor
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <span className="block text-xs text-muted-foreground">
                        {linha.saldoPatronal <= 0.009 ? "Pago" : "Devido"}
                      </span>

                      <span className="font-medium">
                        {fmtBRL(
                          linha.saldoPatronal <= 0.009
                            ? linha.pagoPatronal
                            : linha.saldoPatronal
                        )}
                      </span>
                    </td>                  
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Guias recentes
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!resumos.length ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhuma guia cadastrada.
          </p>
        ) : (
          <div className="space-y-2">
            {resumos
              .slice(0, 5)
              .map(({ guia, resumo }) => (
                <div
                  key={guia.id}
                  className="flex flex-col gap-2 border-b border-border/50 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {guia.centro_custo}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {guia.orgao} · {mesBR(guia.mes_referencia)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Servidor — {resumo.statusServidor === "pago" ? "Pago" : "Devido"}:{" "}
                      {fmtBRL(
                        resumo.statusServidor === "pago"
                          ? resumo.pagoServidor
                          : resumo.saldoServidor
                      )}
                    </Badge>

                    <Badge variant="outline">
                      Patronal — {resumo.statusPatronal === "pago" ? "Pago" : "Devido"}:{" "}
                      {fmtBRL(
                        resumo.statusPatronal === "pago"
                          ? resumo.pagoPatronal
                          : resumo.saldoPatronal
                      )}
                    </Badge>
                </div>
             </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);
}
