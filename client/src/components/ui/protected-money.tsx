import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

interface ProtectedMoneyProps {
  amount: number;
  formatted?: string;
  className?: string;
}

export function ProtectedMoney({ amount, formatted, className = "" }: ProtectedMoneyProps) {
  const { userRole } = useAuth();
  const [isForceHidden, setIsForceHidden] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("caixa_show_amounts");
      return saved === "false";
    }
    return false;
  });

  useEffect(() => {
    const handleToggle = (event: any) => {
      setIsForceHidden(!event.detail.show);
    };

    window.addEventListener("toggle-amounts-visibility", handleToggle);
    return () => window.removeEventListener("toggle-amounts-visibility", handleToggle);
  }, []);
  
  // Hide money from normal admins (admin role), show to vadmins
  const isNormalAdmin = userRole === "admin";
  
  if (isNormalAdmin || isForceHidden) {
    return <span className={`text-muted-foreground font-semibold ${className}`}>***</span>;
  }
  
  return <span className={className}>{formatted || amount.toString()}</span>;
}
