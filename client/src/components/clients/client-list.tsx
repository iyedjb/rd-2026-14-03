import { Eye, Edit, Trash2, ChevronLeft, ChevronRight, Bus, AlertTriangle, CheckCircle, Phone, Mail, MapPin, Calendar, MoreHorizontal, XCircle, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatCPF } from "@/lib/validation";
import type { Client, PaginationInfo } from "@/types";

interface ClientListProps {
  clients: Client[];
  pagination: PaginationInfo;
  isLoading?: boolean;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onPageChange: (page: number) => void;
  onNewTrip?: (client: Client) => void;
  onCancel?: (client: Client) => void;
}

export function getClientDataQuality(client: Client): { status: 'complete' | 'incomplete'; missingFields: string[] } {
  const requiredMissingFields: string[] = [];
  
  const isEmpty = (val: any) => !val || (typeof val === 'string' && val.trim() === '');
  
  if (isEmpty(client.cpf) || client.cpf === '00000000' || client.cpf === '000.000.000-00') requiredMissingFields.push('CPF');
  if (isEmpty(client.birthdate)) requiredMissingFields.push('Data Nascimento');
  if (isEmpty(client.destination)) requiredMissingFields.push('Destino');
  if (isEmpty(client.phone)) requiredMissingFields.push('Telefone');
  if (isEmpty(client.address)) requiredMissingFields.push('Endereço');
  
  if (requiredMissingFields.length === 0) {
    return { status: 'complete', missingFields: [] };
  } else {
    return { status: 'incomplete', missingFields: requiredMissingFields };
  }
}

const avatarGradients = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
];

function getAvatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarGradients[hash % avatarGradients.length];
}

