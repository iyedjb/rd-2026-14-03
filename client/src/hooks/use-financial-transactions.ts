import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FinancialTransaction, InsertFinancialTransaction } from "@shared/schema";

export function useFinancialTransactions() {
  return useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial-transactions"],
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertFinancialTransaction): Promise<FinancialTransaction> => {
      const response = await apiRequest("POST", "/api/financial-transactions", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions"] });
      toast({
        title: "Sucesso!",
        description: "Transação financeira criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro!",
        description: "Erro ao criar transação financeira. Tente novamente.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateFinancialTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFinancialTransaction> }): Promise<FinancialTransaction> => {
      const response = await apiRequest("PUT", `/api/financial-transactions/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions"] });
      toast({
        title: "Sucesso!",
        description: "Transação financeira atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro!",
        description: "Erro ao atualizar transação financeira. Tente novamente.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFinancialTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiRequest("DELETE", `/api/financial-transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial-transactions"] });
      toast({
        title: "Sucesso!",
        description: "Transação financeira excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro!",
        description: "Erro ao excluir transação financeira. Tente novamente.",
        variant: "destructive",
      });
    },
  });
}