import { Users, Bus, DollarSign, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { DashboardStats } from "@/types";

export type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

interface StatsCardsProps {
  stats: DashboardStats;
  isLoading?: boolean;
  revenuePeriod?: RevenuePeriod;
  onPeriodChange?: (period: RevenuePeriod) => void;
}

function useAnimatedValue(endValue: number, duration: number = 2000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (endValue === 0) {
      setValue(0);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(endValue);
      return;
    }

    let startTime: number;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.floor(endValue * easeOutExpo));
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [endValue, duration]);

  return value;
}

export function StatsCards({ stats, isLoading, revenuePeriod = 'monthly', onPeriodChange }: StatsCardsProps) {
  const { userRole } = useAuth();
  
  const periodLabels = {
    daily: 'Receita Diária',
    weekly: 'Receita Semanal',
    monthly: 'Receita Mensal'
  };
  
  const animatedClients = useAnimatedValue(stats.totalClients, 1500);
  const animatedDestinations = useAnimatedValue(stats.activeDestinations, 1200);
  const animatedRevenue = useAnimatedValue(stats.monthlyRevenue, 2000);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    }).format(value);
  };

  const allStatsData = [
    {
      id: "totalClients",
      title: "Total de Clientes",
      rawValue: stats.totalClients,
      animatedValue: animatedClients,
      icon: Users,
      change: "+12% este mês",
      changeType: "positive" as const,
      formatter: (val: number) => val.toString(),
    },
    {
      id: "activeDestinations",
      title: "Destinos Ativos",
      rawValue: stats.activeDestinations,
      animatedValue: animatedDestinations,
      icon: Bus,
      change: "+5 novos",
      changeType: "positive" as const,
      formatter: (val: number) => val.toString(),
    },
    {
      id: "monthlyRevenue",
      title: periodLabels[revenuePeriod],
      rawValue: stats.monthlyRevenue,
      animatedValue: animatedRevenue,
      icon: DollarSign,
      change: "Parcelas + Transações",
      changeType: "positive" as const,
      formatter: formatCurrency,
    },
  ];
  
  const statsData = userRole === 'vadmin' 
    ? allStatsData 
    : allStatsData.filter(stat => stat.id !== "monthlyRevenue");

  if (isLoading) {
    const skeletonCount = userRole === 'vadmin' ? 3 : 2;
    return (
      <div className={`grid grid-cols-1 ${userRole === 'vadmin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="relative neo-extruded rounded-[32px] p-8 overflow-hidden">
            <div className="animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-full w-24 mb-4"></div>
                  <div className="h-10 bg-muted rounded-2xl w-32 mb-3"></div>
                  <div className="h-3 bg-muted rounded-full w-20"></div>
                </div>
                <div className="h-14 w-14 neo-inset-deep rounded-2xl"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {userRole === 'vadmin' && onPeriodChange && (
        <div className="flex justify-end mb-4 gap-2">
          {(['daily', 'weekly', 'monthly'] as RevenuePeriod[]).map((period) => (
            <Button
              key={period}
              variant={revenuePeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange(period)}
              data-testid={`button-period-${period}`}
              className={`flex items-center gap-2 text-xs rounded-xl transition-all duration-300 ${
                revenuePeriod === period 
                  ? 'neo-inset text-primary border-0' 
                  : 'neo-btn text-muted-foreground bg-transparent border-0'
              }`}
            >
              <Calendar className="h-3 w-3" />
              {period === 'daily' ? 'Diária' : period === 'weekly' ? 'Semanal' : 'Mensal'}
            </Button>
          ))}
        </div>
      )}
      
      <div className={`grid grid-cols-1 ${userRole === 'vadmin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        {statsData.map((stat, index) => (
          <div 
            key={index} 
            data-testid={`stat-card-${index}`}
            className={`group relative neo-extruded rounded-[32px] p-8 overflow-hidden transition-all duration-500`}
          >
            <div className="relative flex items-start justify-between h-full">
              <div className="flex-1">
                <p 
                  className="text-sm font-semibold text-muted-foreground mb-2 tracking-wide"
                  data-testid={`text-stat-title-${index}`}
                >
                  {stat.title}
                </p>
                <p 
                  className="text-4xl lg:text-5xl font-black text-foreground mb-3 tracking-tight"
                  data-testid={`text-stat-value-${index}`}
                >
                  {stat.formatter(stat.animatedValue)}
                </p>
                
                <div className={`flex items-center gap-2 text-primary`}>
                  <div className="flex items-center gap-1 neo-inset px-3 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-bold">{stat.change}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className={`relative neo-inset-deep p-4 rounded-2xl text-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  <stat.icon className="h-7 w-7" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
