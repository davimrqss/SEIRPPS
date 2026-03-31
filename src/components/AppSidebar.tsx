import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Users,
  FileDown,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo.jpeg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/folhas", icon: FileText, label: "Folhas de Pagamento" },
  { to: "/lancamentos", icon: CreditCard, label: "Lançar Pagamento" },
  { to: "/guias", icon: FileDown, label: "Guias PDF" },
  { to: "/cadastro", icon: Users, label: "Cadastro" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  const { data: caixa } = useQuery({
    queryKey: ["minha-caixa"],
    queryFn: async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("caixa_id")
        .eq("user_id", user!.id)
        .single();
      if (!prof?.caixa_id) return null;
      const { data } = await supabase
        .from("caixas_previdencia")
        .select("nome")
        .eq("id", prof.caixa_id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const systemName = caixa?.nome || "PrevSys";

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 w-10 object-contain rounded" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-primary-foreground leading-tight">
              {systemName}
            </h1>
            <p className="text-xs text-sidebar-muted">Caixa de Previdência</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        {profile && (
          <p className="text-xs text-sidebar-muted px-3 truncate">
            {profile.nome}
          </p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 w-full"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
