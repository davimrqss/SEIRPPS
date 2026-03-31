import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { mockFolhas } from "@/lib/mockData";

export default function Dashboard() {
  const totalFolhas = mockFolhas.length;
  const folhasPagas = mockFolhas.filter((f) => f.paga).length;
  const folhasPendentes = totalFolhas - folhasPagas;

  const totalRecebido = mockFolhas.reduce((s, f) => s + f.valorRecebido, 0);
  const totalDevido = mockFolhas.reduce(
    (s, f) => s + f.valorServidor + f.valorPatronal,
    0
  );
  const totalPendente = totalDevido - totalRecebido;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const stats = [
    {
      title: "Total Recebido",
      value: fmt(totalRecebido),
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Total Pendente",
      value: fmt(totalPendente),
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Folhas Pagas",
      value: folhasPagas.toString(),
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Folhas Pendentes",
      value: folhasPendentes.toString(),
      icon: FileText,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  const recentFolhas = mockFolhas.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da caixa de previdência
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Folhas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Centro de Custo
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Mês
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    Valor Total
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentFolhas.map((folha) => (
                  <tr
                    key={folha.id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">
                      {folha.centroCusto}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(folha.mesReferencia + "-01").toLocaleDateString(
                        "pt-BR",
                        { month: "long", year: "numeric" }
                      )}
                      {folha.is13 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          13°
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          folha.tipo === "servidor" ? "default" : "secondary"
                        }
                        className="capitalize"
                      >
                        {folha.tipo}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {fmt(folha.valorServidor + folha.valorPatronal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={
                          folha.paga
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        }
                      >
                        {folha.paga ? "Paga" : "Pendente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
