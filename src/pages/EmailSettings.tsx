import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import EmailConfiguration from '@/components/settings/EmailConfiguration';

export default function EmailSettings() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto py-6">
      <EmailConfiguration />
    </div>
  );
}
