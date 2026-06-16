import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ProspectFilters } from "@/components/prospects/prospect-filters";
import { ProspectList } from "@/components/prospects/prospect-list";
import { useInactiveClients, useDeleteInactiveClient } from "@/hooks/use-inactive-clients";
import { useTutorial } from "@/contexts/TutorialContext";
import { TutorialHighlight } from "@/components/tutorial/TutorialHighlight";
import type { FilterOptions } from "@/types";

export default function InactiveClientsPage() {
  const [, setLocation] = useLocation();
  const { completeTutorialStep } = useTutorial();
  const [filters, setFilters] = useState<FilterOptions>({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
  });
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const { inactiveClients, pagination, isLoading } = useInactiveClients(filters);
  const deleteInactiveClient = useDeleteInactiveClient();

  const handleEdit = (client: any) => {
    setLocation(`/inactive-clients/${client.id}/edit`);
  };

  const handleDelete = (clientId: string) => {
    deleteInactiveClient.mutate(clientId);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters({ ...newFilters, page: 1 });
  };

  // Clear selections when clients change (pagination/filtering)
  useEffect(() => {
    const visibleClientIds = inactiveClients.map(p => p.id);
    setSelectedClients(prev => prev.filter(id => visibleClientIds.includes(id)));
  }, [inactiveClients]);

  const handleSelectClient = (clientId: string, selected: boolean) => {
    if (selected) {
      setSelectedClients(prev => [...prev, clientId]);
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    const visibleClientIds = inactiveClients.map(p => p.id);
    if (selected) {
      setSelectedClients(prev => {
        const newSelections = visibleClientIds.filter(id => !prev.includes(id));
        return [...prev, ...newSelections];
      });
    } else {
      setSelectedClients(prev => prev.filter(id => !visibleClientIds.includes(id)));
    }
  };

  const handleBulkDelete = () => {
    const visibleSelectedClients = selectedClients.filter(id => 
      inactiveClients.some(p => p.id === id)
    );
    visibleSelectedClients.forEach(clientId => {
      deleteInactiveClient.mutate(clientId);
    });
    setSelectedClients(prev => prev.filter(id => !visibleSelectedClients.includes(id)));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Clientes Inativos</h2>
          <p className="text-muted-foreground">
            Gerencie clientes que não estão ativos no momento
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/inactive-clients/new")} 
          data-testid="button-new-inactive-client"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Cadastro
        </Button>
      </div>
      <ProspectFilters filters={filters} onFiltersChange={handleFiltersChange} />
      <ProspectList
        prospects={inactiveClients as any}
        pagination={pagination}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        selectedProspects={selectedClients}
        onSelectProspect={handleSelectClient}
        onSelectAll={handleSelectAll}
        onBulkDelete={handleBulkDelete}
        onBulkMoveToClients={() => {}}
      />
    </div>
  );
}
