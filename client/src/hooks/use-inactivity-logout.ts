import { useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

const WARNING_TIME = 5 * 60 * 1000; // Show notification at 5 minutes
const FINAL_LOGOUT_TIME = 7 * 60 * 1000; // Auto-logout at 7 minutes if no response

export function useInactivityLogout() {
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const finalLogoutTimeoutRef = useRef<NodeJS.Timeout>();
  const notificationShownRef = useRef<boolean>(false);

  const dismissNotification = () => {
    notificationShownRef.current = false;
    if (finalLogoutTimeoutRef.current) {
      clearTimeout(finalLogoutTimeoutRef.current);
    }
  };

  const handleStayLoggedIn = () => {
    console.log('✅ User responded to inactivity warning - extending session by 7 minutes');
    dismissNotification();
    resetTimeout(); // Reset the full 7-minute timer
  };

  const resetTimeout = () => {
    if (!user) return;

    // Clear existing timeouts
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (finalLogoutTimeoutRef.current) {
      clearTimeout(finalLogoutTimeoutRef.current);
    }
    
    notificationShownRef.current = false;

    // Show warning notification at 7 minutes
    warningTimeoutRef.current = setTimeout(() => {
      if (user && !notificationShownRef.current) {
        notificationShownRef.current = true;
        console.log('⏰ User inactive for 7 minutes - showing logout warning');
        
        toast({
          title: "Sessão expirando em breve",
          description: "Você está inativo há 7 minutos. Clique em qualquer lugar para continuar conectado ou será desconectado em 1 minuto.",
          duration: 60000, // Toast visible for 60 seconds
        });

        // Final logout if user doesn't respond after 1 more minute
        finalLogoutTimeoutRef.current = setTimeout(() => {
          if (user && notificationShownRef.current) {
            console.log('⏰ User did not respond to warning - auto-logging out after 8 minutes of inactivity');
            logout().catch(err => console.error('Logout error:', err));
          }
        }, FINAL_LOGOUT_TIME - WARNING_TIME); // 1 minute = 60 seconds
      }
    }, WARNING_TIME);
  };

  useEffect(() => {
    if (!user) {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (finalLogoutTimeoutRef.current) {
        clearTimeout(finalLogoutTimeoutRef.current);
      }
      notificationShownRef.current = false;
      return;
    }

    // Activity events that should reset the timeout
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      // Only reset if notification is not currently shown (user is actively using system)
      // Also reset on any activity even if notification is shown (user is interacting)
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timeout setup
    resetTimeout();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (finalLogoutTimeoutRef.current) {
        clearTimeout(finalLogoutTimeoutRef.current);
      }
    };
  }, [user, logout, toast]);
}
