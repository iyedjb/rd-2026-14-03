import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, History, Gift, MapPin, Bus, Calendar } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { label: "Clientes", icon: Users, href: "/clients" },
  { label: "Histórico de Clientes", icon: History, href: "/client-history" },
  { label: "Indicações", icon: Gift, href: "/indicacoes" },
  { label: "Orçamento de Viagens", icon: MapPin, href: "/parcelas" },
  { label: "Destinos", icon: MapPin, href: "/destinations" },
  { label: "Programa de Viagens", icon: Calendar, href: "/programa-viagens" },
  { label: "Descrição de Ônibus", icon: Bus, href: "/buses" },
];

export function AtendimentoClienteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();

  const handleNavigate = (href: string) => {
    setLocation(href);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto neo-extruded border-0 rounded-[32px] p-6 lg:p-8">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-center text-foreground mb-4">Atendimento do Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                data-testid={`button-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-4 p-4 rounded-3xl neo-btn group transition-all"
              >
                <div className="neo-inset-deep text-primary p-3 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 tracking-wide uppercase">Acessar</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
