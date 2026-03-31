import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Filter, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function FolhasPagamento() {
  const navigate = useNavigate();
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const { data: folhas = [], isLoading } = useQuery({
    queryKey: ["folhas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const meses = useMemo(() => {
    const unique = [...new Set(folhas.map((f) => f.mes_referencia))];
    return unique.sort().reverse();
  }, [folhas]);

  const folhasFiltradas = useMemo(() => {
    return folhas.filter((f) => {
      if (filtroMes !== "todos" && f.mes_referencia !== filtroMes) return false;
      if (filtroStatus === "paga" && !f.paga) return false;
      if (filtroStatus === "pendente" && f.paga) return false;
      if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
      return true;
    });
  }, [folhas, filtroMes, filtroStatus, filtroTipo]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatMes = (mes: string) =>
    new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Folhas de Pagamento</h1>
          <p className="text-muted-foreground mt-1">Gerencie e acompanhe as folhas de pagamento</p>
        </div>
        <Button onClick={() => navigate("/lancamentos")}>
          <Plus className="h-4 w-4 mr-2" />Nova Folha
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Período (Mês)</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger><SelectValue placeholder="Todos os meses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {meses.map((m) => (<SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo de Folha</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="servidor">Servidor</SelectItem>
                  <SelectItem value="patronal">Patronal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Centro de Custo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mês Ref.</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Remuneração</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Base Cálculo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Servidor</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Patronal</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {folhasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma folha encontrada
                    </td>
                  </tr>
                ) : (
                  folhasFiltradas.map((folha) => (
                    <tr key={folha.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {folha.centro_custo}
                        {folha.is_13 && <Badge variant="outline" className="ml-2 text-xs">13°</Badge>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatMes(folha.mes_referencia)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={folha.tipo === "servidor" ? "default" : "secondary"} className="capitalize">{folha.tipo}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{fmt(Number(folha.remuneracao))}</td>
                      <td className="py-3 px-4 text-right text-foreground">{fmt(Number(folha.base_calculo))}</td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {fmt(Number(folha.valor_servidor))} <span className="text-xs text-muted-foreground">({folha.aliquota_servidor}%)</span>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">
                        {fmt(Number(folha.valor_patronal))} <span className="text-xs text-muted-foreground">({folha.aliquota_patronal}%)</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={folha.paga ? "bg-success/10 text-success hover:bg-success/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}>
                          {folha.paga ? "Paga" : "Pendente"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
