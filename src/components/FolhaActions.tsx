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
import { Switch } from "@/components/ui/switch";
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
import type { Tables } from "@/integrations/supabase/types";

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
    num_empregados: String(folha.num_empregados ?? 0),
    grupo_folha: folha.grupo_folha ?? "1 - Normal",
    vencimento: folha.vencimento,
    remuneracao: currencyToInput(folha.remuneracao),
    base_calculo: currencyToInput(folha.base_calculo),
    aliquota_servidor: String(folha.aliquota_servidor),
    aliquota_patronal: String(folha.aliquota_patronal),
    salario_maternidade: currencyToInput(folha.salario_maternidade),
    salario_familia: currencyToInput(folha.salario_familia),
    aux_doenca: currencyToInput(folha.aux_doenca),
    juros_multa: currencyToInput(folha.juros_multa),
    is_13: folha.is_13,
    tipo: folha.tipo,
    paga: folha.paga,
  });

  const [form, setForm] = useState(initial);

  const openEdit = () => {
    setForm(initial());
    setEditOpen(true);
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
    if (!form.vencimento) {
      toast({ title: "Data inválida", description: "Informe o vencimento no formato dd-mm-aaaa.", variant: "destructive" });
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
        num_empregados: parseInt(form.num_empregados) || 0,
        grupo_folha: form.grupo_folha,
        mes_referencia: form.vencimento.slice(0, 7),
        vencimento: form.vencimento,
        remuneracao: parseCurrency(form.remuneracao),
        base_calculo: base,
        valor_servidor: base * (aliqServ / 100),
        valor_patronal: base * (aliqPat / 100),
        aliquota_servidor: aliqServ,
        aliquota_patronal: aliqPat,
        salario_maternidade: parseCurrency(form.salario_maternidade),
        salario_familia: parseCurrency(form.salario_familia),
        aux_doenca: parseCurrency(form.aux_doenca),
        juros_multa: parseCurrency(form.juros_multa),
        is_13: form.grupo_folha.includes("13"),
        tipo: form.tipo,
        paga: form.paga,
      })
      .eq("id", folha.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
    setEditOpen(false);
    toast({ title: "Folha atualizada com sucesso!" });
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error: pagError } = await supabase.from("pagamentos").delete().eq("folha_id", folha.id);
    if (pagError) {
      setLoading(false);
      toast({ title: "Erro ao excluir", description: pagError.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("folhas_pagamento").delete().eq("id", folha.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
    setDeleteOpen(false);
    toast({ title: "Folha excluída", description: `${folha.centro_custo} - ${folha.mes_referencia}` });
  };

  const base = parseCurrency(form.base_calculo);
  const previewServ = base * ((parseFloat(form.aliquota_servidor) || 0) / 100);
  const previewPat = base * ((parseFloat(form.aliquota_patronal) || 0) / 100);

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Visualizar folha" onClick={() => setViewOpen(true)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Editar folha" onClick={openEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir folha"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Visualizar */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Folha</DialogTitle>
            <DialogDescription>{folha.centro_custo} — {formatMes(folha.mes_referencia)}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Centro de Custo" value={folha.centro_custo} />
            <Info label="Órgão" value={folha.orgao} />
            <Info label="Mês de Referência" value={formatMes(folha.mes_referencia)} />
            <Info label="Vencimento" value={new Date(folha.vencimento + "T00:00:00").toLocaleDateString("pt-BR")} />
            <Info label="Tipo" value={folha.tipo} />
            <Info label="13° Salário" value={folha.is_13 ? "Sim" : "Não"} />
            <Info label="Remuneração" value={fmt(Number(folha.remuneracao))} />
            <Info label="Base de Cálculo" value={fmt(Number(folha.base_calculo))} />
            <Info label={`Servidor (${folha.aliquota_servidor}%)`} value={fmt(Number(folha.valor_servidor))} />
            <Info label={`Patronal (${folha.aliquota_patronal}%)`} value={fmt(Number(folha.valor_patronal))} />
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
            <Info
              label="Total de Contribuições"
              value={fmt(Number(folha.valor_servidor) + Number(folha.valor_patronal))}
            />
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
            <DialogTitle>Editar Folha</DialogTitle>
            <DialogDescription>Atualize os dados da folha de pagamento</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-centro">Centro de Custo</Label>
                <Input id="e-centro" value={form.centro_custo} onChange={(e) => change("centro_custo", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-orgao">Órgão</Label>
                <Input id="e-orgao" value={form.orgao} onChange={(e) => change("orgao", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-venc">Vencimento</Label>
                <DateField id="e-venc" value={form.vencimento} onChange={(iso) => change("vencimento", iso)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-tipo">Tipo de Folha</Label>
                <Select value={form.tipo} onValueChange={(v) => change("tipo", v)}>
                  <SelectTrigger id="e-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servidor">Servidor</SelectItem>
                    <SelectItem value="patronal">Patronal</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="e-cod">Código do Centro de Custo</Label>
                <Input id="e-cod" value={form.codigo_centro_custo} onChange={(e) => change("codigo_centro_custo", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-emp">Nº de Servidores</Label>
                <Input id="e-emp" type="number" min="0" value={form.num_empregados} onChange={(e) => change("num_empregados", e.target.value)} />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="e-juros">Juros / Multa (R$)</Label>
                <CurrencyInput id="e-juros" value={form.juros_multa} onValueChange={(v) => change("juros_multa", v)} />
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
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Servidor</p>
                <p className="text-lg font-bold text-foreground">{fmt(previewServ)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contribuição Patronal</p>
                <p className="text-lg font-bold text-foreground">{fmt(previewPat)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="e-paga" checked={form.paga} onCheckedChange={(v) => change("paga", v)} />
              <Label htmlFor="e-paga">Folha paga</Label>
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
            <AlertDialogTitle>Excluir esta folha?</AlertDialogTitle>
            <AlertDialogDescription>
              A folha de <strong>{folha.centro_custo}</strong> ({formatMes(folha.mes_referencia)}) e os
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
