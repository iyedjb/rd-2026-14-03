import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Bill } from "@shared/schema";

export function useBills(type?: "pagar" | "receber") {
  const queryKey = type ? ["/api/bills", type] : ["/api/bills"];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = type ? `/api/bills?type=${type}` : "/api/bills";
      const response = await apiRequest("GET", url);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateBill() {
  return useMutation({
    mutationFn: (bill: any) => apiRequest("POST", "/api/bills", bill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
  });
}

export function useUpdateBill() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/bills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
  });
}

export function useDeleteBill() {
  return useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
  });
}
