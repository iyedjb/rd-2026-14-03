import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { LoginForm } from '@/components/auth/login-form';
import { Plane, Globe, MapPin } from 'lucide-react';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-[400px]">
        <LoginForm onToggleMode={() => { }} />
      </div>
      <div className="mt-8 text-sm text-slate-500 text-center">
        <p>© 2026 Roda Bem Turismo</p>
      </div>
    </div>
  );
}

