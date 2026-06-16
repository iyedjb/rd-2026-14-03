import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, CheckCircle2, X, Loader2 } from "lucide-react";
import { useNotifications, useMarkNotificationAsRead } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Notification } from "@shared/schema";

export function NotificationCenter() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
        return <X className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "warning":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "error":
        return "bg-red-500/20 text-red-600 dark:text-red-400";
      default:
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    }
  };

  const handleMarkAsRead = (id: string) => {
    if (!markAsReadMutation.isPending) {
      markAsReadMutation.mutate(id);
    }
  };

  const formatTimestamp = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
    } catch {
      return "Recentemente";
    }
  };

  const mapTypeToStyle = (type: string): "success" | "warning" | "info" | "error" => {
    if (type === "task_completed") return "success";
    if (type === "payment_reminder") return "warning";
    if (type === "task_assigned") return "info";
    return "info";
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/5 dark:from-amber-400/10 dark:via-orange-400/10 dark:to-amber-400/10 rounded-lg"></div>
      
      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center justify-between text-slate-800 dark:text-white">
          <div className="flex items-center">
            <div className="bg-amber-500/20 p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform relative">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </div>
              )}
            </div>
            <div>
              <span className="text-lg lg:text-xl font-bold">Notificações</span>
              <div className="flex items-center mt-1">
                <Info className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {unreadCount} não lidas
                </span>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification: Notification) => {
              const styleType = mapTypeToStyle(notification.type);
              return (
                <div 
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-200 cursor-pointer
                    ${notification.read 
                      ? 'bg-white/30 dark:bg-slate-700/30' 
                      : 'bg-white/60 dark:bg-slate-700/60 ring-2 ring-blue-500/20'
                    } hover:bg-white/80 dark:hover:bg-slate-700/80`}
                  onClick={() => handleMarkAsRead(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${getNotificationColors(styleType)}`}>
                    {getNotificationIcon(styleType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800 dark:text-white text-sm">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                      {notification.message}
                    </p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {formatTimestamp(notification.created_at)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-1 text-center">
          <button 
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
            data-testid="button-view-all-notifications"
          >
            Ver todas as notificações →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}