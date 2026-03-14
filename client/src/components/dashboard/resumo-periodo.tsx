import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Lock, Star, Activity, Target } from "lucide-react";

export function ResumoPeriodo() {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-indigo-500/5 dark:from-indigo-400/10 dark:via-purple-400/10 dark:to-indigo-400/10 rounded-lg"></div>
      
      {/* Premium overlay */}
      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-100/10 rounded-lg backdrop-blur-[1px] flex items-center justify-center z-20">
        <div className="text-center">
          <div className="bg-yellow-500/20 p-3 rounded-full mx-auto w-fit mb-3">
            <Lock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
            Recurso Premium
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 max-w-xs">
            Relatório detalhado de performance com análise comparativa
          </p>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg"
            data-testid="button-upgrade-resumo"
          >
            <Star className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        </div>
      </div>
      
      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center text-slate-800 dark:text-white">
          <div className="bg-indigo-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <span className="text-lg lg:text-xl font-bold">Resumo do Período</span>
            <div className="flex items-center mt-1">
              <Activity className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Performance geral está 18% acima da média histórica</span>
              <Lock className="h-3 w-3 text-yellow-500 ml-2" />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative pt-2 blur-sm">
        <div className="space-y-1">
          {/* Performance Overview */}
          <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white">Performance Geral</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Comparação com período anterior</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">+18%</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">vs. período anterior</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Taxa Conversão</span>
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">68%</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">+13% este mês</p>
            </div>
            
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Satisfação</span>
              </div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">92%</p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">Novo recorde!</p>
            </div>
          </div>

          {/* Trends */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Tendências do Período</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Aumento de 23% em novos clientes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Retenção de clientes subiu para 84%
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Tempo médio de resposta melhorou 15%
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}