import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, FileSpreadsheet, FileUp, Loader2, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/DateField";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva } from "@/hooks/useCaixa";
import { useCentrosCusto, useOrgaos } from "@/hooks/useCadastros";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { fmtBRL, parseCurrency } from "@/lib/format";
import { guiaDatesSchema } from "@/lib/guiaDates";
import { calcularContribuicao, calcularValoresGuia, camposAcrescimosGuia, type Guia } from "@/lib/guiaCalculations";
import { extrairGuias, isAbaMensal, lerPlanilha, type AbaPlanilha, type GuiaPlanilha, type MapaColunas } from "@/lib/planilhaGuias";
import { safeErrorMessage } from "@/lib/safeError";

type AiRow = GuiaPlanilha;
type ReviewRow = AiRow & { id: string; selected: boolean; orgaoId: string };
type MoneyKey = "remuneracao" | "base_calculo" | "valor_servidor" | "valor_patronal" | "salario_familia" | "salario_maternidade" | "aux_doenca";

const moneyText = (value: number) => (value ? value.toFixed(2).replace(".", ",") : "");
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\W/g, "");
const LINHAS_AMOSTRA = 30;
const isDate = (value: string) => z.string().date().safeParse(value).success;
const MONEY_FIELDS: [string, MoneyKey][] = [
  ["Remuneração", "remuneracao"], ["Base de cálculo", "base_calculo"], ["Contribuição servidor", "valor_servidor"],
  ["Contribuição patronal", "valor_patronal"], ["Salário-família", "salario_familia"],
  ["Salário-maternidade", "salario_maternidade"], ["Auxílio-doença", "aux_doenca"],
];

