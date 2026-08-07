import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative h-11 w-11 rounded-full border border-border bg-card/80 backdrop-blur",
        "shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-primary/50",
        "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Sun
        className={cn(
          "absolute inset-0 m-auto h-5 w-5 text-warning transition-all duration-500",
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100 group-hover:rotate-45"
        )}
      />
      <Moon
        className={cn(
          "absolute inset-0 m-auto h-5 w-5 text-accent transition-all duration-500",
          isDark
            ? "rotate-0 scale-100 opacity-100 group-hover:-rotate-12"
            : "-rotate-90 scale-0 opacity-0"
        )}
      />
    </button>
  );
}
