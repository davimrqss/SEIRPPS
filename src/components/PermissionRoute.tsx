import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

type Permission = "admin" | "cadastros" | "editarGuias";

export function PermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const permissions = usePermissions();
  const allowed = permission === "admin"
    ? permissions.isAdmin
    : permission === "cadastros"
      ? permissions.canViewCadastros
      : permissions.canEditFolhas;

  return allowed ? <>{children}</> : <Navigate to="/" replace />;
}