export default function ImportarGuias() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeCaixaId } = useAuth();
  const { canEditFolhas } = usePermissions();
  const { data: caixa } = useCaixaAtiva();
  const { data: orgaos = [] } = useOrgaos();
  const { data: centros = [] } = useCentrosCusto();
  const [file, setFile] = useState<File | null>(null);
  const [abas, setAbas] = useState<AbaPlanilha[]>([]);
  const [abaNome, setAbaNome] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [emissao, setEmissao] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [grupo, setGrupo] = useState("1 - Normal");
  const [importarPagamentos, setImportarPagamentos] = useState(true);
  const [saving, setSaving] = useState(false);

  const mes = isDate(vencimento) ? vencimento.slice(0, 7) : "";
  const { data: existentes = [] } = useQuery({
    queryKey: ["guias-existentes-importacao", activeCaixaId, mes],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from("folhas_pagamento")
        .select("centro_custo, codigo_centro_custo").eq("caixa_id", activeCaixaId!).eq("mes_referencia", mes);
      if (queryError) throw queryError;
      return data ?? [];
    },
    enabled: Boolean(activeCaixaId && mes && rows.length),
  });
  const isDuplicate = (row: ReviewRow) => existentes.some((item) =>
    (row.codigo && item.codigo_centro_custo === row.codigo) || normalize(item.centro_custo) === normalize(row.descricao));

  useEffect(() => {
    if (!existentes.length) return;
    setRows((current) => current.map((row) => isDuplicate(row) ? { ...row, selected: false } : row));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existentes]);

  const patchRow = (id: string, patch: Partial<ReviewRow>) =>
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));

  const chooseFile = async (next: File | null) => {
    setError(""); setRows([]); setAbas([]); setAbaNome(""); setFile(null);
    if (!next) return;
    if (next.size > 10 * 1024 * 1024) return void setError("A planilha deve ter no máximo 10 MB.");
    if (!/\.(xlsx|xls)$/i.test(next.name)) return void setError("Selecione uma planilha Excel (.xlsx ou .xls).");
    try {
      const lidas = (await lerPlanilha(next)).filter((aba) => aba.texto);
      if (!lidas.length) return void setError("A planilha não possui abas com dados.");
      setFile(next); setAbas(lidas);
      const inicial = lidas.find((aba) => isAbaMensal(aba.nome)) ?? lidas[0];
      setAbaNome(inicial.nome);
      setGrupo(/13/.test(inicial.nome) ? "2 - 13° Salário" : "1 - Normal");
    } catch (caught) {
      console.error(caught);
      setError("Não foi possível ler esta planilha. Confira se o arquivo não está corrompido ou protegido por senha.");
    }
  };

  const analyze = async () => {
    const aba = abas.find((item) => item.nome === abaNome);
    if (!aba || !canEditFolhas) return;
        setError(""); setRows([]); setAnalyzing(true);
    try {
      const amostra = aba.texto.split("\n").slice(0, LINHAS_AMOSTRA).join("\n");
      const { data, error: fnError } = await supabase.functions.invoke("analyze-guias-planilha", { body: { sheetName: aba.nome, text: amostra } });
      if (fnError) {
        let message = "Não foi possível analisar a planilha. Tente novamente.";
        try {
          const body = await (fnError as { context?: Response }).context?.json();
          if (typeof body?.error === "string") message = body.error;
        } catch { /* mantém a mensagem padrão */ }
        throw new Error(message);
      }
      const aiRows = extrairGuias(aba, data as MapaColunas);
      if (!aiRows.length) throw new Error("Nenhuma descrição com valores foi encontrada nesta aba.");
      setRows(aiRows.map((row, index) => {
        const centro = centros.find((item) => row.codigo && item.codigo?.trim() === row.codigo.trim())
          ?? centros.find((item) => normalize(item.nome) === normalize(row.descricao));
        const orgaoId = centro?.orgao_id ?? "";
        return { ...row, id: `${row.linha}-${index}`, orgaoId, selected: true };
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível analisar a planilha. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyOrgaoToAll = (orgaoId: string) => setRows((current) => current.map((row) => ({ ...row, orgaoId })));

  const selected = rows.filter((row) => row.selected);
  const totals = useMemo(() => selected.reduce((sum, row) => ({
    base: sum.base + row.base_calculo, servidor: sum.servidor + row.valor_servidor, patronal: sum.patronal + row.valor_patronal,
    pago: sum.pago + (importarPagamentos ? row.pago_servidor + row.pago_patronal : 0),
  }), { base: 0, servidor: 0, patronal: 0, pago: 0 }), [selected, importarPagamentos]);

  const save = async () => {
    if (!activeCaixaId || !selected.length) return;
    if (!guiaDatesSchema.safeParse({ dataEmissao: emissao, vencimento }).success) return void toast.error("Informe datas válidas de emissão e vencimento.");
    if (selected.some((row) => !row.orgaoId)) return void toast.error("Escolha o órgão pagador de todas as linhas selecionadas.");
    if (selected.some((row) => !row.descricao.trim() || row.descricao.trim().length > 200)) return void toast.error("Todas as linhas precisam de uma descrição (até 200 caracteres).");
    if (importarPagamentos && selected.some((row) => (row.pago_servidor > 0 && !isDate(row.data_pagamento_servidor)) || (row.pago_patronal > 0 && !isDate(row.data_pagamento_patronal)))) {
      return void toast.error("Informe a data de cada pagamento repassado.");
    }
    setSaving(true);
    const acrescimos = camposAcrescimosGuia(0, false, caixa);
    const guias = selected.map((row) => {
      const orgao = orgaos.find((item) => item.id === row.orgaoId);
      const servidor = calcularContribuicao(row.base_calculo, 0, row.valor_servidor);
      const patronal = calcularContribuicao(row.base_calculo, 0, row.valor_patronal);
      const guia = {
        id: crypto.randomUUID(), caixa_id: activeCaixaId, tipo: "folha", centro_custo: row.descricao.trim(),
        codigo_centro_custo: row.codigo.trim() || null, orgao: orgao?.nome ?? "", orgao_id: row.orgaoId,
        mes_referencia: vencimento.slice(0, 7), data_emissao: emissao, vencimento, num_empregados: 0,
        grupo_folha: grupo, is_13: grupo.includes("13"), remuneracao: row.remuneracao, base_calculo: row.base_calculo,
        valor_servidor: servidor.contribuicao, valor_patronal: patronal.contribuicao, valor_suplementar: 0,
        aliquota_servidor: servidor.aliquota, aliquota_patronal: patronal.aliquota,
        salario_maternidade: row.salario_maternidade, salario_familia: row.salario_familia, aux_doenca: row.aux_doenca,
        juros_multa: 0, ...acrescimos, paga: false,
      };
      const devido = calcularValoresGuia(guia as unknown as Guia);
      const pagoServidor = importarPagamentos ? row.pago_servidor : 0;
      const pagoPatronal = importarPagamentos ? row.pago_patronal : 0;
      guia.paga = pagoServidor + 0.009 >= devido.devidoServidor && pagoPatronal + 0.009 >= devido.devidoPatronal;
      return { guia, row, pagoServidor, pagoPatronal };
    });
    const { error: insertError } = await supabase.from("folhas_pagamento").insert(guias.map((item) => item.guia));
    if (insertError) {
      console.error(insertError); setSaving(false);
      return void toast.error(safeErrorMessage("Não foi possível importar as guias"));
    }
    const pagamentos = guias.flatMap(({ guia, row, pagoServidor, pagoPatronal }) => [
      pagoServidor > 0 ? { folha_id: guia.id, natureza: "servidor", valor_pago: pagoServidor, valor_recebido: pagoServidor, data_pagamento: `${row.data_pagamento_servidor}T12:00:00`, observacoes: "Importado da planilha" } : null,
      pagoPatronal > 0 ? { folha_id: guia.id, natureza: "patronal", valor_pago: pagoPatronal, valor_recebido: pagoPatronal, data_pagamento: `${row.data_pagamento_patronal}T12:00:00`, observacoes: "Importado da planilha" } : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null));
    if (pagamentos.length) {
      const { error: paymentError } = await supabase.from("pagamentos").insert(pagamentos);
      if (paymentError) {
        console.error(paymentError);
        toast.error("As guias foram importadas, mas os pagamentos não. Lance os pagamentos pela lista de guias.");
      }
    }
    setSaving(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["folhas-guias"] }),
      queryClient.invalidateQueries({ queryKey: ["folhas-dashboard"] }),
    ]);
    toast.success(`${guias.length} guias importadas com sucesso.`);
    navigate("/guias");
  };

  if (!canEditFolhas) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Seu perfil pode apenas visualizar guias.</AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importar Guias</h1>
          <p className="mt-1 text-muted-foreground">Envie a planilha Excel e revise os valores antes de salvar</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/guias")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="rounded-full bg-primary/10 p-4"><FileSpreadsheet className="h-9 w-9 text-primary" /></div>
            <div>
              <h2 className="text-lg font-semibold">Selecione a planilha</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">A planilha não é armazenada. O Google Gemini identifica as colunas da aba escolhida e os valores são copiados exatamente da planilha, uma guia por descrição.</p>
            </div>
            <Input ref={inputRef} className="hidden" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(event) => { void chooseFile(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={analyzing}>
              <FileUp className="mr-2 h-4 w-4" />{file ? "Trocar planilha" : "Anexar planilha"}
            </Button>
            {file && <p className="text-sm font-medium">{file.name}</p>}
            {abas.length > 0 && (
              <div className="w-full max-w-sm space-y-2 text-left">
                <Label>Aba (mês) a importar</Label>
                <Select value={abaNome} onValueChange={(value) => { setAbaNome(value); setGrupo(/13/.test(value) ? "2 - 13° Salário" : "1 - Normal"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{abas.map((aba) => <SelectItem key={aba.nome} value={aba.nome}>{aba.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {analyzing && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />O Google Gemini está identificando as colunas da aba {abaNome}. Isso pode levar até 2 minutos.</p>}
            {error && <Alert variant="destructive" className="max-w-xl text-left"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível analisar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button disabled={!abaNome || analyzing} onClick={analyze}><Sparkles className="mr-2 h-4 w-4" />Analisar com IA</Button>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Guias selecionadas", String(selected.length)], ["Base de cálculo", fmtBRL(totals.base)], ["Servidor + patronal", fmtBRL(totals.servidor + totals.patronal)], ["Já repassado", fmtBRL(totals.pago)]].map(([label, value]) => (
              <Card key={label}><CardContent className="p-4"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />Dados para todas as guias · aba {abaNome}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Data de emissão *</Label><DateField value={emissao} onChange={setEmissao} required /></div>
              <div className="space-y-2"><Label>Data de vencimento *</Label><DateField value={vencimento} onChange={setVencimento} required /></div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={grupo} onValueChange={setGrupo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1 - Normal">Normal</SelectItem><SelectItem value="2 - 13° Salário">13° Salário</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Órgão pagador para todas</Label>
                <Select onValueChange={applyOrgaoToAll}><SelectTrigger><SelectValue placeholder="Aplicar a todas as linhas" /></SelectTrigger><SelectContent>{orgaos.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
                <Checkbox checked={importarPagamentos} onCheckedChange={(checked) => setImportarPagamentos(checked === true)} />
                Importar os valores já repassados como pagamentos
              </label>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {rows.map((row) => {
              const duplicate = isDuplicate(row);
              const alerta = duplicate ? "Já existe uma guia com esta descrição no mês do vencimento. A linha foi desmarcada."
                : !row.orgaoId ? "Escolha o órgão pagador desta guia."
                : "";
              return (
                <Card key={row.id} className={alerta ? "border-warning" : undefined}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <Checkbox checked={row.selected} onCheckedChange={(checked) => patchRow(row.id, { selected: checked === true })} aria-label={`Selecionar ${row.descricao}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{row.codigo ? `${row.codigo} · ` : ""}{row.descricao}</p>
                        <p className="text-xs text-muted-foreground">Linha {row.linha} da planilha</p>
                      </div>
                    </div>
                    {alerta && <Alert className="mb-4 border-warning"><AlertCircle className="h-4 w-4" /><AlertDescription>{alerta}</AlertDescription></Alert>}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2 sm:col-span-2"><Label>Descrição *</Label><Input value={row.descricao} maxLength={200} onChange={(event) => patchRow(row.id, { descricao: event.target.value })} /></div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Órgão pagador *</Label>
                        <Select value={row.orgaoId || undefined} onValueChange={(value) => patchRow(row.id, { orgaoId: value })}><SelectTrigger><SelectValue placeholder="Escolher órgão" /></SelectTrigger><SelectContent>{orgaos.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select>
                      </div>
                      {MONEY_FIELDS.map(([label, key]) => (
                        <div className="space-y-2" key={key}><Label>{label}</Label><CurrencyInput value={moneyText(row[key])} onValueChange={(value) => patchRow(row.id, { [key]: parseCurrency(value) })} /></div>
                      ))}
                      {importarPagamentos && (
                        <>
                          <div className="space-y-2"><Label>Repassado servidor</Label><CurrencyInput value={moneyText(row.pago_servidor)} onValueChange={(value) => patchRow(row.id, { pago_servidor: parseCurrency(value) })} /></div>
                          <div className="space-y-2"><Label>Data repasse servidor</Label><DateField value={row.data_pagamento_servidor} onChange={(value) => patchRow(row.id, { data_pagamento_servidor: value })} /></div>
                          <div className="space-y-2"><Label>Repassado patronal</Label><CurrencyInput value={moneyText(row.pago_patronal)} onValueChange={(value) => patchRow(row.id, { pago_patronal: parseCurrency(value) })} /></div>
                          <div className="space-y-2"><Label>Data repasse patronal</Label><DateField value={row.data_pagamento_patronal} onChange={(value) => patchRow(row.id, { data_pagamento_patronal: value })} /></div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="sticky bottom-4 flex flex-col gap-3 rounded-md border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{selected.length} de {rows.length} guias serão importadas</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setRows([])}>Escolher outra aba</Button>
              <Button disabled={saving || !selected.length || !emissao || !vencimento} onClick={save}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? "Importando..." : `Importar ${selected.length} guias`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
