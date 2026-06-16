import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { Prospect, InsertProspect, UpdateProspect, Client, FilterOptions, PaginationInfo } from "@/types";

interface UseProspectsResult {
  prospects: Prospect[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: Error | null;
}

export function useProspects(filters: FilterOptions = {}): UseProspectsResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["api/prospects", filters],
    queryFn: async (): Promise<{ prospects: Prospect[], pagination: PaginationInfo }> => {
      // Build query parameters for server-side filtering and pagination
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.status) params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.showIncomplete) params.append('showIncomplete', 'true');
      
      // Get Firebase token for authentication
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch(`/api/prospects?${params.toString()}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch prospects');
      
      const result = await response.json();
      
      // The API now returns the expected format directly
      return {
        prospects: result.prospects,
        pagination: result.pagination
      };
    },
  });

  return {
    prospects: data?.prospects || [],
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

export function useCreateProspect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prospectData: InsertProspect) => {
      const response = await apiRequest('POST', '/api/prospects', prospectData);
      return response.json();
    },
    onSuccess: (prospect: Prospect) => {
      queryClient.invalidateQueries({ queryKey: ["api/prospects"] });
      toast({
        title: "Prospecto criado com sucesso!",
        description: `Cotação enviada para ${prospect.first_name} ${prospect.last_name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar prospecto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: UpdateProspect
    }) => {
      await apiRequest('PUT', `/api/prospects/${id}`, data);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api/prospects"] });
      toast({
        title: "Prospecto atualizado com sucesso!",
        description: "As informações do prospecto foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar prospecto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      await apiRequest('DELETE', `/api/prospects/${prospectId}`);
      return prospectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api/prospects"] });
      toast({
        title: "Prospecto excluído com sucesso!",
        description: "O prospecto foi removido do sistema.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir prospecto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useProspect(prospectId: string) {
  return useQuery({
    queryKey: ["api/prospects", prospectId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const response = await fetch(`/api/prospects/${prospectId}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Prospecto não encontrado");
      }
      return response.json();
    },
    enabled: !!prospectId,
  });
}

// Quote-specific hooks
export function useQuote(token: string) {
  return useQuery({
    queryKey: ["api/quote", token],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const authToken = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${authToken}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const response = await fetch(`/api/quote/${token}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Cotação não encontrada");
      }
      return response.json();
    },
    enabled: !!token,
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      token, 
      status 
    }: { 
      token: string; 
      status: 'viewed' | 'accepted' | 'rejected' 
    }) => {
      const response = await apiRequest('POST', `/api/quote/${token}/status`, { status });
      return response.json();
    },
    onSuccess: (prospect: Prospect, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["api/quote"] });
      queryClient.invalidateQueries({ queryKey: ["api/prospects"] });
      
      const statusMessages = {
        viewed: "Cotação visualizada",
        accepted: "Cotação aceita pelo cliente!",
        rejected: "Cotação rejeitada pelo cliente"
      };
      
      toast({
        title: statusMessages[status],
        description: `Status da cotação de ${prospect.first_name} ${prospect.last_name} atualizado.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status da cotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConvertProspectToClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      const response = await apiRequest('POST', `/api/prospects/${prospectId}/convert`);
      return response.json();
    },
    onSuccess: (result: { prospect: Prospect; client: Client }) => {
      queryClient.invalidateQueries({ queryKey: ["api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      
      toast({
        title: "Prospecto convertido com sucesso!",
        description: `${result.client.first_name} ${result.client.last_name} foi adicionado como cliente.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao converter prospecto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}