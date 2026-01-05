import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, checkSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Check if session is valid (not expired)
    const valid = checkSession();
    setIsValid(valid);
    setIsChecking(false);
  }, [checkSession]);

  // Show loading state while checking session
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terebinth-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or session expired, redirect to login
  if (!isAuthenticated || !isValid) {
    // Save the attempted location so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated - render children
  return <>{children}</>;
}
