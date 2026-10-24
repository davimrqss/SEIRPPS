import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, FileSpreadsheet, FileText, Grid2X2, List, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCaixaAtiva, useLogoUrl } from "@/hooks/useCaixa";
import { useOrgaos } from "@/hooks/useCadastros";
import { useSelecao } from "@/hooks/useSelecao";
import { previewGuia, previewGuias } from "@/lib/guiaPdf";
import { fmtBRL } from "@/lib/format";
import { resumirPagamentos } from "@/lib/guiaCalculations";
import { safeErrorMessage } from "@/lib/safeError";
import { FolhaActions } from "@/components/FolhaActions";
import {
  BarraSelecao, BotaoExcluirSelecionados, CheckboxTodos, ConfirmarExclusaoEmMassa,
} from "@/components/SelecaoEmMassa";

const mesBR = (mes: string) => new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const statusLabel = (status: string) => status === "pago" ? "Pago" : status === "parcial" ? "Parcial" : "Pendente";
const statusClass = (status: string) => status === "pago" ? "bg-success/10 text-success" : status === "parcial" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";

export default function GuiasPDF() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCaixaId } = useAuth();
  const { canEditFolhas } = usePermissions();
  const { data: caixa } = useCaixaAtiva();
  const { data: logoUrl } = useLogoUrl(caixa?.logo_url);
  const { data: orgaos = [] } = useOrgaos();
  const [mes, setMes] = useState("todos");
  const [orgao, setOrgao] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [modo, setModo] = useState<"grade" | "lista">("grade");
  const [excluirVarias, setExcluirVarias] = useState(false);
  const [excluindoVarias, setExcluindoVarias] = useState(false);

  const { data: guias = [], isLoading } = useQuery({
    queryKey: ["folhas-guias", activeCaixaId],
    queryFn: async () => {
      if (!activeCaixaId) return [];
      const { data, error } = await supabase.from("folhas_pagamento").select("*").eq("caixa_id", activeCaixaId).order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(activeCaixaId),
  });
  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos-guias", activeCaixaId, guias.map((g) => g.id).join(",")],
    queryFn: async () => {
      if (!guias.length) return [];
      const { data, error } = await supabase.from("pagamentos").select("*").in("folha_id", guias.map((g) => g.id));
      if (error) throw error;
      return data ?? [];
    },
    enabled: guias.length > 0,
  });

  const meses = useMemo(() => [...new Set(guias.map((g) => g.mes_referencia))].sort().reverse(), [guias]);
  const linhas = useMemo(() => guias.map((guia) => ({ guia, resumo: resumirPagamentos(guia, pagamentos) })).filter(({ guia, resumo }) => {
    const statusGeral = resumo.paga ? "pago" : (resumo.statusServidor === "parcial" || resumo.statusPatronal === "parcial") ? "parcial" : "pendente";
    return (mes === "todos" || guia.mes_referencia === mes) &&
      (orgao === "todos" || guia.orgao_id === orgao) &&
      (situacao === "todos" || statusGeral === situacao);
  }), [guias, pagamentos, mes, orgao, situacao]);

  const selecao = useSelecao(linhas.map(({ guia }) => guia.id));
  const guiasSelecionadas = linhas.filter(({ guia }) => selecao.estaMarcado(guia.id)).map(({ guia }) => guia);

  const abrirSelecionadas = () => {
    previewGuias(guiasSelecionadas, caixa ?? undefined, logoUrl);
  };

  const excluirSelecionadas = async () => {
    const ids = guiasSelecionadas.map((g) => g.id);
    setExcluindoVarias(true);
    const { error: pagError } = await supabase.from("pagamentos").delete().in("folha_id", ids);
    const { error } = pagError ? { error: pagError } : await supabase.from("folhas_pagamento").delete().in("id", ids);
    setExcluindoVarias(false);
    queryClient.invalidateQueries({ queryKey: ["folhas"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-guias"] });
    queryClient.invalidateQueries({ queryKey: ["pagamentos-guias"] });
    if (error) {
      toast.error(safeErrorMessage("Não foi possível excluir as guias"));
      return;
    }
    toast.success(`${ids.length} guia(s) excluída(s).`);
    selecao.limpar();
    setExcluirVarias(false);
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;

  const marcar = (id: string, nome: string) => (
    <Checkbox aria-label={`Selecionar ${nome}`} checked={selecao.estaMarcado(id)} onCheckedChange={() => selecao.alternar(id)} className="mt-1" />
  );

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-foreground">Guias de Recolhimento</h1></div>
      {canEditFolhas && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate("/guias/importar")}><FileSpreadsheet className="mr-2 h-4 w-4" />Importar planilha</Button><Button onClick={() => navigate("/guias/cadastrar")}><Plus className="mr-2 h-4 w-4" />Cadastrar Guia</Button></div>}
    </div>
    <Card><CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">
      <Select value={mes} onValueChange={setMes}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((item) => <SelectItem key={item} value={item}>{mesBR(item)}</SelectItem>)}</SelectContent></Select>
      <Select value={orgao} onValueChange={setOrgao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os órgãos</SelectItem>{orgaos.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select>
      <Select value={situacao} onValueChange={setSituacao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as situações</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="parcial">Parcial</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select>
      <div className="flex rounded-md border border-border p-1"><Button type="button" variant={modo === "grade" ? "secondary" : "ghost"} size="sm" className="flex-1" onClick={() => setModo("grade")}><Grid2X2 className="mr-2 h-4 w-4" />Grade</Button><Button type="button" variant={modo === "lista" ? "secondary" : "ghost"} size="sm" className="flex-1" onClick={() => setModo("lista")}><List className="mr-2 h-4 w-4" />Lista</Button></div>
    </CardContent></Card>
    {linhas.length > 0 && <div className="space-y-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <CheckboxTodos todos={selecao.todos} parcial={selecao.parcial} onChange={selecao.alternarTodos} />
        Selecionar todas ({linhas.length})
      </label>
      <BarraSelecao quantidade={selecao.selecionados.length} onLimpar={selecao.limpar}>
        <Button type="button" variant="outline" size="sm" onClick={abrirSelecionadas}><FileText className="mr-1 h-4 w-4" />Abrir PDF das selecionadas</Button>
        {canEditFolhas && <BotaoExcluirSelecionados onClick={() => setExcluirVarias(true)} />}
      </BarraSelecao>
    </div>}
    {!linhas.length ? <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />Nenhuma guia encontrada</CardContent></Card> :
      <div className={modo === "grade" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>{linhas.map(({ guia, resumo }) => {
        const marcada = selecao.estaMarcado(guia.id);
        const actions = <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => previewGuia(guia, caixa ?? undefined, logoUrl)}><FileText className="mr-1 h-4 w-4" />PDF</Button>{canEditFolhas && !resumo.paga && <Button size="sm" onClick={() => navigate(`/guias/${guia.id}/pagamento`)}><CreditCard className="mr-1 h-4 w-4" />Lançar pagamento</Button>}{canEditFolhas && <FolhaActions folha={guia} />}</div>;
        const titulo = <div className="flex items-start gap-3">{marcar(guia.id, guia.centro_custo)}<div><p className="font-semibold">{guia.centro_custo}</p><p className="text-sm text-muted-foreground">{guia.orgao} · {mesBR(guia.mes_referencia)}</p></div></div>;
        if (modo === "lista") return <Card key={guia.id} className={marcada ? "border-primary" : undefined}><CardContent className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">{titulo}<ResumoParte nome="Servidor" devido={resumo.devidoServidor} pago={resumo.pagoServidor} saldo={resumo.saldoServidor} status={resumo.statusServidor} /><ResumoParte nome="Patronal" devido={resumo.devidoPatronal} pago={resumo.pagoPatronal} saldo={resumo.saldoPatronal} status={resumo.statusPatronal} /><div className="lg:max-w-[300px]">{actions}</div></CardContent></Card>;
        return <Card key={guia.id} className={marcada ? "border-primary" : undefined}><CardContent className="space-y-4 p-5">{titulo}<div className="grid gap-3 sm:grid-cols-2"><ResumoParte nome="Servidor" devido={resumo.devidoServidor} pago={resumo.pagoServidor} saldo={resumo.saldoServidor} status={resumo.statusServidor} /><ResumoParte nome="Patronal" devido={resumo.devidoPatronal} pago={resumo.pagoPatronal} saldo={resumo.saldoPatronal} status={resumo.statusPatronal} /></div>{resumo.pagamentoNaoClassificado > 0 && <p className="text-xs text-warning">Pagamento antigo sem classificação: {fmtBRL(resumo.pagamentoNaoClassificado)}</p>}{actions}</CardContent></Card>;
      })}</div>}
    <ConfirmarExclusaoEmMassa
      open={excluirVarias}
      onOpenChange={setExcluirVarias}
      titulo={`Excluir ${guiasSelecionadas.length} guia(s)?`}
      descricao="As guias selecionadas e os pagamentos lançados nelas serão removidos. Esta ação não pode ser desfeita."
      excluindo={excluindoVarias}
      onConfirm={excluirSelecionadas}
    />
  </div>;
}

function ResumoParte({
  nome,
  pago,
  saldo,
  status,
}: {
  nome: string;
  devido: number;
  pago: number;
  saldo: number;
  status: string;
}) {
  const quitado = status === "pago";
  const tituloValor = quitado ? "Pago" : "Devido";
  const valorExibido = quitado ? pago : saldo;

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <strong>{nome}</strong>

        <Badge className={statusClass(status)}>
          {statusLabel(status)}
        </Badge>
      </div>

      <p className="text-muted-foreground">
        {tituloValor}:{" "}
        <span className="font-semibold text-foreground">
          {fmtBRL(valorExibido)}
        </span>
      </p>
    </div>
  );
}
