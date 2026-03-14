import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ProspectFilters } from "@/components/prospects/prospect-filters";
import { ProspectList } from "@/components/prospects/prospect-list";
import { useProspects, useDeleteProspect, useConvertProspectToClient } from "@/hooks/use-prospects";
import { useTutorial } from "@/contexts/TutorialContext";
import { TutorialHighlight } from "@/components/tutorial/TutorialHighlight";
import type { FilterOptions, Prospect } from "@/types";

export default function Prospects() {
  const [, setLocation] = useLocation();
  const { completeTutorialStep } = useTutorial();
  const [filters, setFilters] = useState<FilterOptions>({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
  });
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);

  const { prospects, pagination, isLoading } = useProspects(filters);
  const deleteProspect = useDeleteProspect();
  const convertProspectToClient = useConvertProspectToClient();

  const handleEdit = (prospect: Prospect) => {
    setLocation(`/prospects/${prospect.id}/edit`);
  };

  const handleDelete = (prospectId: string) => {
    deleteProspect.mutate(prospectId);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters({ ...newFilters, page: 1 });
  };

  // Clear selections when prospects change (pagination/filtering)
  useEffect(() => {
    const visibleProspectIds = prospects.map(p => p.id);
    setSelectedProspects(prev => prev.filter(id => visibleProspectIds.includes(id)));
  }, [prospects]);

  const handleSelectProspect = (prospectId: string, selected: boolean) => {
    if (selected) {
      setSelectedProspects(prev => [...prev, prospectId]);
    } else {
      setSelectedProspects(prev => prev.filter(id => id !== prospectId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    const visibleProspectIds = prospects.map(p => p.id);
    if (selected) {
      // Add all visible prospects to selection (keeping existing selections from other pages)
      setSelectedProspects(prev => {
        const newSelections = visibleProspectIds.filter(id => !prev.includes(id));
        return [...prev, ...newSelections];
      });
    } else {
      // Remove all visible prospects from selection
      setSelectedProspects(prev => prev.filter(id => !visibleProspectIds.includes(id)));
    }
  };

  const handleBulkMoveToClients = () => {
    // Only operate on currently visible selected prospects
    const visibleSelectedProspects = selectedProspects.filter(id => 
      prospects.some(p => p.id === id)
    );
    visibleSelectedProspects.forEach(prospectId => {
      convertProspectToClient.mutate(prospectId);
    });
    // Remove only the operated prospects from selection
    setSelectedProspects(prev => prev.filter(id => !visibleSelectedProspects.includes(id)));
  };

  const handleBulkDelete = () => {
    // Only operate on currently visible selected prospects
    const visibleSelectedProspects = selectedProspects.filter(id => 
      prospects.some(p => p.id === id)
    );
    visibleSelectedProspects.forEach(prospectId => {
      deleteProspect.mutate(prospectId);
    });
    // Remove only the operated prospects from selection
    setSelectedProspects(prev => prev.filter(id => !visibleSelectedProspects.includes(id)));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold">Clientes Cadastrados</h2>
          <p className="text-muted-foreground">
            Cadastre novos clientes e gerencie suas informações
          </p>
        </div>
        <TutorialHighlight
          stepId="add-prospect"
          message="👋 Clique aqui para adicionar seu primeiro prospecto!"
          position="bottom"
        >
          <Button 
            onClick={() => setLocation("/prospects/new")} 
            data-testid="button-new-prospect"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cadastro
          </Button>
        </TutorialHighlight>
      </div>
      <ProspectFilters filters={filters} onFiltersChange={handleFiltersChange} />
      <ProspectList
        prospects={prospects}
        pagination={pagination}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        selectedProspects={selectedProspects}
        onSelectProspect={handleSelectProspect}
        onSelectAll={handleSelectAll}
        onBulkMoveToClients={handleBulkMoveToClients}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}