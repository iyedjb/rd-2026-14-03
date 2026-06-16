import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface DepartmentListProps {
  onAdd: () => void;
  onEdit: (department: Department) => void;
}

export function DepartmentList({ onAdd, onEdit }: DepartmentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/departments/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments/active"] });
      toast({
        title: "Departamento excluído",
        description: "O departamento foi excluído com sucesso.",
      });
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir departamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (departmentToDelete) {
      deleteMutation.mutate(departmentToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Gerenciar Departamentos</h3>
            <p className="text-sm text-muted-foreground">
              {departments.length} departamento(s) cadastrado(s)
            </p>
          </div>
          <Button onClick={onAdd} data-testid="button-add-department">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Departamento
          </Button>
        </div>

        {departments.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum departamento cadastrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece adicionando o primeiro departamento da estrutura organizacional.
            </p>
            <Button onClick={onAdd} data-testid="button-add-first-department">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Departamento
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
                data-testid={`department-card-${dept.id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground mb-1" data-testid={`text-dept-name-${dept.id}`}>
                      {dept.name}
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid={`text-dept-description-${dept.id}`}>
                      {dept.description}
                    </p>
                    {dept.responsible && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Responsável:</span> {dept.responsible}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Ordem: {dept.order} | Status: {dept.is_active ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(dept)}
                      data-testid={`button-edit-${dept.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(dept)}
                      data-testid={`button-delete-${dept.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {dept.subsectors && dept.subsectors.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {dept.subsectors.length} subsetor(es)
                    </p>
                    <div className="space-y-1">
                      {dept.subsectors.slice(0, 3).map((sub, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          • {sub.title}
                        </p>
                      ))}
                      {dept.subsectors.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          ... e mais {dept.subsectors.length - 3}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o departamento "{departmentToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
