import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      // Error handling would be added here
      return;
    }

    try {
      await register(email, password);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="mb-1 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mb-4">
          <UserPlus className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Criar Conta</h1>
        <p className="text-muted-foreground text-sm">Junte-se à Roda Bem Turismo</p>
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-1">
          {/* Email Field */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                data-testid="input-register-email"
                type="email"
                placeholder="seu@email.com"
                className="pl-12 h-12 bg-secondary/50 border-border focus:border-primary transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                data-testid="input-register-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="pl-12 h-12 bg-secondary/50 border-border focus:border-primary transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar Senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="confirmPassword"
                data-testid="input-register-confirm-password"
                type="password"
                placeholder="Confirme sua senha"
                className="pl-12 h-12 bg-secondary/50 border-border focus:border-primary transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive font-medium">As senhas não coincidem</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold rounded-lg transition-all duration-200 hover:shadow-lg"
            disabled={loading || !email || !password || !confirmPassword || password !== confirmPassword}
            data-testid="button-register"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-background border-t-white rounded-full animate-spin" />
                Criando conta...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Criar Conta
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        </form>
      </div>

      {/* Footer Note */}
      <p className="text-center text-xs text-muted-foreground mt-1">
        Use seu email corporativo @rodabemturismo.com ou @vuro.com.br
      </p>
    </div>
  );
}