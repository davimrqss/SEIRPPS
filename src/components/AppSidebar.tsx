import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  FileDown,
  LogOut,
  Building2,
  Landmark,
  Wallet,
  UserCog,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCaixaAtiva, useLogoUrl } from "@/hooks/useCaixa";
import { CaixaSwitcher } from "./CaixaSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";

export function AppSidebar({ mobile = false }: { mobile?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const perms = usePermissions();
  const { data: caixa } = useCaixaAtiva();
  const { data: caixaLogo } = useLogoUrl(caixa?.logo_url);
  const { data: avatar } = useLogoUrl(profile?.avatar_url ?? undefined);

  const systemName = caixa?.nome || "PrevSys";

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", show: true },
    { to: "/folhas", icon: FileText, label: "Folhas de Pagamento", show: true },
    { to: "/guias", icon: FileDown, label: "Guias PDF", show: true },
    { to: "/caixas", icon: Landmark, label: "Caixa de Previdência", show: perms.canViewCadastros },
    { to: "/orgaos", icon: Building2, label: "Órgãos", show: perms.canViewCadastros },
    { to: "/centros-custo", icon: Wallet, label: "Centros de Custo", show: perms.canViewCadastros },
    { to: "/cadastro", icon: Users, label: "Contas de Acesso", show: perms.canManageUsers },
  ].filter((i) => i.show);

  const initials = (profile?.nome ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="group w-64 hover:w-80 transition-[width] duration-300 ease-out min-h-screen bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {caixaLogo ? (
            <img
              src={caixaLogo}
              alt={`Logo ${systemName}`}
              className="h-10 w-10 shrink-0 object-contain rounded"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-sidebar-accent/40 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sidebar-accent-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-sidebar-primary-foreground leading-tight truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-clip">
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
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate group-hover:whitespace-normal">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50">
            <Avatar className="h-8 w-8 shrink-0">
              {avatar && <AvatarImage src={avatar} alt={profile?.nome ?? "Perfil"} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate group-hover:whitespace-normal">
              {profile?.nome ?? "Minha conta"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/minha-conta")}>
              <UserCog className="mr-2 h-4 w-4" />
              Opções de conta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 px-3 pt-3 border-t border-sidebar-border/60">
          <img src={logo} alt="PrevSys" className="h-5 w-5 object-contain opacity-80" />
          <span className="text-[11px] text-sidebar-muted">PrevSys</span>
        </div>
      </div>
    </aside>
  );
}
