import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brToISO, isoToBR, maskDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface DateFieldProps {
  /** valor em ISO: "2026-07-05" */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
}

export function DateField({ value, onChange, id, required, className }: DateFieldProps) {
  const [text, setText] = useState(isoToBR(value));
  const [open, setOpen] = useState(false);

  // re-sincroniza o texto quando o valor muda por fora (calendário, reset, carregamento)
  useEffect(() => {
    if (brToISO(text) !== value) setText(isoToBR(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);


  const handleText = (raw: string) => {
    const masked = maskDateInput(raw);
    setText(masked);
    const iso = brToISO(masked);
    onChange(iso);
  };

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="dd-mm-aaaa"
        value={text}
        required={required}
        onChange={(e) => handleText(e.target.value)}
        className="pr-10"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Abrir calendário"
            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (!d) return;
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                d.getDate()
              ).padStart(2, "0")}`;
              onChange(iso);
              setText(isoToBR(iso));
              setOpen(false);
            }}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
