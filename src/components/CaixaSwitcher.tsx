import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixas } from "@/hooks/useCaixa";

/** Seletor de caixa de previdência — visível apenas para administradores. */
export function CaixaSwitcher() {
  const { isAdmin, activeCaixaId, setActiveCaixaId } = useAuth();
  const { data: caixas = [] } = useCaixas();

  if (!isAdmin) return null;

  return (
    <div className="px-4 pb-3">
      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sidebar-muted mb-1.5">
        <Building2 className="h-3 w-3" />
        Caixa ativa
      </label>
      <Select value={activeCaixaId ?? undefined} onValueChange={setActiveCaixaId}>
        <SelectTrigger className="h-9 bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground text-xs">
          <SelectValue placeholder="Selecionar caixa" />
        </SelectTrigger>
        <SelectContent>
          {caixas.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
