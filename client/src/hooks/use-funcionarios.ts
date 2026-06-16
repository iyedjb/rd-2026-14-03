import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Funcionario, InsertFuncionario } from "@shared/schema";

export function useFuncionarios() {
  return useQuery<Funcionario[]>({
    queryKey: ["/api/funcionarios"],
  });
}

export function useActiveFuncionarios() {
  return useQuery<Funcionario[]>({
    queryKey: ["/api/funcionarios/active"],
  });
}

export function useFuncionario(id: string) {
  return useQuery<Funcionario>({
    queryKey: ["/api/funcionarios", id],
    enabled: !!id,
  });
}

export function useCreateFuncionario() {
  return useMutation({
    mutationFn: async (data: InsertFuncionario) => {
      const res = await apiRequest("POST", "/api/funcionarios", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
    },
  });
}

export function useUpdateFuncionario() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFuncionario> }) => {
      const res = await apiRequest("PATCH", `/api/funcionarios/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
    },
  });
}

export function useTerminateFuncionario() {
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/funcionarios/${id}/terminate`, {
        termination_reason: reason,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
    },
  });
}

export function useDeleteFuncionario() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/funcionarios/${id}`);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
    },
  });
}

export function useCreateTrialFuncionario() {
  return useMutation({
    mutationFn: async (data: InsertFuncionario & { trial_period_days: number }) => {
      const res = await apiRequest("POST", "/api/funcionarios/trial", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios/trial"] });
    },
  });
}

export function useTrialFuncionarios() {
  return useQuery<Funcionario[]>({
    queryKey: ["/api/funcionarios/trial"],
  });
}

export function useActivateTrialFuncionario() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/funcionarios/${id}/activate-trial`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios/trial"] });
    },
  });
}

// Proposal operations (RH database only)
export function useProposals() {
  return useQuery({
    queryKey: ["/api/proposals"],
  });
}

export function useApproveProposal() {
  return useMutation({
    mutationFn: async ({ id, photo_url }: { id: string; photo_url?: string }) => {
      const res = await apiRequest("POST", `/api/proposals/${id}/approve`, { photo_url });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
    },
  });
}

export function useDeleteProposal() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/proposals/${id}`);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
  });
}
