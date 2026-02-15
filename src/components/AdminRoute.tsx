import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { FullPageSpinner } from "./FullPageSpinner";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
