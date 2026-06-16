import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Receipt, type InsertReceipt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export function useReceipts() {
  return useQuery({
    queryKey: ['/api/receipts'],
    queryFn: async (): Promise<Receipt[]> => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch('/api/receipts', {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch receipts');
      const data = await response.json();
      return data.map((receipt: any) => ({
        ...receipt,
        created_at: new Date(receipt.created_at),
        updated_at: new Date(receipt.updated_at),
      }));
    },
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: ['/api/receipts', id],
    queryFn: async (): Promise<Receipt> => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch(`/api/receipts/${id}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const data = await response.json();
      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
    },
    enabled: !!id,
  });
}

export interface ParcelaPayment {
  parcela_id: string;
  amount: number;
}

export interface CreateReceiptInput {
  receipt: InsertReceipt;
  paymentHistoryData?: any; // PaymentHistoryData type from pdf-generator
  parcelaPayments?: ParcelaPayment[]; // Array of parcela payments for partial payment distribution
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const { receipt, paymentHistoryData, parcelaPayments } = input;
      
      // Include parcela_payments in the request body if provided
      const requestBody = {
        ...receipt,
        parcela_payments: parcelaPayments,
      };
      
      const response = await apiRequest('POST', '/api/receipts', requestBody);
      const data = await response.json();
      
      // Fetch fresh payment history data AFTER the receipt is created
      // This ensures the PDF shows the updated totals including this new payment
      let freshPaymentHistoryData = paymentHistoryData;
      if (receipt.client_id) {
        try {
          const balanceResponse = await apiRequest('GET', `/api/clients/${receipt.client_id}/balance`);
          if (balanceResponse.ok) {
            freshPaymentHistoryData = await balanceResponse.json();
          }
        } catch (err) {
          console.log('Could not fetch fresh payment history, using original data');
        }
      }
      
      // Generate PDF automatically with fresh payment history
      const { generateReceiptPDF } = await import('@/lib/pdf-generator');
      await generateReceiptPDF({
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      }, freshPaymentHistoryData);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] }); // Refresh client balance data
      // Invalidate all client balance queries to refresh payment history
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && 
        query.queryKey[0]?.toString().includes('/api/clients') && 
        query.queryKey[0]?.toString().includes('/balance')
      });
      toast({
        title: "Recibo criado com sucesso!",
        description: "O recibo foi gerado e salvo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar recibo",
        description: error.message || "Não foi possível criar o recibo.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReceipt> }) => {
      return await apiRequest('PUT', `/api/receipts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "Recibo atualizado!",
        description: "O recibo foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar recibo",
        description: error.message || "Não foi possível atualizar o recibo.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/receipts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "Recibo excluído!",
        description: "O recibo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir recibo",
        description: error.message || "Não foi possível excluir o recibo.",
        variant: "destructive",
      });
    },
  });
}
