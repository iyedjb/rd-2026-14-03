import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Destination, InsertDestination } from "@shared/schema";

export function useDestinations() {
  return useQuery({
    queryKey: ['/api/destinations'],
    queryFn: async (): Promise<Destination[]> => {
      const response = await fetch('/api/destinations');
      if (!response.ok) throw new Error('Failed to fetch destinations');
      return response.json();
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - destinations don't change often
  });
}

export function useActiveDestinations() {
  return useQuery({
    queryKey: ['/api/destinations/active'],
    queryFn: async (): Promise<Destination[]> => {
      const response = await fetch('/api/destinations/active');
      if (!response.ok) throw new Error('Failed to fetch active destinations');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data to show latest prices and updates
  });
}

export function useDestination(destinationId: string) {
  return useQuery({
    queryKey: ['/api/destinations', destinationId],
    queryFn: async (): Promise<Destination> => {
      const response = await fetch(`/api/destinations/${destinationId}`);
      if (!response.ok) throw new Error('Failed to fetch destination');
      return response.json();
    },
    enabled: !!destinationId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useCreateDestination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertDestination) => {
      const response = await apiRequest('POST', '/api/destinations', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'], refetchType: 'active' });
      toast({
        title: "Destino criado",
        description: "O novo destino foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o destino.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDestination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDestination> }) => {
      const response = await apiRequest('PUT', `/api/destinations/${id}`, data);
      return await response.json();
    },
    onSuccess: (destination) => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations', destination.id], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'], refetchType: 'active' });
      toast({
        title: "Destino atualizado",
        description: "O destino foi modificado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o destino.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDestination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (destinationId: string) => {
      await apiRequest('DELETE', `/api/destinations/${destinationId}`);
      return destinationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'], refetchType: 'active' });
      toast({
        title: "Destino excluído",
        description: "O destino foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o destino.",
        variant: "destructive",
      });
    },
  });
}