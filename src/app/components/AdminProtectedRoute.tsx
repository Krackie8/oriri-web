import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import OririLoader from './OririLoader';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  onShowLogin?: () => void;
}

/**
 * AdminProtectedRoute Component
 * 
 * Protects admin routes by checking:
 * 1. User is authenticated (logged in)
 * 2. User has admin role
 * 
 * Shows appropriate loading/error states and redirects as needed.
 */
export default function AdminProtectedRoute({ children, onShowLogin }: AdminProtectedRouteProps) {
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError, isInitialized } = useAdmin();
  const navigate = useNavigate();
  const [hasChecked, setHasChecked] = useState(false);

  // Combined loading state
  const isLoading = authLoading || adminLoading || !isInitialized;

  useEffect(() => {
    // Wait for both auth and admin checks to complete
    if (!authLoading && !adminLoading && isInitialized) {
      setHasChecked(true);
    }
  }, [authLoading, adminLoading, isInitialized]);

  // Show loading state while checking authentication and admin status
  if (isLoading || !hasChecked) {
    return (
      <OririLoader variant="screen" />
    );
  }

  // Not logged in - redirect to home and show login modal
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Authentication Required</strong>
              <p className="mt-2">You must be logged in to access the admin dashboard.</p>
            </AlertDescription>
          </Alert>
          <div className="flex space-x-3">
            <Button 
              onClick={() => {
                if (onShowLogin) {
                  onShowLogin();
                }
                navigate('/', { replace: true });
              }}
              className="flex-1"
            >
              Login
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
              className="flex-1"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin - show access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Access Denied</strong>
              <p className="mt-2">
                You don't have permission to access the admin dashboard. 
                Only authorized administrators can access this area.
              </p>
              {user?.email && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Logged in as: {user.email}
                </p>
              )}
              {adminError && (
                <p className="mt-2 text-xs text-red-500">
                  Error: {adminError}
                </p>
              )}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline"
            onClick={() => navigate('/', { replace: true })}
            className="w-full"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated AND is admin - render the protected content
  return <>{children}</>;
}
