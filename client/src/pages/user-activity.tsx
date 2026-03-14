import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Users, Filter, TrendingUp, Search, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Activity {
  id: string;
  action: string;
  user_id: string;
  user_email: string;
  client_id?: string;
  client_name?: string;
  client_created_at?: string;
  details: string;
  created_at: string;
  created_at_ms: number;
}

interface TopCreator {
  user_email: string;
  count: number;
  user_id: string;
}

export default function UserActivity() {
  const [timeFilter, setTimeFilter] = useState<string>("7d");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [clientNameSearch, setClientNameSearch] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  // Calculate time filter in milliseconds
  const getTimeFilterMs = (filter: string) => {
    const now = Date.now();
    switch (filter) {
      case "1d": return now - (24 * 60 * 60 * 1000);
      case "7d": return now - (7 * 24 * 60 * 60 * 1000);
      case "30d": return now - (30 * 24 * 60 * 60 * 1000);
      case "90d": return now - (90 * 24 * 60 * 60 * 1000);
      default: return undefined;
    }
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    // If specific date is selected, use it; otherwise use time filter
    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      params.append("from", startOfDay.getTime().toString());
      params.append("to", endOfDay.getTime().toString());
    } else {
      const fromMs = getTimeFilterMs(timeFilter);
      if (fromMs) params.append("from", fromMs.toString());
    }
    
    if (userFilter !== "all") params.append("userEmail", userFilter);
    if (clientNameSearch.trim()) params.append("clientName", clientNameSearch.trim());
    params.append("limit", "100");
    return params.toString();
  };

  const buildTopCreatorsParams = () => {
    const params = new URLSearchParams();
    const fromMs = getTimeFilterMs(timeFilter);
    if (fromMs) params.append("from", fromMs.toString());
    params.append("limit", "10");
    return params.toString();
  };

  // Fetch activities
  const {
    data: activities = [],
    isLoading: activitiesLoading,
    error: activitiesError
  } = useQuery<Activity[]>({
    queryKey: ['/api/activities', timeFilter, userFilter, clientNameSearch, dateFilter?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/activities?${buildQueryParams()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await (await import('@/lib/firebase')).auth.currentUser?.getIdToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
  });

  // Fetch top creators
  const {
    data: topCreators = [],
    isLoading: creatorsLoading,
    error: creatorsError
  } = useQuery<TopCreator[]>({
    queryKey: ['/api/activities/top-creators', timeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/activities/top-creators?${buildTopCreatorsParams()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await (await import('@/lib/firebase')).auth.currentUser?.getIdToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch top creators');
      return res.json();
    },
  });

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(activities.map(a => a.user_email)));

  const getActionColor = (action: string) => {
    switch (action) {
      case "client_created": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "client_updated": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "prospect_created": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "client_created": return "Cliente Criado";
      case "client_updated": return "Cliente Atualizado";
      case "prospect_created": return "Prospect Criado";
      default: return action;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividade dos Usuários</h1>
          <p className="text-muted-foreground">
            Acompanhe as ações dos usuários e estatísticas de criação de clientes
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={clientNameSearch}
              onChange={(e) => setClientNameSearch(e.target.value)}
              className="pl-9"
              data-testid="input-client-search"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[200px] justify-start text-left font-normal",
                  !dateFilter && "text-muted-foreground"
                )}
                data-testid="button-date-filter"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
                locale={ptBR}
                data-testid="calendar-date-filter"
              />
            </PopoverContent>
          </Popover>

          {dateFilter && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDateFilter(undefined)}
              data-testid="button-clear-date"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Select 
            value={dateFilter ? "custom" : timeFilter} 
            onValueChange={(value) => {
              if (value !== "custom") {
                setTimeFilter(value);
                setDateFilter(undefined);
              }
            }} 
            data-testid="select-time-filter"
            disabled={!!dateFilter}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter} data-testid="select-user-filter">
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Creators */}
        <Card data-testid="card-top-creators">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Criadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creatorsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                ))}
              </div>
            ) : creatorsError ? (
              <p className="text-sm text-destructive" data-testid="text-creators-error">
                Erro ao carregar criadores
              </p>
            ) : topCreators.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-creators">
                Nenhum criador encontrado no período selecionado
              </p>
            ) : (
              <div className="space-y-3">
                {topCreators.map((creator, index) => (
                  <div key={creator.user_id} className="flex items-center justify-between" data-testid={`creator-item-${index}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{creator.user_email}</span>
                    </div>
                    <Badge variant="secondary" data-testid={`creator-count-${index}`}>
                      {creator.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card data-testid="card-summary-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Atividades</span>
                <span className="text-lg font-semibold" data-testid="text-total-activities">
                  {activitiesLoading ? "..." : activities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Clientes Criados</span>
                <span className="text-lg font-semibold" data-testid="text-clients-created">
                  {activitiesLoading ? "..." : activities.filter(a => a.action === "client_created").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Clientes Atualizados</span>
                <span className="text-lg font-semibold" data-testid="text-clients-updated">
                  {activitiesLoading ? "..." : activities.filter(a => a.action === "client_updated").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Usuários Ativos</span>
                <span className="text-lg font-semibold" data-testid="text-active-users">
                  {activitiesLoading ? "..." : uniqueUsers.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card data-testid="card-recent-activities">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-6 w-20" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : activitiesError ? (
            <p className="text-sm text-destructive" data-testid="text-activities-error">
              Erro ao carregar atividades
            </p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-activities">
              Nenhuma atividade encontrada no período selecionado
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`activity-item-${activity.id}`}>
                  <Badge className={getActionColor(activity.action)} data-testid={`activity-badge-${activity.id}`}>
                    {getActionLabel(activity.action)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`activity-details-${activity.id}`}>
                      {activity.details}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-muted-foreground" data-testid={`activity-user-${activity.id}`}>
                        {activity.user_email}
                      </p>
                      {activity.client_created_at && (
                        <p className="text-xs text-muted-foreground" data-testid={`activity-client-created-${activity.id}`}>
                          Cliente criado em: {format(new Date(activity.client_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <time 
                      className="text-xs text-muted-foreground whitespace-nowrap" 
                      dateTime={activity.created_at}
                      data-testid={`activity-time-${activity.id}`}
                    >
                      {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </time>
                    <p className="text-xs text-muted-foreground">Ação registrada</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}