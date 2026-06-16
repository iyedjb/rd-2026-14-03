import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { InactiveClient, InsertInactiveClient, UpdateInactiveClient, FilterOptions, PaginationInfo } from "@/types";

interface UseInactiveClientsResult {
  inactiveClients: InactiveClient[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: Error | null;
}

export function useInactiveClients(filters: FilterOptions = {}): UseInactiveClientsResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["api/inactive-clients", filters],
    queryFn: async (): Promise<{ inactiveClients: InactiveClient[], pagination: PaginationInfo }> => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch(`/api/inactive-clients?${params.toString()}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch inactive clients');
      
      return response.json();
    },
  });

  return {
    inactiveClients: data?.inactiveClients || [],
    pagination: data?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    },
    isLoading,
    error,
  };
}

export function useCreateInactiveClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientData: InsertInactiveClient) => {
      const response = await apiRequest('POST', '/api/inactive-clients', clientData);
      return response.json();
    },
    onSuccess: (client: InactiveClient) => {
      queryClient.invalidateQueries({ queryKey: ["api/inactive-clients"] });
      toast({
        title: "Cliente inativo criado com sucesso!",
        description: `${client.first_name} ${client.last_name} foi adicionado.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente inativo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInactiveClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInactiveClient }) => {
      await apiRequest('PUT', `/api/inactive-clients/${id}`, data);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api/inactive-clients"] });
      toast({
        title: "Cliente inativo atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente inativo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInactiveClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest('DELETE', `/api/inactive-clients/${clientId}`);
      return clientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api/inactive-clients"] });
      toast({
        title: "Cliente inativo excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente inativo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
