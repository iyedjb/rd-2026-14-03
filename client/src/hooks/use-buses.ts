import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Bus, type InsertBus } from "@shared/schema";

export function useBuses() {
  return useQuery({
    queryKey: ['/api/buses'],
    queryFn: async (): Promise<Bus[]> => {
      const response = await fetch('/api/buses');
      if (!response.ok) throw new Error('Failed to fetch buses');
      return response.json();
    },
  });
}

export function useActiveBuses() {
  return useQuery({
    queryKey: ['/api/buses/active'],
    queryFn: async (): Promise<Bus[]> => {
      const response = await fetch('/api/buses/active');
      if (!response.ok) throw new Error('Failed to fetch active buses');
      return response.json();
    },
  });
}

export function useBus(busId: string) {
  return useQuery({
    queryKey: ['/api/buses', busId],
    queryFn: async (): Promise<Bus> => {
      const response = await fetch(`/api/buses/${busId}`);
      if (!response.ok) throw new Error('Failed to fetch bus');
      return response.json();
    },
    enabled: !!busId,
  });
}

export function useCreateBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBus) => {
      const response = await apiRequest('POST', '/api/buses', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buses/active'] });
      toast({
        title: "Ônibus criado",
        description: "O novo ônibus foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o ônibus.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBus> }) => {
      const response = await apiRequest('PUT', `/api/buses/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buses/active'] });
      toast({
        title: "Ônibus atualizado",
        description: "O ônibus foi modificado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o ônibus.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/buses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buses/active'] });
      toast({
        title: "Ônibus excluído",
        description: "O ônibus foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o ônibus.",
        variant: "destructive",
      });
    },
  });
}
