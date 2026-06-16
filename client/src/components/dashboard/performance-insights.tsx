import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Award, Zap, Lock, Star, BarChart } from "lucide-react";
import type { DashboardStats } from "@/types";

interface PerformanceInsightsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export function PerformanceInsights({ stats, isLoading }: PerformanceInsightsProps) {
  const conversionRate = Math.round(stats?.conversionRate || 0);
  const satisfactionRate = Math.round(stats?.satisfactionRate || 0);
  const retentionRate = Math.round(stats?.retentionRate || 0);

  const insights = [
    {
      id: 1,
      title: "Taxa de Conversão",
      value: `${conversionRate}%`,
      description: "Prospects convertidos em clientes",
      progress: conversionRate,
      trend: "up",
      color: "blue",
      isPremium: false
    },
    {
      id: 2,
      title: "Satisfação do Cliente",
      value: `${satisfactionRate}%`,
      description: "Estimativa baseada em pagamentos",
      progress: satisfactionRate,
      trend: "up",
      color: "green",
      isPremium: false
    },
    {
      id: 3,
      title: "Retenção de Clientes",
      value: `${retentionRate}%`,
      description: "Clientes que retornaram",
      progress: retentionRate,
      trend: "up",
      color: "purple",
      isPremium: false
    },
    {
      id: 4,
      title: "Análise de ROI",
      value: "?",
      description: "Retorno sobre investimento",
      progress: 0,
      trend: "premium",
      color: "orange",
      isPremium: true
    },
    {
      id: 5,
      title: "Previsão de Vendas",
      value: "?",
      description: "Projeções baseadas em IA",
      progress: 0,
      trend: "premium",
      color: "rose",
      isPremium: true
    },
    {
      id: 6,
      title: "Segmentação Avançada",
      value: "?",
      description: "Análise detalhada de perfis",
      progress: 0,
      trend: "premium",
      color: "indigo",
      isPremium: true
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return {
          icon: "bg-green-500/20 text-green-600 dark:text-green-400",
          progress: "bg-green-500"
        };
      case "blue":
        return {
          icon: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
          progress: "bg-blue-500"
        };
      case "purple":
        return {
          icon: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
          progress: "bg-purple-500"
        };
      case "orange":
        return {
          icon: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
          progress: "bg-orange-500"
        };
      case "rose":
        return {
          icon: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
          progress: "bg-rose-500"
        };
      case "indigo":
        return {
          icon: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
          progress: "bg-indigo-500"
        };
      default:
        return {
          icon: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
          progress: "bg-gray-500"
        };
    }
  };

  const getTrendIcon = (trend: string, isPremium?: boolean) => {
    if (isPremium) {
      return <Lock className="h-3 w-3 text-yellow-500" />;
    }
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      default:
        return <Target className="h-3 w-3 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="group hover:shadow-2xl transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
        <CardHeader className="relative pb-4">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent className="relative pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4"></div>
                  <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-rose-500/5 dark:from-rose-400/10 dark:via-pink-400/10 dark:to-rose-400/10 rounded-lg"></div>
      
      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center text-slate-800 dark:text-white">
          <div className="bg-rose-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
            <Award className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <span className="text-lg lg:text-xl font-bold">Insights de Performance</span>
            <div className="flex items-center mt-1">
              <Zap className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Indicadores principais de sucesso</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {insights.map((insight) => {
            const colors = getColorClasses(insight.color);
            return (
              <div 
                key={insight.id}
                className={`relative p-4 rounded-xl transition-all duration-200 ${
                  insight.isPremium 
                    ? 'bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80' 
                    : 'bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
                }`}
                data-testid={`insight-${insight.id}`}
              >
                {insight.isPremium && (
                  <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-100/10 rounded-xl backdrop-blur-[1px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-yellow-500/20 p-3 rounded-full mx-auto w-fit mb-2">
                        <Lock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Recurso Premium
                      </p>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    </div>
                  </div>
                )}

                <div className={`${insight.isPremium ? 'blur-sm' : ''} transition-all duration-200`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${colors.icon}`}>
                      {getTrendIcon(insight.trend, insight.isPremium)}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {insight.value}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
                        {insight.title}
                      </h4>
                      {!insight.isPremium && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {insight.progress}%
                        </span>
                      )}
                    </div>
                    
                    {!insight.isPremium && (
                      <Progress 
                        value={insight.progress} 
                        className="h-2 bg-slate-200 dark:bg-slate-700"
                      />
                    )}
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-1 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">
                Resumo do Período
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Performance geral está 18% acima da média histórica
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}