import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp, MapPin, Calendar, Users, Activity, Zap, Lock, Star } from "lucide-react";
import { useDashboardChartData } from "@/hooks/use-reports";

interface ChartsSectionProps {
  isLoading?: boolean;
}

// Enhanced static data with modern colors

// Eco-friendly color palette for charts
const chartColors = {
  primary: "#16A085", // Teal green
  secondary: "#27AE60", // Green
  tertiary: "#2ECC71", // Emerald
  accent: "#58D68D", // Light green  
  success: "#10B981",
  warning: "#F39C12", // Orange
  danger: "#E74C3C", // Red
  nature1: "#2E8B57", // Sea green
  nature2: "#228B22", // Forest green
  nature3: "#32CD32", // Lime green
  gradient: "url(#colorGradient)",
};

const chartConfig = {
  clients: {
    label: "Clientes",
    icon: Users,
  },
  destination: {
    label: "Destinos",
    icon: MapPin,
  },
  period: {
    label: "Período",
    icon: Calendar,
  },
};

export function ChartsSection({ isLoading }: ChartsSectionProps) {
  const { data: chartData, isLoading: chartDataLoading } = useDashboardChartData();

  // Use real data from the API
  const clientsPerMonthData = chartData?.clientsPerMonth || [];
  const popularDestinationsData = chartData?.popularDestinations || [];

  if (isLoading || chartDataLoading) {
    return (
      <div className="space-y-1 mb-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="group hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
            <CardHeader>
              <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[420px] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show message if no data available
  if (clientsPerMonthData.length === 0 && popularDestinationsData.length === 0) {
    return (
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
        <CardContent className="p-12 text-center">
          <Activity className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Sem dados suficientes
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Adicione clientes para visualizar gráficos e estatísticas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1 mb-1">
      {/* Clientes por Mês - Enhanced Eco-friendly Line Chart */}
      <Card 
        data-testid="chart-clients-per-month"
        className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50"
      >
        {/* Eco-friendly gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-emerald-500/5 to-green-500/5 dark:from-teal-400/10 dark:via-emerald-400/10 dark:to-green-400/10 rounded-lg"></div>
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-slate-800 dark:text-white">
            <div className="bg-teal-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <span className="text-lg font-bold">Clientes por Mês</span>
              <div className="flex items-center mt-1">
                <Activity className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Crescimento sustentável</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={chartConfig} className="h-[420px]">
            <LineChart data={clientsPerMonthData}>
              <defs>
                <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-sm text-slate-600 dark:text-slate-300"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-sm text-slate-600 dark:text-slate-300"
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const growth = data.previous && data.previous !== 0 ? 
                      ((data.clients - data.previous) / data.previous * 100).toFixed(1) : null;
                    const targetReached = data.target ? ((data.clients / data.target) * 100).toFixed(1) : null;
                    
                    return (
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-white/20 dark:border-slate-700/50 min-w-[220px]">
                        <p className="font-bold text-slate-800 dark:text-white mb-3 text-center text-lg">{label}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-teal-600 dark:text-teal-400">🌱 Clientes:</span>
                            <span className="font-bold text-slate-800 dark:text-white text-lg">{data.clients}</span>
                          </div>
                          {data.previous && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">📊 Anterior:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{data.previous}</span>
                            </div>
                          )}
                          {data.target && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-blue-600 dark:text-blue-400">🎯 Meta:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{data.target}</span>
                            </div>
                          )}
                          {data.revenue && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-green-600 dark:text-green-400">💰 Receita:</span>
                              <span className="font-bold text-slate-800 dark:text-white">R$ {data.revenue.toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                          {(growth !== null || targetReached !== null) && (
                            <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-1">
                              {growth !== null && (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-teal-600 dark:text-teal-400">📈 Crescimento:</span>
                                  <span className={`font-bold ${parseFloat(growth) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {parseFloat(growth) > 0 ? '+' : ''}{growth}%
                                  </span>
                                </div>
                              )}
                              {targetReached !== null && (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-purple-600 dark:text-purple-400">✅ Meta:</span>
                                  <span className={`font-bold ${parseFloat(targetReached) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {targetReached}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="clients"
                stroke={chartColors.primary}
                strokeWidth={3}
                fill="url(#clientsGradient)"
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: chartColors.primary, strokeWidth: 2, fill: "white" }}
                name="Clientes Atuais"
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke={chartColors.secondary}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartColors.secondary, strokeWidth: 2, fill: "white" }}
                name="Período Anterior"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Destinos Mais Populares - Enhanced Line Chart with Eco-friendly Design */}
      <Card 
        data-testid="chart-popular-destinations"
        className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50"
      >
        {/* Eco-friendly gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 dark:from-green-400/10 dark:via-emerald-400/10 dark:to-teal-400/10 rounded-lg"></div>
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-slate-800 dark:text-white">
            <div className="bg-green-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="text-lg font-bold">Destinos Mais Populares</span>
              <div className="flex items-center mt-1">
                <Activity className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Turismo sustentável</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={chartConfig} className="h-[420px]">
            <LineChart data={popularDestinationsData}>
              <defs>
                <linearGradient id="destinationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ecoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.nature1} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartColors.nature1} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="destination" 
                axisLine={false}
                tickLine={false}
                className="text-sm text-slate-600 dark:text-slate-300"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-sm text-slate-600 dark:text-slate-300"
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const getEcoRating = (score: number | undefined) => {
                      if (!score) return { text: "N/A", color: "text-gray-600", emoji: "❓" };
                      if (score >= 90) return { text: "Excelente", color: "text-emerald-600", emoji: "🌟" };
                      if (score >= 80) return { text: "Muito Bom", color: "text-green-600", emoji: "🌱" };
                      if (score >= 70) return { text: "Bom", color: "text-yellow-600", emoji: "🌿" };
                      return { text: "Regular", color: "text-orange-600", emoji: "⚠️" };
                    };
                    const ecoRating = getEcoRating(data.eco_score);
                    
                    return (
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-white/20 dark:border-slate-700/50 min-w-[240px]">
                        <p className="font-bold text-slate-800 dark:text-white text-center mb-3 text-lg">{label}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-green-600 dark:text-green-400 font-medium">🧑‍🤝‍🧑 Clientes:</span>
                            <span className="font-bold text-slate-800 dark:text-white text-lg">{data.clients}</span>
                          </div>
                          {data.bookings_this_year && (
                            <div className="flex justify-between items-center">
                              <span className="text-blue-600 dark:text-blue-400 font-medium">📈 Reservas/Ano:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{data.bookings_this_year}</span>
                            </div>
                          )}
                          {data.avg_price && (
                            <div className="flex justify-between items-center">
                              <span className="text-purple-600 dark:text-purple-400 font-medium">💰 Preço Médio:</span>
                              <span className="font-bold text-slate-800 dark:text-white">R$ {data.avg_price.toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                          {data.satisfaction && (
                            <div className="flex justify-between items-center">
                              <span className="text-orange-600 dark:text-orange-400 font-medium">⭐ Satisfação:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{data.satisfaction}/5.0</span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-green-200 dark:border-green-700 space-y-1">
                            {data.growth !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">📊 Crescimento:</span>
                                <span className={`font-bold ${(data.growth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(data.growth || 0) > 0 ? '+' : ''}{data.growth || 0}%
                                </span>
                              </div>
                            )}
                            {data.eco_score && (
                              <div className="flex justify-between items-center">
                                <span className="text-teal-600 dark:text-teal-400 font-medium">🌍 Eco Score:</span>
                                <span className={`font-bold ${ecoRating.color}`}>{data.eco_score}/100</span>
                              </div>
                            )}
                          </div>
                          {data.eco_score && (
                            <div className="text-center pt-1 border-t border-teal-200 dark:border-teal-700">
                              <span className={`text-xs font-medium ${ecoRating.color}`}>
                                {ecoRating.emoji} {ecoRating.text} Sustentabilidade
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="clients"
                stroke={chartColors.secondary}
                strokeWidth={3}
                fill="url(#destinationGradient)"
                dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: chartColors.secondary, strokeWidth: 3, fill: "white" }}
                name="Popularidade"
              />
              <Line
                type="monotone"
                dataKey="eco_score"
                stroke={chartColors.nature1}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: chartColors.nature1, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartColors.nature1, strokeWidth: 2, fill: "white" }}
                name="Eco Score"
                hide
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Análise de Performance - Enhanced Progress Bars */}
      <Card 
        data-testid="performance-analysis"
        className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-yellow-500/5 to-orange-500/5 dark:from-orange-400/10 dark:via-yellow-400/10 dark:to-orange-400/10 rounded-lg"></div>
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-slate-800 dark:text-white">
            <div className="bg-orange-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <span className="text-lg font-bold">Análise de Performance</span>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Métricas principais</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Taxa de Conversão</span>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 mr-2">68%</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <Progress value={68} className="h-3 bg-slate-200 dark:bg-slate-700" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Satisfação do Cliente</span>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mr-2">92%</span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <Progress value={92} className="h-3 bg-slate-200 dark:bg-slate-700" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Retenção de Clientes</span>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mr-2">84%</span>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <Progress value={84} className="h-3 bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
