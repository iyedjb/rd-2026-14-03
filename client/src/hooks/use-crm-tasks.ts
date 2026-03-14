import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import type { CrmTask, InsertCrmTask } from "@shared/schema";

export function useCrmTasks() {
  return useQuery({
    queryKey: ["/api/crm/tasks"],
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
      const res = await fetch("/api/crm/tasks", {
        headers,
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json() as Promise<CrmTask[]>;
    },
  });
}

export function useCrmTasksByUser(userId?: string) {
  return useQuery({
    queryKey: ["/api/crm/tasks/user", userId],
    queryFn: async () => {
      if (!userId) return [];
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const res = await fetch(`/api/crm/tasks/user/${userId}`, {
        headers,
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json() as Promise<CrmTask[]>;
    },
    enabled: !!userId,
  });
}

export function useCreateCrmTask() {
  return useMutation({
    mutationFn: (task: InsertCrmTask) =>
      apiRequest("POST", "/api/crm/tasks", task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] });
    },
  });
}

export function useUpdateCrmTask() {
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<InsertCrmTask> & {
        status?: "pending" | "in_progress" | "completed";
        completed_at?: Date | null;
      };
    }) => apiRequest("PATCH", `/api/crm/tasks/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] });
    },
  });
}

export function useDeleteCrmTask() {
  return useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/crm/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] });
    },
  });
}
