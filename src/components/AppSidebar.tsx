import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  FileDown,
  LogOut,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaAtiva, useLogoUrl } from "@/hooks/useCaixa";
import { CaixaSwitcher } from "./CaixaSwitcher";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/folhas", icon: FileText, label: "Folhas de Pagamento" },
  { to: "/guias", icon: FileDown, label: "Guias PDF" },
  { to: "/cadastro", icon: Users, label: "Cadastro" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { data: caixa } = useCaixaAtiva();
  const { data: caixaLogo } = useLogoUrl(caixa?.logo_url);

  const systemName = caixa?.nome || "PrevSys";

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {caixaLogo ? (
            <img
              src={caixaLogo}
              alt={`Logo ${systemName}`}
              className="h-10 w-10 object-contain rounded bg-sidebar-accent/30"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-sidebar-accent/40 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sidebar-accent-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-sidebar-primary-foreground leading-tight truncate">
              {systemName}
            </h1>
            <p className="text-xs text-sidebar-muted">Caixa de Previdência</p>
          </div>
        </div>
      </div>

      <div className="pt-3">
        <CaixaSwitcher />
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
