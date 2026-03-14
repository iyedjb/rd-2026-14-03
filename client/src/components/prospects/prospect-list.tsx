import { Edit, Trash2, ChevronLeft, ChevronRight, UserPlus, Users, Trash2 as BulkTrash, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/validation";
import { useLocation } from "wouter";
import type { Prospect, PaginationInfo } from "@/types";

interface ProspectListProps {
  prospects: Prospect[];
  pagination: PaginationInfo;
  isLoading?: boolean;
  onEdit: (prospect: Prospect) => void;
  onDelete: (prospectId: string) => void;
  onPageChange: (page: number) => void;
  selectedProspects: string[];
  onSelectProspect: (prospectId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onBulkMoveToClients: () => void;
  onBulkDelete: () => void;
}

export function ProspectList({
  prospects,
  pagination,
  isLoading,
  onEdit,
  onDelete,
  onPageChange,
  selectedProspects,
  onSelectProspect,
  onSelectAll,
  onBulkMoveToClients,
  onBulkDelete,
}: ProspectListProps) {
  const [, setLocation] = useLocation();

  const getStatusBadge = (prospect: Prospect) => {
    // If prospect was created from an existing client, show "Cliente" badge
    if (prospect.from_client_id) {
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl px-3 py-1">Cliente</Badge>;
    }
    
    const statusConfig = {
      novo: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", text: "Novo" },
      em_contato: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", text: "Em Contato" },
      convertido: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", text: "Convertido" },
    };

    const config = statusConfig[prospect.status] || statusConfig.novo;
    return <Badge className={`${config.className} rounded-xl px-3 py-1`}>{config.text}</Badge>;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleConvertToClient = (prospect: Prospect) => {
    sessionStorage.setItem('prefilledClient', JSON.stringify({
      first_name: prospect.first_name,
      last_name: prospect.last_name,
      cpf: prospect.cpf,
      rg: prospect.rg,
      birthdate: prospect.birthdate,
      civil_status: prospect.civil_status,
      spouse_name: prospect.spouse_name,
      nationality: prospect.nationality,
      gender: prospect.gender,
      phone: prospect.phone,
      phone_numbers: prospect.phone_numbers,
      email: prospect.email,
      profession: prospect.profession,
      address: prospect.address,
      city: prospect.city,
      state: prospect.state,
      postal_code: prospect.postal_code,
    }));
    setLocation("/clients/new");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="rounded-3xl animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum cadastro encontrado
          </h3>
          <p className="text-muted-foreground">
            Clique em "Novo Prospecto" para adicionar seu primeiro cliente interessado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleSelectedCount = prospects.filter(p => selectedProspects.includes(p.id)).length;
  const isAllSelected = prospects.length > 0 && visibleSelectedCount === prospects.length;
  const isPartiallySelected = visibleSelectedCount > 0 && visibleSelectedCount < prospects.length;
  const hasSelectedProspects = visibleSelectedCount > 0;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {hasSelectedProspects && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900 flex items-center justify-between">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {visibleSelectedCount} cadastro(s) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkMoveToClients}
              className="rounded-xl"
              data-testid="button-bulk-move-to-clients"
            >
              <Users className="h-4 w-4 mr-2" />
              Converter em Clientes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkDelete}
              className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="button-bulk-delete"
            >
              <BulkTrash className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Select All */}
      <div className="flex items-center gap-2 px-2">
        <Checkbox
          checked={isAllSelected ? true : isPartiallySelected ? "indeterminate" : false}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          data-testid="checkbox-select-all-prospects"
        />
        <span className="text-sm text-muted-foreground">Selecionar todos</span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prospects.map((prospect) => (
          <Card 
            key={prospect.id} 
            className={`rounded-3xl overflow-hidden transition-all hover:shadow-lg border-2 ${
              selectedProspects.includes(prospect.id) 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }`}
            data-testid={`card-prospect-${prospect.id}`}
          >
            <CardContent className="p-0">
              {/* Header with Avatar and Status */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedProspects.includes(prospect.id)}
                      onCheckedChange={(checked) => onSelectProspect(prospect.id, !!checked)}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                      data-testid={`checkbox-select-prospect-${prospect.id}`}
                    />
                    <Avatar className="h-12 w-12 border-2 border-white/50">
                      <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                        {getInitials(prospect.first_name, prospect.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {getStatusBadge(prospect)}
                </div>
                <h3 className="text-white font-bold text-lg mt-3" data-testid={`text-prospect-name-${prospect.id}`}>
                  {prospect.first_name} {prospect.last_name}
                </h3>
              </div>

              {/* Contact Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{prospect.phone}</span>
                </div>
                {prospect.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{prospect.email}</span>
                  </div>
                )}
                {prospect.city && prospect.state && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{prospect.city}, {prospect.state}</span>
                  </div>
                )}

                {/* Link Status */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Link Aberto:</span>
                    {(prospect as any).link_opened_at ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
                        Sim ({formatDate((prospect as any).link_opened_at)})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400">
                        Não
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Poltrona:</span>
                    {(prospect as any).seat_number ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300">
                        Selecionada ({(prospect as any).seat_number})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300">
                        Não selecionada
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Interested Destinations */}
                {prospect.interested_destinations && prospect.interested_destinations.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {prospect.interested_destinations.slice(0, 3).map((dest, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="rounded-xl text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                      >
                        {dest}
                      </Badge>
                    ))}
                    {prospect.interested_destinations.length > 3 && (
                      <Badge variant="outline" className="rounded-xl text-xs">
                        +{prospect.interested_destinations.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Notes preview */}
                {prospect.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {prospect.notes}
                  </p>
                )}

                {/* Created date */}
                <p className="text-xs text-muted-foreground pt-2">
                  Cadastrado em {formatDate(prospect.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                {prospect.status !== 'convertido' && (
                  <Button
                    size="sm"
                    onClick={() => handleConvertToClient(prospect)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    data-testid={`button-convert-prospect-${prospect.id}`}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Criar Contrato
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(prospect)}
                  className="rounded-xl"
                  data-testid={`button-edit-prospect-${prospect.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-prospect-${prospect.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Cadastro</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza de que deseja excluir o cadastro de {prospect.first_name} {prospect.last_name}? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(prospect.id)}
                        className="rounded-xl bg-red-500 text-white hover:bg-red-600"
                        data-testid={`confirm-delete-prospect-${prospect.id}`}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a{' '}
          {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
          {pagination.totalItems} cadastros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="rounded-xl"
            data-testid="button-previous-page-prospects"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm px-3">
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="rounded-xl"
            data-testid="button-next-page-prospects"
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
