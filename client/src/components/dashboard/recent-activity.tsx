import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar, MapPin, TrendingUp, FileText, UserPlus, CheckCircle } from "lucide-react";
import { useRecentActivities } from "@/hooks/use-reports";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RecentActivity() {
  const { data: activities = [], isLoading } = useRecentActivities(10);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "client_created":
        return UserPlus;
      case "client_updated":
        return User;
      case "prospect_created":
        return FileText;
      case "prospect_converted":
        return CheckCircle;
      default:
        return TrendingUp;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case "client_created":
        return "green";
      case "client_updated":
        return "blue";
      case "prospect_created":
        return "orange";
      case "prospect_converted":
        return "purple";
      default:
        return "gray";
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.action) {
      case "client_created":
        return "Novo cliente cadastrado";
      case "client_updated":
        return "Cliente atualizado";
      case "prospect_created":
        return "Novo prospect criado";
      case "prospect_converted":
        return "Prospect convertido em cliente";
      default:
        return activity.action;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
      case "purple":
        return "bg-purple-500/20 text-purple-600 dark:text-purple-400";
      case "green":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "orange":
        return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
      default:
        return "bg-gray-500/20 text-gray-600 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Card className="group hover:shadow-2xl transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
        <CardHeader className="relative pb-4">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent className="relative pt-2">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2"></div>
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
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-emerald-500/5 dark:from-emerald-400/10 dark:via-teal-400/10 dark:to-emerald-400/10 rounded-lg"></div>
      
      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center text-slate-800 dark:text-white">
          <div className="bg-emerald-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <span className="text-lg lg:text-xl font-bold">Atividade Recente</span>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Últimas ações do sistema</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative pt-2">
        {activities.length === 0 ? (
          <div className="text-center py-1 text-slate-500 dark:text-slate-400">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.action);
              const color = getActivityColor(activity.action);
              const description = getActivityDescription(activity);
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200"
                  data-testid={`activity-${activity.action}-${activity.id}`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getColorClasses(color)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">
                      {description}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                      {activity.client_name || activity.prospect_name || activity.details}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </Badge>
                      {activity.user_email && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          por {activity.user_email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activities.length > 0 && (
          <div className="mt-1 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando últimas {activities.length} atividades
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
