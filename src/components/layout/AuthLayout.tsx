import { useAuth } from '@/hooks/useAuth';
import { Login } from '@/pages/Login';
import { Loader2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
};