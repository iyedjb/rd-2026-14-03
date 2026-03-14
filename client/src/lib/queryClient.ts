import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Enhanced error details for better debugging
    const error = new Error(`${res.status}: ${text}`);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get Firebase token for authentication
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (error) {
      console.warn("Failed to get Firebase token:", error);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
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

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds for real-time data
      refetchOnWindowFocus: true, // Refetch when user returns to the app window
      refetchOnReconnect: true, // Refetch when network reconnects
      staleTime: 1000 * 10, // 10 seconds - data considered stale quickly to enable fresh loads
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 day cache lifetime for maximum cost savings
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors (use proper status check)
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2; // Reduced retry count for faster failures
      },
      retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 5000), // Even faster retry timing
      networkMode: 'offlineFirst', // Better offline support
      // Optimize for instant loading
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      // Keep cache warm with background updates
      refetchIntervalInBackground: true, // Enable background refetching for fresh data
      // Optimize network requests
      structuralSharing: true, // Enable structural sharing for better memory usage
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors (use proper status check)
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1; // Single retry for mutations
      },
      retryDelay: 300, // Even faster retry for mutations
      networkMode: 'online',
      // Optimistic updates for better UX
      onMutate: () => {
        // This will be overridden by individual mutations but provides a default
      },
    },
  },
});

// Enable background refetching globally for critical data
queryClient.setMutationDefaults(['api/clients'], {
  mutationFn: async (variables) => {
    // This will be overridden by actual mutations
    throw new Error('Mutation function not implemented');
  },
  // Automatically refetch related queries after mutations
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['api/clients'] });
    queryClient.invalidateQueries({ queryKey: ['api/dashboard-stats'] });
  },
});

queryClient.setMutationDefaults(['api/departures'], {
  mutationFn: async (variables) => {
    throw new Error('Mutation function not implemented');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['api/departures'] });
    queryClient.invalidateQueries({ queryKey: ['api/dashboard-stats'] });
  },
});

queryClient.setMutationDefaults(['api/destinations'], {
  mutationFn: async (variables) => {
    throw new Error('Mutation function not implemented');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/destinations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'] });
  },
});

// Specific optimizations for different types of data (matching actual query keys)
// Auto-refetch for dynamic data
queryClient.setQueryDefaults(['/api/destinations'], {
  staleTime: 1000 * 10, // 10 seconds - enable auto-refetch
  gcTime: 1000 * 60 * 60 * 24, // 24 hours cache for destinations
  refetchOnMount: false,
  refetchOnWindowFocus: true, // Refetch when returning to window
  refetchOnReconnect: true, // Refetch when network reconnects
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

queryClient.setQueryDefaults(['/api/destinations/active'], {
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

// Auto-refetch for clients data
queryClient.setQueryDefaults(['/api/clients'], {
  staleTime: 1000 * 10, // 10 seconds - enable auto-refetch
  gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  refetchOnMount: false,
  refetchOnWindowFocus: true, // Refetch when returning to window
  refetchOnReconnect: true, // Refetch when network reconnects
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

queryClient.setQueryDefaults(['/api/departures'], {
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

queryClient.setQueryDefaults(['/api/prospects'], {
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

// Auto-refetch for dashboard stats
queryClient.setQueryDefaults(['/api/dashboard-stats'], {
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

// Auto-refetch for financial data
queryClient.setQueryDefaults(['/api/financial-transactions'], {
  staleTime: 1000 * 10, // 10 seconds
  gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
});

// Optimize mutations for prospects to also invalidate prospects queries
queryClient.setMutationDefaults(['api/prospects'], {
  mutationFn: async (variables) => {
    throw new Error('Mutation function not implemented');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['api/prospects'] });
    queryClient.invalidateQueries({ queryKey: ['api/dashboard-stats'] });
  },
});

// Note: Global error handling is managed by individual query/mutation implementations
console.log('🔧 Query client optimized for super fast data loading');
console.log('⚡ Advanced caching and performance optimizations enabled');
