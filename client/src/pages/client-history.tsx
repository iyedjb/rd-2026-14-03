import { History, Search, User, MapPin, Calendar, Clock, AlertCircle, TrendingUp, Baby, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useClients } from "@/hooks/use-clients";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProtectedMoney } from "@/components/ui/protected-money";
import { formatCurrency } from "@/lib/utils";

export default function ClientHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const { clients, isLoading } = useClients({ limit: 1000 });

  const filteredClients = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    
    // Group by CPF first, then by name if CPF is missing
    const grouped = clients.reduce((acc, client) => {
      const nameKey = `${client.first_name?.trim().toLowerCase()}-${client.last_name?.trim().toLowerCase()}`;
      const birthdateKey = client.birthdate ? new Date(client.birthdate).toISOString().split('T')[0] : 'no-birthdate';
      
      // Use CPF as primary key, fallback to name+birthdate for grouping
      const key = client.cpf ? client.cpf.trim() : `${nameKey}-${birthdateKey}`;
      
      if (!acc[key]) {
        acc[key] = {
          ...client,
          all_destinations: [],
          total_spent: 0
        };
      }
      
      const destinationInfo = {
        name: client.destination || "Sem destino",
        date: client.travel_date,
        price: (client.travel_price || 0) + (client.brinde_value || 0),
        status: client.approval_status,
        cancellationReason: client.cancellation_reason
      };
      
      acc[key].all_destinations.push(destinationInfo);
      
      // Only add to total spent if not cancelled
      if ((client as any).approval_status !== 'cancelled') {
        acc[key].total_spent += destinationInfo.price;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).filter(client => 
      (client.first_name + " " + client.last_name).toLowerCase().includes(searchTermLower) ||
      (client.cpf && client.cpf.includes(searchTerm)) ||
      (client.phone && client.phone.includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchTermLower)) ||
      client.all_destinations.some((d: any) => d.name.toLowerCase().includes(searchTermLower))
    );
  }, [clients, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Histórico de Clientes
          </h2>
          <p className="text-muted-foreground">Detalhes completos de viagens e pagamentos dos clientes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              Filtrar Histórico
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, telefone, e-mail ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            return (
              <Card key={client.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{client.first_name} {client.last_name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Baby className="h-3 w-3" />
                          <span>{client.birthdate ? format(new Date(client.birthdate), "dd/MM/yyyy") : "Nascimento não informado"}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Investimento Efetivo</p>
                      <div className="text-lg font-black text-emerald-600">
                        <ProtectedMoney amount={client.total_spent} formatted={formatCurrency(client.total_spent)} />
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                        <MapPin className="h-4 w-4" />
                        Histórico de Viagens ({client.all_destinations.length})
                      </h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {client.all_destinations
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((dest: any, idx: number) => (
                          <div key={idx} className={`flex items-start justify-between p-3 rounded-xl border ${dest.status === 'cancelled' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800 opacity-80' : 'bg-muted/50 border-border'}`}>
                            <div className="flex items-start gap-3">
                              <Calendar className={`h-4 w-4 mt-1 ${dest.status === 'cancelled' ? 'text-red-500' : 'text-primary'}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className={`font-bold text-sm ${dest.status === 'cancelled' ? 'text-red-700 dark:text-red-400 line-through' : ''}`}>{dest.name}</p>
                                  {dest.status === 'cancelled' && <Badge variant="destructive" className="h-4 text-[10px] px-1 uppercase">Cancelado</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {dest.date ? format(new Date(dest.date), "dd/MM/yyyy") : "Data não definida"}
                                </p>
                                {dest.cancellationReason && (
                                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 italic leading-tight bg-white/50 dark:bg-black/20 p-1.5 rounded-md border border-red-100 dark:border-red-900/30">
                                    <strong>Motivo do Cancelamento:</strong> {dest.cancellationReason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className={`text-xs font-bold ${dest.status === 'cancelled' ? 'text-red-400 line-through' : 'text-emerald-600'}`}>
                              <ProtectedMoney amount={dest.price} formatted={formatCurrency(dest.price)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                        <TrendingUp className="h-4 w-4" />
                        Resumo Geral
                      </h4>
                      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total de Viagens:</span>
                          <span className="font-bold">{client.all_destinations.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Viagens Canceladas:</span>
                          <span className="font-bold text-red-500">{client.all_destinations.filter((d: any) => d.status === 'cancelled').length}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">CPF:</span>
                          <span className="font-mono text-xs">{client.cpf || "Não informado"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {client.client_preferences && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="text-sm font-black text-muted-foreground mb-3 uppercase tracking-wider">Observações do Cliente</h4>
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl text-sm italic border border-blue-100 dark:border-blue-800 text-slate-700 dark:text-slate-300">
                        {client.client_preferences}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">Não encontramos clientes ativos com os filtros selecionados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
