import { Plus, Edit, Trash2, Bus as BusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useBuses, useDeleteBus } from "@/hooks/use-buses";
import { type Bus } from "@shared/schema";

interface BusListProps {
  onEdit: (bus: Bus) => void;
  onAdd: () => void;
}

export function BusList({ onEdit, onAdd }: BusListProps) {
  const { data: buses = [], isLoading } = useBuses();
  const deleteMutation = useDeleteBus();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando ônibus...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ônibus Disponíveis</CardTitle>
        <Button onClick={onAdd} data-testid="button-add-bus">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Ônibus
        </Button>
      </CardHeader>
      <CardContent>
        {buses.length === 0 ? (
          <div className="text-center py-1 text-muted-foreground">
            Nenhum ônibus cadastrado. Clique em "Adicionar Ônibus" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Total de Assentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buses.map((bus) => (
                <TableRow key={bus.id} data-testid={`row-bus-${bus.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <BusIcon className="h-4 w-4 text-muted-foreground" />
                      {bus.name}
                    </div>
                  </TableCell>
                  <TableCell>{bus.type}</TableCell>
                  <TableCell>{bus.total_seats} assentos</TableCell>
                  <TableCell>
                    {bus.is_active ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(bus)}
                        data-testid={`button-edit-bus-${bus.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-delete-bus-${bus.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este ônibus? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(bus.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
