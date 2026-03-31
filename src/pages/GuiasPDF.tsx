import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Download, Eye } from "lucide-react";
import { mockFolhas } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

export default function GuiasPDF() {
  const { toast } = useToast();
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  const meses = useMemo(() => {
    const unique = [...new Set(mockFolhas.map((f) => f.mesReferencia))];
    return unique.sort().reverse();
  }, []);

  const folhasFiltradas = useMemo(() => {
    if (filtroMes === "todos") return mockFolhas;
    return mockFolhas.filter((f) => f.mesReferencia === filtroMes);
  }, [filtroMes]);

  const formatMes = (mes: string) =>
    new Date(mes + "-01").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleGerarGuia = (folha: (typeof mockFolhas)[0]) => {
    toast({
      title: "Guia gerada!",
      description: `Guia para ${folha.centroCusto} - ${formatMes(folha.mesReferencia)} gerada com sucesso.`,
    });
  };

  const handleGerarTodas = () => {
    toast({
      title: "Guias geradas!",
      description: `${folhasFiltradas.length} guias geradas com sucesso.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guias PDF</h1>
          <p className="text-muted-foreground mt-1">
            Gere guias em PDF para cada folha de pagamento
          </p>
        </div>
        <Button onClick={handleGerarTodas}>
          <Download className="h-4 w-4 mr-2" />
          Gerar Todas as Guias
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtrar por Mês</CardTitle>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {meses.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMes(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folhasFiltradas.map((folha) => (
          <Card
            key={folha.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileDown className="h-6 w-6 text-primary" />
                </div>
                <div className="flex gap-1">
                  <Badge
                    variant={
                      folha.tipo === "servidor" ? "default" : "secondary"
                    }
                    className="capitalize text-xs"
                  >
                    {folha.tipo}
                  </Badge>
                  {folha.is13 && (
                    <Badge variant="outline" className="text-xs">
                      13°
                    </Badge>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-1">
                {folha.centroCusto}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {formatMes(folha.mesReferencia)}
              </p>

              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servidor:</span>
                  <span className="font-medium text-foreground">
                    {fmt(folha.valorServidor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patronal:</span>
                  <span className="font-medium text-foreground">
                    {fmt(folha.valorPatronal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="font-medium text-foreground">Total:</span>
                  <span className="font-bold text-foreground">
                    {fmt(folha.valorServidor + folha.valorPatronal)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleGerarGuia(folha)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleGerarGuia(folha)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Baixar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
