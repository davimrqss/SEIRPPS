import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CorrecaoMonetaria({ id, checked, onChange, indice, aliquota, disabled = false }: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  indice?: string | null;
  aliquota?: number;
  disabled?: boolean;
}) {
  return <div className="space-y-3">
    <Label>Correção Monetária</Label>
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2"><Checkbox id={`${id}-sim`} checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(value === true)} /><Label htmlFor={`${id}-sim`} className="font-normal">Sim</Label></div>
      <div className="flex items-center gap-2"><Checkbox id={`${id}-nao`} checked={!checked} disabled={disabled} onCheckedChange={(value) => onChange(value !== true)} /><Label htmlFor={`${id}-nao`} className="font-normal">Não</Label></div>
    </div>
    {checked && <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`${id}-indice`}>Índice</Label><Input id={`${id}-indice`} value={indice ?? ""} readOnly /></div>
      <div className="space-y-2"><Label htmlFor={`${id}-aliquota`}>Alíquota (%)</Label><Input id={`${id}-aliquota`} value={String(aliquota ?? 0)} readOnly /></div>
    </div>}
  </div>;
}