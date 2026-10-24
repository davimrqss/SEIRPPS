import type { ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Caixa "selecionar tudo" com estado parcial. */
export function CheckboxTodos({
  todos, parcial, onChange, label = "Selecionar tudo",
}: { todos: boolean; parcial: boolean; onChange: () => void; label?: string }) {
  return (
    <Checkbox
      aria-label={label}
      checked={todos ? true : parcial ? "indeterminate" : false}
      onCheckedChange={onChange}
    />
  );
}

/** Barra exibida quando há itens selecionados. */
export function BarraSelecao({
  quantidade, onLimpar, children,
}: { quantidade: number; onLimpar: () => void; children?: ReactNode }) {
  if (!quantidade) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span className="font-medium text-foreground">
        {quantidade} {quantidade === 1 ? "selecionado" : "selecionados"}
      </span>
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {children}
        <Button type="button" variant="ghost" size="sm" onClick={onLimpar}>
          <X className="mr-1 h-4 w-4" />Limpar seleção
        </Button>
      </div>
    </div>
  );
}

export function BotaoExcluirSelecionados({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="destructive" size="sm" onClick={onClick}>
      <Trash2 className="mr-1 h-4 w-4" />Excluir selecionados
    </Button>
  );
}

/** Confirmação de exclusão em massa. */
export function ConfirmarExclusaoEmMassa({
  open, onOpenChange, titulo, descricao, excluindo, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  excluindo: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !excluindo && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={excluindo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {excluindo ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