export function ClientList({
  clients,
  pagination,
  isLoading,
  onEdit,
  onDelete,
  onPageChange,
  onNewTrip,
  onCancel,
}: ClientListProps) {
  const { userRole } = useAuth();
  
  const getStatusBadge = (client: Client) => {
    if ((client as any).is_deleted) {
      const permanentDeleteAt = (client as any).permanent_delete_at;
      let daysRemaining = 0;
      if (permanentDeleteAt) {
        const deleteDate = new Date(permanentDeleteAt);
        const now = new Date();
        daysRemaining = Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
          <Trash2 className="w-3 h-3" />
          Excluído {daysRemaining > 0 ? `(${daysRemaining} dias)` : ''}
        </span>
      );
    }
    if ((client as any).is_cancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold">
          <XCircle className="w-3 h-3" />
          Cancelado
        </span>
      );
    }
    
    const now = new Date();
    const travelDate = client.travel_date;
    
    if (!travelDate) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          Sem Data
        </span>
      );
    }
    
    const travelDateObj = typeof travelDate === 'string' ? new Date(travelDate) : travelDate;
    
    if (isNaN(travelDateObj.getTime())) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          Inválida
        </span>
      );
    }
    
    if (travelDateObj < now) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Embarcado
        </span>
      );
    } else if (travelDateObj.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Pendente
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Confirmado
        </span>
      );
    }
  };

  const getDataQualityIndicator = (client: Client) => {
    const { status, missingFields } = getClientDataQuality(client);
    
    if (status === 'complete') {
      return (
        <div 
          title="Todos os dados completos"
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900"
        >
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      );
    } else {
      return (
        <div 
          title={`Faltam: ${missingFields.join(', ')}`}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900 cursor-help"
        >
          <AlertTriangle className="h-3 w-3 text-white" />
        </div>
      );
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '??';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className="relative neo-extruded rounded-[24px] p-6 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 bg-muted rounded-lg"></div>
                <div className="h-4 w-32 bg-muted rounded-lg"></div>
              </div>
              <div className="h-8 w-24 bg-muted rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="relative neo-extruded rounded-[32px] p-12 text-center overflow-hidden">
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl neo-inset-deep text-primary flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground">Adicione seu primeiro cliente para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <div className="col-span-3">Cliente</div>
        <div className="col-span-3">Contato</div>
        <div className="col-span-2">Destino</div>
        <div className="col-span-2">Viagem</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {/* Client Cards */}
      <div className="space-y-3">
        {clients.map((client, index) => {
          const { status } = getClientDataQuality(client);
          const fullName = `${client.first_name} ${client.last_name}`;
          const isCancelled = (client as any).is_cancelled;
          
          const cardBorderClass = isCancelled
            ? 'border-l-[6px] border-l-slate-400 opacity-60'
            : status === 'complete' 
              ? 'border-l-[6px] border-l-primary' 
              : 'border-l-[6px] border-l-amber-500';
          
          return (
            <div 
              key={client.id}
              data-testid={`client-row-${client.id}`}
              className={`group relative neo-extruded rounded-2xl p-5 lg:p-6 transition-all duration-300 hover:scale-[1.01] overflow-hidden ${cardBorderClass}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              
              <div className="relative">
                {/* Mobile Layout */}
                <div className="lg:hidden space-y-4">
                  {/* Client Info */}
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl neo-inset-deep flex items-center justify-center text-primary font-bold text-lg">
                      {getInitials(client.first_name, client.last_name)}
                      {getDataQualityIndicator(client)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {formatCPF(client.cpf)}
                      </p>
                      {(client as any).matching_companion && !(client as any).matching_companions?.includes((client as any).matching_companion) && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 text-xs font-semibold">
                            <Users className="w-3 h-3" />
                            {(client as any).matching_companion} é acompanhante aqui
                          </span>
                        </div>
                      )}
                      {(client as any).matching_companions && (client as any).matching_companions.length > 0 && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                            <Users className="w-3 h-3" />
                            Acompanhantes: {(client as any).matching_companions.join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="mt-2">
                        {getStatusBadge(client)}
                      </div>
                    </div>
                    
                    {/* Actions Menu - Mobile */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={() => onEdit(client)} className="gap-2 py-3">
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {onNewTrip && (
                          <DropdownMenuItem onClick={() => onNewTrip(client)} className="gap-2 py-3">
                            <Bus className="h-4 w-4" />
                            Nova Viagem
                          </DropdownMenuItem>
                        )}
                        {onCancel && !isCancelled && (
                          <DropdownMenuItem 
                            onClick={() => onCancel(client)} 
                            className="gap-2 py-3 text-orange-600 dark:text-orange-400 focus:text-orange-600"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar Viagem
                          </DropdownMenuItem>
                        )}
                        {userRole === 'vadmin' && (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="gap-2 py-3 text-red-600 dark:text-red-400 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir este cliente e todos os dados relacionados?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDelete(client.id)}
                                    className="bg-red-500 hover:bg-red-600 rounded-xl"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                    {/* Contact & Destination Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Telefone</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{client.phone || '-'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Destino</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{client.destination || '-'}</p>
                    </div>
                    {/* Link & Seat Status Indicators - Mobile */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 col-span-2 flex justify-between items-center">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Link</span>
                        {client.link_opened_at ? (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Aberto
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">Pendente</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poltrona</span>
                        {client.seat_number ? (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Bus className="w-3 h-3" /> {client.seat_number}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">S/ Poltrona</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Grid */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                  {/* Client Info */}
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="relative flex-shrink-0 w-14 h-14 rounded-2xl neo-inset-deep flex items-center justify-center text-primary font-bold text-base">
                      {getInitials(client.first_name, client.last_name)}
                      {getDataQualityIndicator(client)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {formatCPF(client.cpf)}
                      </p>
                      {(client as any).matching_companion && !(client as any).matching_companions?.includes((client as any).matching_companion) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 text-xs font-semibold">
                          <Users className="w-3 h-3" />
                          {(client as any).matching_companion} é acompanhante aqui
                        </span>
                      )}
                      {(client as any).matching_companions && (client as any).matching_companions.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                          <Users className="w-3 h-3" />
                          Acompanhantes: {(client as any).matching_companions.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Contact */}
                  <div className="col-span-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{client.phone || '-'}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 truncate text-xs">{client.email}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Destination */}
                  <div className="col-span-2">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl neo-inset border-none">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">{client.destination || '-'}</p>
                        <p className="text-xs text-muted-foreground">{client.duration} dias</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Travel Date & Status */}
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {client.travel_date ? formatDate(client.travel_date) : '-'}
                      </span>
                    </div>
                    {/* Link & Seat Status Indicators - Desktop */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        {client.link_opened_at ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800" title="Link Aberto">
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Aberto</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700" title="Link Pendente">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendente</span>
                          </div>
                        )}
                        {client.seat_number ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800" title="Poltrona Selecionada">
                            <Bus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{client.seat_number}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800" title="Sem Poltrona">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">S/ P</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(client)}
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-view-${client.id}`}
                      className="h-10 w-10 p-0 rounded-xl hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/50 transition-all hover:scale-110"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onNewTrip && (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-new-trip-${client.id}`}
                        onClick={() => onNewTrip(client)}
                        className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/50 transition-all hover:scale-110"
                        title="Nova Viagem"
                      >
                        <Bus className="h-4 w-4" />
                      </Button>
                    )}
                    {onCancel && !isCancelled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-cancel-${client.id}`}
                        onClick={() => onCancel(client)}
                        className="h-10 w-10 p-0 rounded-xl hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/50 transition-all hover:scale-110"
                        title="Cancelar Viagem"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-edit-${client.id}`}
                      onClick={() => onEdit(client)}
                      className="h-10 w-10 p-0 rounded-xl hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/50 transition-all hover:scale-110"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {userRole === 'vadmin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-delete-${client.id}`}
                            className="h-10 w-10 p-0 rounded-xl hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 transition-all hover:scale-110"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este cliente e todos os dados relacionados?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(client.id)}
                              className="bg-red-500 hover:bg-red-600 rounded-xl"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="relative neo-extruded rounded-2xl p-5 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Mostrando <span className="font-bold text-primary">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> a{' '}
              <span className="font-bold text-primary">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> de{' '}
              <span className="font-bold text-foreground">{pagination.totalItems}</span> clientes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                data-testid="button-prev-page"
                className="h-10 px-3 rounded-xl neo-btn border-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === pagination.currentPage;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant="ghost"
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                      className={isActive 
                        ? "h-10 w-10 rounded-xl neo-inset text-primary font-bold hover:bg-transparent" 
                        : "h-10 w-10 rounded-xl neo-btn font-semibold"
                      }
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                data-testid="button-next-page"
                className="h-10 px-3 rounded-xl neo-btn border-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Show total count when all clients are displayed */}
      {pagination.totalPages <= 1 && clients.length > 0 && (
        <div className="relative neo-extruded rounded-2xl p-5 mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full neo-inset">
              <span className="font-bold text-primary">{pagination.totalItems}</span>
              <span className="text-primary">clientes</span>
            </span>
            exibidos
          </div>
        </div>
      )}
    </div>
  );
}
