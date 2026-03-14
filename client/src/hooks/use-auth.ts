import { useState, useEffect, createContext, useContext } from 'react';
import { 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type UserRole = "admin" | "vadmin" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  roleLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const { toast } = useToast();

  // Function to fetch user role from backend
  const fetchUserRole = async (user: User): Promise<UserRole> => {
    try {
      setRoleLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User doesn't exist in our system, initialize them
          try {
            await fetch('/api/auth/initialize', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            // Retry fetching user after initialization
            const retryResponse = await fetch(`/api/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (retryResponse.ok) {
              const userData = await retryResponse.json();
              return userData.role || null;
            }
          } catch (initError) {
            console.error('Error initializing user:', initError);
          }
          return null;
        }
        throw new Error(`Failed to fetch user role: ${response.status}`);
      }

      const userData = await response.json();
      return userData.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // Set persistence to local storage
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // Check if existing user's domain is still allowed
        if (!isValidEmailDomain(user.email)) {
          await signOut(auth);
          toast({
            title: "Sessão encerrada",
            description: "Apenas emails dos domínios @rodabemturismo.com e @vuro.com.br são permitidos.",
            variant: "destructive",
          });
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }
        
        // Fetch user role from backend
        const role = await fetchUserRole(user);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Validate email domain
      if (!isValidEmailDomain(email)) {
        toast({
          title: "Acesso não autorizado",
          description: "Apenas emails dos domínios @rodabemturismo.com e @vuro.com.br são permitidos.",
          variant: "destructive",
        });
        return;
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao sistema.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Validate email domain
      if (!isValidEmailDomain(email)) {
        toast({
          title: "Cadastro não autorizado",
          description: "Apenas emails dos domínios @rodabemturismo.com e @vuro.com.br são permitidos.",
          variant: "destructive",
        });
        return;
      }
      
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Sua conta foi criada. Bem-vindo!",
      });
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: getErrorMessage(error.code),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Domain validation helper function
  const isValidEmailDomain = (email: string): boolean => {
    const allowedDomains = ['rodabemturismo.com', 'vuro.com.br'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(emailDomain);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado do sistema.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao sair do sistema.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    user,
    userRole,
    loading,
    roleLoading,
    login,
    register,
    logout,
  };
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuário não encontrado.';
    case 'auth/wrong-password':
      return 'Senha incorreta.';
    case 'auth/email-already-in-use':
      return 'Este email já está sendo usado.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet.';
    default:
      return 'Ocorreu um erro inesperado.';
  }
}