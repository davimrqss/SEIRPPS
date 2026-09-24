import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Download, Eye, CreditCard, Grid2X2, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { downloadGuia, previewGuia } from "@/lib/guiaPdf";
import { fmtBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva, useLogoUrl } from "@/hooks/useCaixa";


export default function GuiasPDF() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [modoVisualizacao, setModoVisualizacao] = useState<"grade" | "lista">("grade");

  const { activeCaixaId } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const { data: logoUrl } = useLogoUrl(caixa?.logo_url);

  const { data: folhas = [], isLoading } = useQuery({
    queryKey: ["folhas-guias", activeCaixaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*")
        .eq("caixa_id", activeCaixaId!)
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeCaixaId,
  });

  const meses = useMemo(() => {
    const unique = [...new Set(folhas.map((f) => f.mes_referencia))];
    return unique.sort().reverse();
  }, [folhas]);

  const folhasFiltradas = useMemo(() => {
    if (filtroMes === "todos") return folhas;
    return folhas.filter((f) => f.mes_referencia === filtroMes);
  }, [folhas, filtroMes]);

  const formatMes = (mes: string) =>
    new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const handleVisualizar = (folha: (typeof folhas)[0]) => {
    previewGuia(folha, caixa ?? undefined, logoUrl);
  };

  const handleBaixar = (folha: (typeof folhas)[0]) => {
    downloadGuia(folha, caixa ?? undefined, logoUrl);
    toast({ title: "Guia gerada!", description: `${folha.centro_custo} - ${formatMes(folha.mes_referencia)}` });
  };


  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guias PDF</h1>
          <p className="text-muted-foreground mt-1">Gere guias em PDF para cada folha de pagamento</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Filtrar por Mês</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {meses.map((m) => (<SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="flex rounded-md border border-border p-1" aria-label="Modo de visualização">
                <Button
                  type="button"
                  variant={modoVisualizacao === "grade" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setModoVisualizacao("grade")}
                >
                  <Grid2X2 className="h-4 w-4 mr-2" />Grade
                </Button>
                <Button
                  type="button"
                  variant={modoVisualizacao === "lista" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setModoVisualizacao("lista")}
                >
                  <List className="h-4 w-4 mr-2" />Lista
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {folhasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma folha para gerar guia
          </CardContent>
        </Card>
      ) : (
        <div className={modoVisualizacao === "grade" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {folhasFiltradas.map((folha) => (
            <Card key={folha.id} className="hover:shadow-md transition-shadow">
              <CardContent className={modoVisualizacao === "grade" ? "p-6" : "p-4 sm:p-5"}>
                {modoVisualizacao === "lista" ? (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-start gap-3 min-w-0 lg:flex-1">
                      <div className="p-2 bg-primary/10 rounded-md shrink-0">
                        <FileDown className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground break-words">{folha.centro_custo}</h3>
                          {folha.is_13 && <Badge variant="outline" className="text-xs">13°</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatMes(folha.mes_referencia)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm lg:w-[390px]">
                      <div><span className="block text-muted-foreground">Servidor</span><strong className="text-foreground">{fmtBRL(Number(folha.valor_servidor))}</strong></div>
                      <div><span className="block text-muted-foreground">Patronal</span><strong className="text-foreground">{fmtBRL(Number(folha.valor_patronal))}</strong></div>
                      <div><span className="block text-muted-foreground">Total</span><strong className="text-foreground">{fmtBRL(Number(folha.valor_servidor) + Number(folha.valor_patronal))}</strong></div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleVisualizar(folha)}><Eye className="h-3.5 w-3.5 mr-1" />Visualizar</Button>
                      <Button size="sm" onClick={() => handleBaixar(folha)}><Download className="h-3.5 w-3.5 mr-1" />Baixar PDF</Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/guias/${folha.id}/pagamento`)}><CreditCard className="h-3.5 w-3.5 mr-1" />Lançar Pagamento</Button>
                    </div>
                  </div>
                ) : (
                <>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileDown className="h-6 w-6 text-primary" />
                  </div>
                  {folha.is_13 && <Badge variant="outline" className="text-xs">13°</Badge>}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{folha.centro_custo}</h3>
                <p className="text-sm text-muted-foreground mb-3">{formatMes(folha.mes_referencia)}</p>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servidor:</span>
                    <span className="font-medium text-foreground">{fmtBRL(Number(folha.valor_servidor))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patronal:</span>
                    <span className="font-medium text-foreground">{fmtBRL(Number(folha.valor_patronal))}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="font-medium text-foreground">Total:</span>
                    <span className="font-bold text-foreground">{fmtBRL(Number(folha.valor_servidor) + Number(folha.valor_patronal))}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleVisualizar(folha)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />Visualizar
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => handleBaixar(folha)}>
                      <Download className="h-3.5 w-3.5 mr-1" />Baixar PDF
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/guias/${folha.id}/pagamento`)}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />Lançar Pagamento
                  </Button>
                </div>
                </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
