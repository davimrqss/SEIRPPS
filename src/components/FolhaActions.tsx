import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DateField } from "@/components/DateField";
import { currencyToInput, parseCurrency } from "@/lib/format";
import { useOrgaos } from "@/hooks/useCadastros";
import { useCaixaAtiva } from "@/hooks/useCaixa";
import { calcularValoresGuia, camposAcrescimosGuia } from "@/lib/guiaCalculations";
import { CorrecaoMonetaria } from "@/components/CorrecaoMonetaria";
import type { Tables } from "@/integrations/supabase/types";
import { safeErrorMessage } from "@/lib/safeError";
import { guiaDatesSchema } from "@/lib/guiaDates";

type Folha = Tables<"folhas_pagamento">;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatMes = (mes: string) =>
  new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export function FolhaActions({ folha }: { folha: Folha }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const initial = () => ({
    centro_custo: folha.centro_custo,
    codigo_centro_custo: folha.codigo_centro_custo ?? "",
    orgao: folha.orgao,
    grupo_folha: folha.grupo_folha ?? "1 - Normal",
    data_emissao: folha.data_emissao ?? "",
    vencimento: folha.vencimento,
    remuneracao: currencyToInput(folha.remuneracao),
    base_calculo: currencyToInput(folha.base_calculo),
    valor_servidor: currencyToInput(folha.valor_servidor),
    valor_patronal: currencyToInput(folha.valor_patronal),
    valor_suplementar: currencyToInput(folha.valor_suplementar),
    aliquota_servidor: String(folha.aliquota_servidor),
    aliquota_patronal: String(folha.aliquota_patronal),
    jurosMulta: String(folha.aliquota_juros_servidor ?? 0),
    salario_maternidade: currencyToInput(folha.salario_maternidade),
    salario_familia: currencyToInput(folha.salario_familia),
    aux_doenca: currencyToInput(folha.aux_doenca),
    is_13: folha.is_13,
    orgao_id: folha.orgao_id ?? "",
  });

  const [form, setForm] = useState(initial);
  const [servidorManual, setServidorManual] = useState(false);
  const [patronalManual, setPatronalManual] = useState(false);
  const { data: orgaos = [] } = useOrgaos();
  const { data: caixa } = useCaixaAtiva();
  const correcaoInicial = folha.aplica_correcao ?? (Number(folha.aliquota_correcao_servidor) > 0 || Number(folha.aliquota_correcao_patronal) > 0);
  const [aplicaCorrecao, setAplicaCorrecao] = useState(correcaoInicial);
  const [jurosAlterados, setJurosAlterados] = useState(false);
  const [correcaoAlterada, setCorrecaoAlterada] = useState(false);
  const acrescimos = {
    ...camposAcrescimosGuia(Number(form.jurosMulta) || 0, aplicaCorrecao, caixa),
    ...(!jurosAlterados ? {
      aliquota_juros_servidor: folha.aliquota_juros_servidor,
      aliquota_juros_patronal: folha.aliquota_juros_patronal,
    } : {}),
    ...(!correcaoAlterada ? {
      aliquota_correcao_servidor: folha.aliquota_correcao_servidor,
      aliquota_correcao_patronal: folha.aliquota_correcao_patronal,
      aplica_correcao: folha.aplica_correcao,
      indice_correcao: folha.indice_correcao,
    } : {}),
  };

  const openEdit = () => {
    setForm(initial());
    setAplicaCorrecao(correcaoInicial);
    setJurosAlterados(false);
    setCorrecaoAlterada(false);
    const initialBase = Number(folha.base_calculo);
    const calculatedServidor = initialBase * (Number(folha.aliquota_servidor) / 100);
    const calculatedPatronal = initialBase * (Number(folha.aliquota_patronal) / 100);
    setServidorManual(Math.abs(Number(folha.valor_servidor) - calculatedServidor) > 0.009);
    setPatronalManual(Math.abs(Number(folha.valor_patronal) - calculatedPatronal) > 0.009);
    setEditOpen(true);
  };

  const selecionarOrgao = (id: string) => {
    const orgao = orgaos.find((item) => item.id === id);
    if (!orgao) return;
    setForm((prev) => ({ ...prev, orgao_id: id, orgao: orgao.nome }));
  };

  const change = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["folhas"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["folhas-guias"] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guiaDatesSchema.safeParse({ dataEmissao: form.data_emissao, vencimento: form.vencimento }).success) {
      toast({ title: "Confira as datas", description: "Informe datas válidas de emissão e vencimento.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const base = parseCurrency(form.base_calculo);
    const aliqServ = parseFloat(form.aliquota_servidor) || 0;
    const aliqPat = parseFloat(form.aliquota_patronal) || 0;

    const { error } = await supabase
      .from("folhas_pagamento")
      .update({
        centro_custo: form.centro_custo,
        codigo_centro_custo: form.codigo_centro_custo || null,
        orgao: form.orgao,
        orgao_id: form.orgao_id || null,
        grupo_folha: form.grupo_folha,
        mes_referencia: form.vencimento.slice(0, 7),
        data_emissao: form.data_emissao,
        vencimento: form.vencimento,
        remuneracao: parseCurrency(form.remuneracao),
        base_calculo: base,
        valor_servidor: servidorManual ? parseCurrency(form.valor_servidor) : base * (aliqServ / 100),
        valor_patronal: patronalManual ? parseCurrency(form.valor_patronal) : base * (aliqPat / 100),
        valor_suplementar: parseCurrency(form.valor_suplementar),
        aliquota_servidor: aliqServ,
        aliquota_patronal: aliqPat,
        ...acrescimos,
        salario_maternidade: parseCurrency(form.salario_maternidade),
        salario_familia: parseCurrency(form.salario_familia),
        aux_doenca: parseCurrency(form.aux_doenca),
        is_13: form.grupo_folha.includes("13"),
        tipo: "folha",
      })
      .eq("id", folha.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar", description: safeErrorMessage("Não foi possível atualizar a guia"), variant: "destructive" });
      return;
    }
    invalidate();
    setEditOpen(false);
    toast({ title: "Guia atualizada com sucesso!" });
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error: pagError } = await supabase.from("pagamentos").delete().eq("folha_id", folha.id);
    if (pagError) {
      setLoading(false);
      toast({ title: "Erro ao excluir", description: safeErrorMessage("Não foi possível excluir a guia"), variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("folhas_pagamento").delete().eq("id", folha.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: safeErrorMessage("Não foi possível excluir a guia"), variant: "destructive" });
      return;
    }
    invalidate();
    setDeleteOpen(false);
    toast({ title: "Guia excluída", description: `${folha.centro_custo} - ${folha.mes_referencia}` });
  };

  const base = parseCurrency(form.base_calculo);
  const previewServ = base * ((parseFloat(form.aliquota_servidor) || 0) / 100);
  const previewPat = base * ((parseFloat(form.aliquota_patronal) || 0) / 100);
  const valorServidorFinal = servidorManual ? parseCurrency(form.valor_servidor) : previewServ;
  const valorPatronalFinal = patronalManual ? parseCurrency(form.valor_patronal) : previewPat;
  const preview = calcularValoresGuia({
    ...folha,
    valor_servidor: valorServidorFinal,
    valor_patronal: valorPatronalFinal,
    valor_suplementar: parseCurrency(form.valor_suplementar),
    salario_maternidade: parseCurrency(form.salario_maternidade),
    salario_familia: parseCurrency(form.salario_familia),
    aux_doenca: parseCurrency(form.aux_doenca),
    ...acrescimos,
  });

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Visualizar guia" onClick={() => setViewOpen(true)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Editar guia" onClick={openEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir guia"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Visualizar */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia</DialogTitle>
            <DialogDescription>{folha.centro_custo} — {formatMes(folha.mes_referencia)}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Descrição" value={folha.centro_custo} />
            <Info label="Órgão" value={folha.orgao} />
            <Info label="Mês de Referência" value={formatMes(folha.mes_referencia)} />
            <Info label="Data de Emissão" value={folha.data_emissao ? new Date(folha.data_emissao + "T00:00:00").toLocaleDateString("pt-BR") : "Não informada"} />
            <Info label="Vencimento" value={new Date(folha.vencimento + "T00:00:00").toLocaleDateString("pt-BR")} />
            <Info label="13° Salário" value={folha.is_13 ? "Sim" : "Não"} />
            <Info label="Remuneração" value={fmt(Number(folha.remuneracao))} />
            <Info label="Base de Cálculo" value={fmt(Number(folha.base_calculo))} />
            <Info label={`Servidor (${folha.aliquota_servidor}%)`} value={fmt(Number(folha.valor_servidor))} />
            <Info label={`Patronal (${folha.aliquota_patronal}%)`} value={fmt(Number(folha.valor_patronal))} />
            <Info label="Juros e Multa (%)" value={folha.aliquota_juros_servidor === folha.aliquota_juros_patronal ? `${folha.aliquota_juros_servidor}%` : `Servidor: ${folha.aliquota_juros_servidor}% / Patronal: ${folha.aliquota_juros_patronal}%`} />
            <Info label="Correção Monetária" value={correcaoInicial ? `${folha.indice_correcao ?? caixa?.indice_correcao ?? ""} — ${folha.aliquota_correcao_servidor}%` : "Não"} />
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge
                className={
                  folha.paga
                    ? "bg-success/10 text-success hover:bg-success/20"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }
              >
                {folha.paga ? "Paga" : "Pendente"}
              </Badge>
            </div>
            <Info label="Total devido" value={fmt(calcularValoresGuia(folha).devidoServidor + calcularValoresGuia(folha).devidoPatronal)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
            <Button onClick={() => { setViewOpen(false); openEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" />Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Guia</DialogTitle>
            <DialogDescription>Atualize os dados da guia de recolhimento</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-centro">Descrição</Label>
              <Input id="e-centro" maxLength={200} value={form.centro_custo} onChange={(e) => change("centro_custo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-orgao">Órgão pagador</Label>
              <Select value={form.orgao_id || undefined} onValueChange={selecionarOrgao}>
                <SelectTrigger id="e-orgao"><SelectValue placeholder={form.orgao || "Selecione o órgão"} /></SelectTrigger>
                <SelectContent>{orgaos.map((orgao) => <SelectItem key={orgao.id} value={orgao.id}>{orgao.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-emissao">Data de Emissão</Label>
                <DateField id="e-emissao" value={form.data_emissao} onChange={(iso) => change("data_emissao", iso)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-venc">Vencimento</Label>
                <DateField id="e-venc" value={form.vencimento} onChange={(iso) => change("vencimento", iso)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-remun">Remuneração (R$)</Label>
                <CurrencyInput id="e-remun" value={form.remuneracao} onValueChange={(v) => change("remuneracao", v)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-base">Base de Cálculo (R$)</Label>
                <CurrencyInput id="e-base" value={form.base_calculo} onValueChange={(v) => change("base_calculo", v)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="e-grupo">Grupo Folha</Label>
                <Select value={form.grupo_folha} onValueChange={(v) => change("grupo_folha", v)}>
                  <SelectTrigger id="e-grupo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 - Normal">1 - Normal</SelectItem>
                    <SelectItem value="2 - 13° Salário">2 - 13° Salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-matern">Salário Maternidade (R$)</Label>
                <CurrencyInput id="e-matern" value={form.salario_maternidade} onValueChange={(v) => change("salario_maternidade", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-familia">Salário Família (R$)</Label>
                <CurrencyInput id="e-familia" value={form.salario_familia} onValueChange={(v) => change("salario_familia", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-doenca">Auxílio Doença (R$)</Label>
                <CurrencyInput id="e-doenca" value={form.aux_doenca} onValueChange={(v) => change("aux_doenca", v)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-aliqs">Alíquota Servidor (%)</Label>
                <Input id="e-aliqs" type="number" step="0.01" value={form.aliquota_servidor} onChange={(e) => change("aliquota_servidor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-aliqp">Alíquota Patronal (%)</Label>
                <Input id="e-aliqp" type="number" step="0.01" value={form.aliquota_patronal} onChange={(e) => change("aliquota_patronal", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="e-supl">Contribuição Suplementar (R$)</Label><CurrencyInput id="e-supl" value={form.valor_suplementar} onValueChange={(v) => change("valor_suplementar", v)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="e-juros">Juros e Multa (%)</Label><Input id="e-juros" type="number" min="0" step="0.01" value={form.jurosMulta} onChange={(e) => { setJurosAlterados(true); change("jurosMulta", e.target.value); }} /></div>
              <CorrecaoMonetaria id="e-correcao" checked={aplicaCorrecao} disabled={!caixa} onChange={(value) => { setCorrecaoAlterada(true); setAplicaCorrecao(value); }} indice={correcaoAlterada ? caixa?.indice_correcao : folha.indice_correcao ?? caixa?.indice_correcao} aliquota={correcaoAlterada ? caixa?.aliquota_correcao : folha.aliquota_correcao_servidor} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-valor-servidor">Contribuição Servidor (R$)</Label>
                <CurrencyInput
                  id="e-valor-servidor"
                  value={servidorManual ? form.valor_servidor : currencyToInput(previewServ)}
                  onValueChange={(value) => {
                    setServidorManual(true);
                    change("valor_servidor", value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {servidorManual ? "Valor informado manualmente" : "Calculado automaticamente"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-valor-patronal">Contribuição Patronal (R$)</Label>
                <CurrencyInput
                  id="e-valor-patronal"
                  value={patronalManual ? form.valor_patronal : currencyToInput(previewPat)}
                  onValueChange={(value) => {
                    setPatronalManual(true);
                    change("valor_patronal", value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {patronalManual ? "Valor informado manualmente" : "Calculado automaticamente"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Servidor</p>
                <p className="text-lg font-bold text-foreground">{fmt(preview.devidoServidor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Patronal</p>
                <p className="text-lg font-bold text-foreground">{fmt(preview.devidoPatronal)}</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta guia?</AlertDialogTitle>
            <AlertDialogDescription>
              A guia de <strong>{folha.centro_custo}</strong> ({formatMes(folha.mes_referencia)}) e os
              pagamentos vinculados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
