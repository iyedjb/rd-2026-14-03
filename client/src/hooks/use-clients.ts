import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { dateToLocalDateString } from "@/lib/utils";
import type { Client, InsertClient, Child, FilterOptions, PaginationInfo } from "@/types";

interface UseClientsResult {
  clients: Client[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: Error | null;
}

export function useClients(filters: FilterOptions = {}): UseClientsResult {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["api/clients", filters],
    queryFn: async (): Promise<{ clients: Client[], pagination: PaginationInfo }> => {
      // Build query parameters for server-side filtering and pagination
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.client_type) params.append('client_type', filters.client_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      
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
      
      const response = await fetch(`/api/clients?${params.toString()}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      
      const result = await response.json();
      
      // The API now returns the expected format directly
      return {
        clients: result.clients,
        pagination: result.pagination
      };
    },
  });

  return {
    clients: data?.clients || [],
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

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientData: InsertClient & { children?: Omit<Child, 'id' | 'client_id'>[] }) => {
      // Convert children birthdates to ISO strings for the API
      const clientWithChildren = {
        ...clientData,
        children: clientData.children?.map(child => ({
          ...child,
          birthdate: child.birthdate instanceof Date 
            ? dateToLocalDateString(child.birthdate) 
            : child.birthdate,
        })),
      };
      
      // Create client via API (server now handles children creation atomically)
      console.log('📦 Creating client with children:', clientWithChildren.children?.length || 0);
      const response = await apiRequest('POST', '/api/clients', clientWithChildren);
      const createdClient = await response.json();
      console.log('✅ Client created with children on server');

      return createdClient;
    },
    onSuccess: () => {
      // Immediately refetch clients list to show new client
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      // Also invalidate dashboard stats since client count changed
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      // Parse error message for duplicate client detection
      let errorMessage = error.message || 'Erro desconhecido';
      
      // Try to extract JSON error message from the error
      try {
        const match = errorMessage.match(/\d+:\s*(.+)/);
        if (match) {
          const jsonPart = match[1];
          const parsed = JSON.parse(jsonPart);
          if (parsed.error) {
            errorMessage = parsed.error;
          }
        }
      } catch (e) {
        // Keep original message if parsing fails
      }
      
      toast({
        title: "Erro ao criar cliente",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<InsertClient> & { children?: Omit<Child, 'id' | 'client_id'>[] } 
    }) => {
      // Convert children birthdates to ISO strings for the API
      const clientWithChildren = {
        ...data,
        children: data.children?.map(child => ({
          ...child,
          birthdate: child.birthdate instanceof Date 
            ? dateToLocalDateString(child.birthdate) 
            : child.birthdate,
        })),
      };
      
      // Update client via API (server now handles children updates atomically)
      console.log('📦 Updating client with children:', clientWithChildren.children?.length || 0);
      await apiRequest('PUT', `/api/clients/${id}`, clientWithChildren);
      console.log('✅ Client updated with children on server');

      return id;
    },
    onSuccess: (clientId) => {
      // Immediately refetch client data to show updates
      queryClient.invalidateQueries({ queryKey: ["api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      // Delete all children first
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const childrenResponse = await fetch(`/api/children/client/${clientId}`, {
        headers,
        credentials: 'include'
      });
      if (childrenResponse.ok) {
        const children = await childrenResponse.json();
        const deleteChildrenPromises = children.map((child: Child) => 
          apiRequest('DELETE', `/api/children/${child.id}`)
        );
        await Promise.all(deleteChildrenPromises);
      }
      
      // Delete client
      await apiRequest('DELETE', `/api/clients/${clientId}`);
      
      return clientId;
    },
    onSuccess: () => {
      // Immediately refetch clients list to show deletion
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      // Also invalidate dashboard stats since client count changed
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Cliente excluído com sucesso!",
        description: "O cliente e todos os dados relacionados foram removidos.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["api/clients", clientId],
    queryFn: async () => {
      // Fetch client data
      const headers1: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers1["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const clientResponse = await fetch(`/api/clients/${clientId}`, {
        headers: headers1,
        credentials: 'include'
      });
      if (!clientResponse.ok) {
        throw new Error("Cliente não encontrado");
      }
      const client = await clientResponse.json();

      // Fetch children
      const headers2: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers2["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      const childrenResponse = await fetch(`/api/children/client/${clientId}`, {
        headers: headers2,
        credentials: 'include'
      });
      let children: Child[] = [];
      if (childrenResponse.ok) {
        children = await childrenResponse.json();
      }

      // Coerce date strings to Date objects
      const coercedClient = {
        ...client,
        birthdate: client.birthdate ? new Date(client.birthdate) : undefined,
        travel_date: client.travel_date ? new Date(client.travel_date) : undefined,
        approval_date: client.approval_date ? new Date(client.approval_date) : undefined,
        approval_expires_at: client.approval_expires_at ? new Date(client.approval_expires_at) : undefined,
        created_at: client.created_at ? new Date(client.created_at) : undefined,
        updated_at: client.updated_at ? new Date(client.updated_at) : undefined,
        // Note: installment_due_date and first_installment_due_date are kept as strings
        // as they store formatted text like "10" (day of month) or "15/01/2025", not actual dates
      };

      // Coerce dates in children
      const coercedChildren = children.map(child => ({
        ...child,
        birthdate: child.birthdate ? new Date(child.birthdate) : undefined,
      }));

      console.log(`📦 useClient: Loaded client ${clientId} with ${coercedChildren.length} children`);
      console.log('📦 useClient: Children data:', coercedChildren);

      return { ...coercedClient, children: coercedChildren };
    },
    enabled: !!clientId,
  });
}

export function useRegenerateApprovalLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest('POST', `/api/clients/${clientId}/regenerate-link`);
      return await response.json() as Client;
    },
    onSuccess: (client) => {
      // Immediately refetch client data to show new approval link
      queryClient.invalidateQueries({ queryKey: ["api/clients", client.id] });
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      toast({
        title: "Link regenerado com sucesso!",
        description: "Um novo link de aprovação foi criado para o cliente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao regenerar link",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

