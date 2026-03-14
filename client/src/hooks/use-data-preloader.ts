import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

/**
 * Hook to preload essential data on app startup for super fast loading
 * This hook prefetches critical data that's needed across the application
 */
export function useDataPreloader() {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading before attempting any prefetch
    if (loading) {
      return;
    }

    // Preload essential data on app startup - run all in parallel for super fast loading
    const preloadEssentialData = async () => {
      try {
        console.log('🚀 Starting parallel data preloading...');
        
        const prefetchOperations = [
          // Prefetch active destinations (used in forms and filters) - PUBLIC endpoint
          queryClient.prefetchQuery({
            queryKey: ['/api/destinations/active'],
            queryFn: async () => {
              const response = await fetch('/api/destinations/active', {
                credentials: 'include'
              });
              if (!response.ok) throw new Error('Failed to fetch active destinations');
              return response.json();
            },
            staleTime: 1000 * 60 * 15, // 15 minutes - destinations don't change often
          }),

          // Prefetch all destinations (for admin management) - PUBLIC endpoint
          queryClient.prefetchQuery({
            queryKey: ['/api/destinations'],
            queryFn: async () => {
              const response = await fetch('/api/destinations', {
                credentials: 'include'
              });
              if (!response.ok) throw new Error('Failed to fetch destinations');
              return response.json();
            },
            staleTime: 1000 * 60 * 15, // 15 minutes
          }),
        ];

        // Only prefetch protected endpoints if user is authenticated, auth is fully loaded, and token is available
        if (user && !loading) {
          // Verify we can get a valid token before attempting protected prefetches
          let authToken: string;
          try {
            authToken = await (user as any).getIdToken();
          } catch (tokenError) {
            console.warn('⚠️ Failed to get auth token, skipping protected prefetches:', tokenError);
            // Skip protected prefetches if token is not available
            await Promise.allSettled(prefetchOperations);
            console.log('🚀 Parallel data preloading completed (public endpoints only)!');
            return;
          }

          // Prefetch clients data only - PROTECTED endpoint
          // Dashboard stats will be derived from this data at the component level
          prefetchOperations.push(
            queryClient.prefetchQuery({
              queryKey: ['/api/clients'],
              queryFn: async () => {
                const response = await fetch('/api/clients', {
                  credentials: 'include',
                  headers: {
                    'Authorization': `Bearer ${authToken}`
                  }
                });
                if (!response.ok) throw new Error('Failed to fetch clients');
                const clients = await response.json();
                
                // Return full clients list (pagination handled at component level if needed)
                return clients;
              },
              staleTime: 1000 * 60 * 5, // 5 minutes - clients change more frequently
            })
          );
        }
        
        // Run all prefetch operations in parallel for maximum speed
        await Promise.allSettled(prefetchOperations);

        console.log('🚀 Parallel data preloading completed successfully!');
      } catch (error) {
        console.warn('⚠️ Failed to preload some data:', error);
        // Don't throw - app should still work if preloading fails
      }
    };

    // Start preloading once auth is loaded
    preloadEssentialData();
  }, [queryClient, user, loading]);
}

/**
 * Hook to prefetch data for specific pages to enable instant navigation
 */
export function usePrefetchPageData() {
  const queryClient = useQueryClient();

  const prefetchClientsPage = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/clients'],
      staleTime: 1000 * 60 * 5,
    });
  };

  const prefetchDestinationsPage = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/destinations'],
      staleTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  const prefetchReportsPage = (year?: number, month?: number) => {
    if (year && month) {
      queryClient.prefetchQuery({
        queryKey: ['/api/monthly-report', year, month],
        staleTime: 1000 * 60 * 10, // 10 minutes
      });
    }
  };

  return {
    prefetchClientsPage,
    prefetchDestinationsPage,
    prefetchReportsPage,
  };
}