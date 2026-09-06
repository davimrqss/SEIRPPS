import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "gestor_financeiro" | "operador" | "fiscal";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { nome: string; caixa_id: string | null; cargo: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
  /** Caixa atualmente em uso. Para não-admins é sempre a caixa do perfil. */
  activeCaixaId: string | null;
  setActiveCaixaId: (id: string) => void;
  isAdmin: boolean;
}

const STORAGE_KEY = "prevsys.activeCaixaId";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminCaixaId, setAdminCaixaId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const fetchProfileAndRoles = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nome, caixa_id, cargo")
      .eq("user_id", userId)
      .single();
    setProfile(profileData);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((rolesData ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            await fetchProfileAndRoles(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = roles.includes("admin");

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRoles(user.id);
  };

  const setActiveCaixaId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setAdminCaixaId(id);
  };

  // Só admins podem alternar de caixa; os outros ficam presos à caixa do perfil.
  const activeCaixaId = isAdmin ? adminCaixaId ?? profile?.caixa_id ?? null : profile?.caixa_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        signOut,
        hasRole,
        refreshProfile,
        activeCaixaId,
        setActiveCaixaId,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
