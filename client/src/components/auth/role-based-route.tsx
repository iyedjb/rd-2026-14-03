import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';

type UserRole = "admin" | "vadmin";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
  unauthorizedFallbackPath?: string;
}

export function RoleBasedRoute({ 
  children, 
  requiredRoles, 
  fallbackPath = '/auth',
  showAccessDenied = true,
  unauthorizedFallbackPath = '/'
}: RoleBasedRouteProps) {
  const { user, userRole, loading, roleLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to auth if user is not authenticated
    if (!loading && !user) {
      setLocation(fallbackPath);
    }
  }, [user, loading, setLocation, fallbackPath]);

  // Show loading spinner while authentication or role is being determined
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="status-loading">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if no user (will be handled by useEffect)
  if (!user) {
    return null;
  }

  // Check if user has required role
  const hasRequiredRole = userRole && requiredRoles.includes(userRole);

  // Handle unauthorized access - redirect if showAccessDenied is false
  useEffect(() => {
    if (!hasRequiredRole && !showAccessDenied && user && !loading && !roleLoading) {
      setLocation(unauthorizedFallbackPath);
    }
  }, [hasRequiredRole, showAccessDenied, user, loading, roleLoading, setLocation, unauthorizedFallbackPath]);

  if (!hasRequiredRole) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-testid="status-access-denied">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl font-semibold">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p>Você não tem permissão para acessar esta página.</p>
                  <p className="mt-2" data-testid="text-required-roles">
                    <span className="font-medium">Acesso necessário:</span>{' '}
                    {requiredRoles.map((role, index) => (
                      <span key={role}>
                        {role === 'vadmin' ? 'Administrador Total' : 'Administrador'}
                        {index < requiredRoles.length - 1 ? ' ou ' : ''}
                      </span>
                    ))}
                  </p>
                  {userRole && (
                    <p className="mt-1" data-testid="text-user-role">
                      <span className="font-medium">Seu nível:</span>{' '}
                      {userRole === 'vadmin' ? 'Administrador Total' : 'Administrador'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
}

// Convenience component for vadmin-only routes
export function VadminRoute({ children, ...props }: Omit<RoleBasedRouteProps, 'requiredRoles'>) {
  return (
    <RoleBasedRoute requiredRoles={['vadmin']} {...props}>
      {children}
    </RoleBasedRoute>
  );
}

// Convenience component for admin or vadmin routes
export function AdminRoute({ children, ...props }: Omit<RoleBasedRouteProps, 'requiredRoles'>) {
  return (
    <RoleBasedRoute requiredRoles={['admin', 'vadmin']} {...props}>
      {children}
    </RoleBasedRoute>
  );
}