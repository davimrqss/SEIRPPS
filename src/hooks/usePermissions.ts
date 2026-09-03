import { useAuth } from "@/contexts/AuthContext";

/** Regras de permissão por perfil de acesso. */
export function usePermissions() {
  const { roles } = useAuth();

  const isAdmin = roles.includes("admin");
  const isGestor = roles.includes("gestor_financeiro");
  const isOperador = roles.includes("operador");
  const isFiscal = roles.includes("fiscal");

  // Fiscal é somente leitura das telas operacionais.
  const readOnly = isFiscal && !isAdmin && !isGestor && !isOperador;

  return {
    isAdmin,
    isGestor,
    isOperador,
    isFiscal,
    /** Pode criar/editar/excluir folhas, guias e pagamentos. */
    canEditFolhas: isAdmin || isGestor || isOperador,
    /** Pode alterar dados de caixas e órgãos (só admin). */
    canEditCaixasEOrgaos: isAdmin,
    /** Pode criar/editar centros de custo. */
    canEditCentrosCusto: isAdmin || isGestor,
    /** Pode ver as páginas de caixas e órgãos. */
    canViewCadastros: isAdmin || isGestor || isOperador,
    /** Pode criar contas de acesso. */
    canManageUsers: isAdmin,
    /** Pode alterar o próprio e-mail e senha diretamente. */
    canEditOwnCredentials: isAdmin,
    readOnly,
  };
}
