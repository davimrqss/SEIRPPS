import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, FileSearch, FileUp, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/DateField";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useAuth } from "@/contexts/AuthContext";
import { useCentrosCusto } from "@/hooks/useCadastros";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { extractPayrollSummaries } from "@/lib/payrollPdf";
import { fmtBRL, parseCurrency } from "@/lib/format";
import { toast } from "sonner";

type AiRow = {
  codigo_centro_custo: string; centro_custo: string; competencia: string; grupo_folha: string;
  num_servidores: number; remuneracao: number; base_calculo: number;
  aliquota_servidor: number; aliquota_patronal: number; aliquota_suplementar: number;
  valor_servidor: number; valor_patronal: number; valor_suplementar: number;
  salario_maternidade: number; salario_familia: number; aux_doenca: number; observacoes: string;
};
type ReviewRow = AiRow & { id: string; selected: boolean; centroId: string; duplicate: boolean };
type Centro = { id: string; codigo: string; nome: string; orgaos?: { nome: string } | null };

const moneyText = (value: number) => value.toFixed(2).replace(".", ",");
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\W/g, "");
const ANALYSIS_BATCH_SIZE = 5;

export default function ImportarFolha() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeCaixaId } = useAuth();
  const { canEditFolhas } = usePermissions();
  const { data: centros = [] } = useCentrosCusto();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [emissao, setEmissao] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [saving, setSaving] = useState(false);

  const patchRow = (id: string, patch: Partial<ReviewRow>) =>
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const analyze = async () => {
    if (!file || !activeCaixaId || !canEditFolhas) return;
    setError(""); setRows([]); setStatus("Lendo as páginas do PDF..."); setProgress(2);
    try {
      const extraction = await extractPayrollSummaries(file, setProgress);
      setStatus(`Analisando ${extraction.summaryPages.length} resumos encontrados...`); setProgress(80);
      const batches = Array.from(
        { length: Math.ceil(extraction.summaryPages.length / ANALYSIS_BATCH_SIZE) },
        (_, index) => extraction.summaryPages.slice(index * ANALYSIS_BATCH_SIZE, (index + 1) * ANALYSIS_BATCH_SIZE),
      );
      const consolidated = new Map<string, AiRow>();
      for (let index = 0; index < batches.length; index += 1) {
        setStatus(`Analisando lote ${index + 1} de ${batches.length} com o Google Gemini...`);
        setProgress(80 + Math.round(((index + 1) / batches.length) * 18));
        const { data, error: functionError } = await supabase.functions.invoke("analyze-payroll-pdf", { body: { pages: batches[index] } });
        if (functionError) throw new Error((data as { error?: string } | null)?.error || "Não foi possível analisar este lote.");
        for (const row of (data as { rows?: AiRow[] })?.rows ?? []) {
          const key = row.codigo_centro_custo.trim() || normalize(row.centro_custo);
          if (key && !consolidated.has(key)) consolidated.set(key, row);
        }
      }
      const aiRows = [...consolidated.values()];
      if (aiRows.length === 0) throw new Error("A análise terminou sem encontrar centros de custo.");
      const competence = aiRows.find((row) => /^\d{4}-\d{2}$/.test(row.competencia))?.competencia ?? "";
      const codes = aiRows.map((row) => row.codigo_centro_custo).filter(Boolean);
      const { data: existing } = competence
        ? await supabase.from("folhas_pagamento").select("codigo_centro_custo").eq("caixa_id", activeCaixaId).eq("mes_referencia", competence).in("codigo_centro_custo", codes)
        : { data: [] };
      const existingCodes = new Set((existing ?? []).map((item) => item.codigo_centro_custo));
      const options = centros as Centro[];
      setRows(aiRows.map((row, index) => {
        const exact = options.find((center) => center.codigo.trim() === row.codigo_centro_custo.trim());
        const sameName = options.filter((center) => normalize(center.nome) === normalize(row.centro_custo));
        const match = exact ?? (sameName.length === 1 ? sameName[0] : undefined);
        const duplicate = existingCodes.has(row.codigo_centro_custo);
        return { ...row, id: `${row.codigo_centro_custo}-${index}`, centroId: match?.id ?? "", selected: !!match && !duplicate, duplicate };
      }));
       setProgress(100); setStatus(`${aiRows.length} centros encontrados em ${extraction.pageCount} páginas pelo Google Gemini.`);
    } catch (caught) {
      const safeMessages = [
        "A análise terminou sem encontrar centros de custo.",
        "Não foi possível analisar este lote.",
      ];
      setError(caught instanceof Error && safeMessages.includes(caught.message) ? caught.message : "Não foi possível analisar o PDF. Tente novamente.");
      setStatus(""); setProgress(0);
    }
  };

  const selected = rows.filter((row) => row.selected);
  const totals = useMemo(() => selected.reduce((sum, row) => ({
    remuneracao: sum.remuneracao + row.remuneracao, base: sum.base + row.base_calculo,
    servidor: sum.servidor + row.valor_servidor, patronal: sum.patronal + row.valor_patronal,
  }), { remuneracao: 0, base: 0, servidor: 0, patronal: 0 }), [selected]);

  const save = async () => {
    if (!activeCaixaId || selected.length === 0) return;
    if (emissao.slice(-2) !== "21") return void toast.error("A data de emissão deve ser no dia 21.");
    if (vencimento.slice(-2) !== "20") return void toast.error("A data de vencimento deve ser no dia 20.");
    if (selected.some((row) => !row.centroId)) return void toast.error("Vincule todos os centros selecionados.");
    const options = centros as Centro[];
    setSaving(true);
    const payload = selected.map((row) => {
      const center = options.find((item) => item.id === row.centroId);
      return {
        caixa_id: activeCaixaId, tipo: "folha", centro_custo: center?.nome ?? row.centro_custo,
        codigo_centro_custo: center?.codigo ?? row.codigo_centro_custo, orgao: center?.orgaos?.nome ?? "Não informado",
        mes_referencia: vencimento.slice(0, 7), data_emissao: emissao, vencimento, num_empregados: row.num_servidores,
        grupo_folha: row.grupo_folha.includes("13") ? "2 - 13° Salário" : "1 - Normal",
        remuneracao: row.remuneracao, base_calculo: row.base_calculo, valor_servidor: row.valor_servidor,
        valor_patronal: row.valor_patronal, valor_suplementar: row.valor_suplementar,
        salario_maternidade: row.salario_maternidade, salario_familia: row.salario_familia,
        aux_doenca: row.aux_doenca, juros_multa: 0, aliquota_servidor: row.aliquota_servidor,
        aliquota_patronal: row.aliquota_patronal, is_13: row.grupo_folha.includes("13"),
      };
    });
    const { error: insertError } = await supabase.from("folhas_pagamento").insert(payload);
    setSaving(false);
    if (insertError) return void toast.error("Erro ao importar: " + insertError.message);
    await queryClient.invalidateQueries({ queryKey: ["folhas"] });
    toast.success(`${payload.length} folhas importadas com sucesso.`); navigate("/folhas");
  };

  if (!canEditFolhas) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Seu perfil pode apenas visualizar folhas.</AlertDescription></Alert>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">Importar Folha</h1><p className="mt-1 text-muted-foreground">Revise os resumos por centro antes de salvar</p></div>
      <Button variant="outline" onClick={() => navigate("/folhas")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
    </div>
    {rows.length === 0 && <Card><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-primary/10 p-4"><FileSearch className="h-9 w-9 text-primary" /></div>
      <div><h2 className="text-lg font-semibold">Selecione a folha de pagamento</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">O PDF não será armazenado. A análise considera os totais consolidados de cada centro de custo.</p></div>
      <Input ref={inputRef} className="hidden" type="file" accept="application/pdf" onChange={(event) => {
        const next = event.target.files?.[0] ?? null;
        if (next && next.size > 20 * 1024 * 1024) return void setError("O PDF deve ter no máximo 20 MB.");
        if (next && next.type !== "application/pdf") return void setError("Selecione um arquivo PDF válido.");
        setFile(next); setError("");
      }} />
      <Button variant="outline" onClick={() => inputRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />{file ? "Trocar arquivo" : "Anexar PDF"}</Button>
      {file && <p className="text-sm font-medium">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
      {status && <div className="w-full max-w-md space-y-2"><Progress value={progress} className="h-2" /><p className="text-sm text-muted-foreground">{status}</p></div>}
      {error && <Alert variant="destructive" className="max-w-xl text-left"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível analisar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <Button disabled={!file || !!status} onClick={analyze}><Sparkles className="mr-2 h-4 w-4" />Analisar com IA</Button>
    </CardContent></Card>}
    {rows.length > 0 && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Centros selecionados", String(selected.length)], ["Remuneração", fmtBRL(totals.remuneracao)], ["Base de cálculo", fmtBRL(totals.base)], ["Contribuições", fmtBRL(totals.servidor + totals.patronal)]].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />Datas para todas as folhas</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data de emissão *</Label><DateField value={emissao} onChange={setEmissao} required /></div><div className="space-y-2"><Label>Data de vencimento *</Label><DateField value={vencimento} onChange={setVencimento} required /></div></CardContent></Card>
      <div className="space-y-4">{rows.map((row) => <Card key={row.id} className={!row.centroId || row.duplicate ? "border-warning" : undefined}><CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3"><Checkbox checked={row.selected} disabled={!row.centroId} onCheckedChange={(checked) => patchRow(row.id, { selected: checked === true })} aria-label={`Selecionar ${row.centro_custo}`} /><div className="min-w-0 flex-1"><p className="font-semibold">{row.codigo_centro_custo} · {row.centro_custo}</p><p className="text-xs text-muted-foreground">{row.competencia} · {row.grupo_folha} · {row.num_servidores} servidores</p></div></div>
        {(row.duplicate || !row.centroId || row.observacoes) && <Alert className="mb-4 border-warning"><AlertCircle className="h-4 w-4" /><AlertDescription>{row.duplicate ? "Já existe uma folha desta competência para este código. A linha foi desmarcada." : !row.centroId ? "Centro não encontrado. Escolha um centro cadastrado para continuar." : row.observacoes}</AlertDescription></Alert>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2"><Label>Centro cadastrado *</Label><Select value={row.centroId || undefined} onValueChange={(value) => patchRow(row.id, { centroId: value, selected: !row.duplicate })}><SelectTrigger><SelectValue placeholder="Vincular centro de custo" /></SelectTrigger><SelectContent>{(centros as Centro[]).map((center) => <SelectItem key={center.id} value={center.id}>{center.codigo} · {center.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Servidores</Label><Input type="number" min="0" value={row.num_servidores} onChange={(event) => patchRow(row.id, { num_servidores: Number(event.target.value) })} /></div>
          <div className="space-y-2"><Label>Grupo</Label><Select value={row.grupo_folha.includes("13") ? "13" : "normal"} onValueChange={(value) => patchRow(row.id, { grupo_folha: value === "13" ? "2 - 13° Salário" : "1 - Normal" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="13">13° Salário</SelectItem></SelectContent></Select></div>
          {([ ["Remuneração", "remuneracao"], ["Base de cálculo", "base_calculo"], ["Valor servidor", "valor_servidor"], ["Valor patronal", "valor_patronal"], ["Valor suplementar", "valor_suplementar"], ["Salário-maternidade", "salario_maternidade"], ["Salário-família", "salario_familia"], ["Auxílio-doença", "aux_doenca"] ] as const).map(([label, key]) => <div className="space-y-2" key={key}><Label>{label}</Label><CurrencyInput value={moneyText(row[key])} onValueChange={(value) => patchRow(row.id, { [key]: parseCurrency(value) })} /></div>)}
          {([ ["Alíquota servidor (%)", "aliquota_servidor"], ["Alíquota patronal (%)", "aliquota_patronal"], ["Alíquota suplementar (%)", "aliquota_suplementar"] ] as const).map(([label, key]) => <div className="space-y-2" key={key}><Label>{label}</Label><Input type="number" step="0.01" min="0" value={row[key]} onChange={(event) => patchRow(row.id, { [key]: Number(event.target.value) })} /></div>)}
        </div>
      </CardContent></Card>)}</div>
      <div className="sticky bottom-4 flex flex-col gap-3 rounded-md border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{selected.length} de {rows.length} centros serão importados</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setRows([]); setStatus(""); setProgress(0); }}>Escolher outro PDF</Button><Button disabled={saving || selected.length === 0 || !emissao || !vencimento} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? "Importando..." : `Importar ${selected.length} folhas`}</Button></div></div>
    </>}
  </div>;
}