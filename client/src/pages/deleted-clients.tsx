import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import { Trash2, RotateCcw, Clock, User, Calendar, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCPF } from "@/lib/validation";
import type { Client } from "@/types";

interface DeletedClient extends Client {
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by_email?: string;
  deleted_by_name?: string;
  permanent_delete_at?: Date;
}

export default function DeletedClients() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/deleted-clients"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/deleted-clients", {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch deleted clients");
      return response.json();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/clients/${clientId}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to restore client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deleted-clients"] });
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      toast({
        title: "Cliente restaurado",
        description: "O cliente foi restaurado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível restaurar o cliente",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/clients/${clientId}/permanent`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to permanently delete client");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deleted-clients"] });
      toast({
        title: "Cliente excluído permanentemente",
        description: "O cliente foi removido definitivamente do sistema",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente permanentemente",
        variant: "destructive",
      });
    },
  });

  const clients: DeletedClient[] = data?.clients || [];

  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(term) ||
      client.last_name?.toLowerCase().includes(term) ||
      client.cpf?.includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  });

  const getDaysUntilPermanentDelete = (permanentDeleteAt: Date | string | undefined) => {
    if (!permanentDeleteAt) return null;
    const deleteDate = new Date(permanentDeleteAt);
    const now = new Date();
    const diffTime = deleteDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || "??";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Clientes Excluídos</h2>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Clientes Excluídos</h2>
            <p className="text-muted-foreground">
              Clientes excluídos permanecem aqui por 30 dias antes de serem removidos permanentemente
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-deleted"
          />
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
              <Trash2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold">Nenhum cliente excluído</h3>
            <p className="text-muted-foreground max-w-md">
              Quando você excluir um cliente, ele aparecerá aqui por 30 dias antes de ser removido permanentemente.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            {filteredClients.length} cliente(s) excluído(s)
          </div>

          {filteredClients.map((client) => {
            const daysRemaining = getDaysUntilPermanentDelete(client.permanent_delete_at);

            return (
              <Card
                key={client.id}
                className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
                data-testid={`deleted-client-${client.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-red-200 dark:ring-red-800">
                        <AvatarFallback className="bg-gradient-to-br from-red-400 to-red-600 text-white font-bold">
                          {getInitials(client.first_name, client.last_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-semibold text-lg">
                          {client.first_name} {client.last_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{formatCPF(client.cpf)}</span>
                          {client.destination && (
                            <>
                              <span>•</span>
                              <span>{client.destination}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {daysRemaining !== null && daysRemaining > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysRemaining} dias restantes
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Será removido em breve
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Excluído por: {client.deleted_by_name || "Desconhecido"}
                        </div>
                        {client.deleted_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Em: {formatDate(client.deleted_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreMutation.mutate(client.id)}
                        disabled={restoreMutation.isPending}
                        className="gap-2"
                        data-testid={`button-restore-${client.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restaurar
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            data-testid={`button-permanent-delete-${client.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir Permanentemente
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O cliente{" "}
                              <strong>
                                {client.first_name} {client.last_name}
                              </strong>{" "}
                              será removido permanentemente do sistema junto com todos os dados associados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => permanentDeleteMutation.mutate(client.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Sim, excluir permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
