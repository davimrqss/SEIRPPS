import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        R$
      </span>
      <Input
        ref={ref}
        inputMode="decimal"
        placeholder="0,00"
        className={cn("pl-9", className)}
        value={value}
        onChange={(e) => onValueChange(formatCurrencyInput(e.target.value))}
        {...props}
      />
    </div>
  )
);
CurrencyInput.displayName = "CurrencyInput";
