import { Search, MapPin, Filter, ArrowUpDown, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDestinations } from "@/hooks/use-destinations";
import type { FilterOptions } from "@/types";

interface ClientFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const { data: destinations, isLoading: destinationsLoading } = useDestinations();

  return (
    <Card className="neo-extruded border-none rounded-[24px]">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-semibold flex items-center gap-2">
              <div className="relative neo-inset-deep text-primary h-6 w-6 rounded-md flex items-center justify-center">
                <Search className="h-3.5 w-3.5" />
              </div>
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                data-testid="input-search"
                type="text"
                placeholder="Nome, destino..."
                className="pl-10 h-11 neo-inset border-none focus-visible:ring-primary"
                value={filters.search || ''}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-semibold flex items-center gap-2">
              <div className="relative neo-inset-deep text-primary h-6 w-6 rounded-md flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              Destino
            </Label>
            <Select
              value={filters.destination || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, destination: value === 'all' ? undefined : value })}
              disabled={destinationsLoading}
            >
              <SelectTrigger data-testid="select-destination" className="h-11 neo-inset border-none focus:ring-primary">
                <SelectValue placeholder="Todos os destinos" />
              </SelectTrigger>
              <SelectContent className="neo-extruded border-none rounded-xl">
                <SelectItem value="all">Todos os destinos</SelectItem>
                {destinations?.map((dest) => (
                  <SelectItem key={dest.id} value={dest.name}>
                    {dest.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-semibold flex items-center gap-2">
              <div className="relative neo-inset-deep text-primary h-6 w-6 rounded-md flex items-center justify-center">
                <Filter className="h-3.5 w-3.5" />
              </div>
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger data-testid="select-status" className="h-11 neo-inset border-none focus:ring-primary">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="neo-extruded border-none rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client-type" className="text-sm font-semibold flex items-center gap-2">
              <div className="relative neo-inset-deep text-primary h-6 w-6 rounded-md flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              Tipo de Cliente
            </Label>
            <Select
              value={filters.client_type || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, client_type: value === 'all' ? undefined : value as 'agencia' | 'operadora' })}
            >
              <SelectTrigger data-testid="select-client-type" className="h-11 neo-inset border-none focus:ring-primary">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="neo-extruded border-none rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="agencia">Destinos da Agência</SelectItem>
                <SelectItem value="operadora">Operadoras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sortBy" className="text-sm font-semibold flex items-center gap-2">
              <div className="relative neo-inset-deep text-primary h-6 w-6 rounded-md flex items-center justify-center">
                <ArrowUpDown className="h-3.5 w-3.5" />
              </div>
              Ordenar por
            </Label>
            <Select
              value={filters.sortBy || 'name'}
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as FilterOptions['sortBy'] })}
            >
              <SelectTrigger data-testid="select-sort" className="h-11 neo-inset border-none focus:ring-primary">
                <SelectValue placeholder="Nome" />
              </SelectTrigger>
              <SelectContent className="neo-extruded border-none rounded-xl">
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="travel_date">Data da Viagem</SelectItem>
                <SelectItem value="created_at">Data de Cadastro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
