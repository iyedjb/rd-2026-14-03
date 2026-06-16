import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, Plane } from 'lucide-react';

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await login(email, password);
    } catch (error) {
    }
  };

  return (
    <div className="w-full">
      {/* Mobile Logo - only visible on smaller screens */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Plane className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900 dark:text-white">Roda Bem Turismo</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Entrar na sua conta
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Insira suas credenciais para acessar o sistema
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <div className="relative group">
              <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-focus-within:bg-emerald-100 dark:group-focus-within:bg-emerald-900/50 transition-colors">
                  <Mail className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                </div>
              </div>
              <Input
                id="email"
                data-testid="input-login-email"
                type="email"
                placeholder="seu@email.com"
                className="pl-14 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Senha
            </Label>
            <div className="relative group">
              <div className="absolute left-0 top-0 h-full w-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-focus-within:bg-emerald-100 dark:group-focus-within:bg-emerald-900/50 transition-colors">
                  <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" />
                </div>
              </div>
              <Input
                id="password"
                data-testid="input-login-password"
                type="password"
                placeholder="Digite sua senha"
                className="pl-14 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 text-white gap-2"
            disabled={loading || !email || !password}
            data-testid="button-login"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use seus dados corporativos
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          @rodabemturismo.com ou @vuro.com.br
        </p>
      </div>
    </div>
  );
}
