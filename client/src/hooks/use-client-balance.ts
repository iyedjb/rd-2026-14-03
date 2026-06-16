import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { Client } from "@/types";

export interface ClientBalance {
  client: Client;
  totalTravelAmount: number; // entrada + remaining travel price
  totalPaid: number; // sum of all receipts for this client
  outstandingBalance: number; // what they still owe
  downPaymentAmount: number;
  entradaPaid: boolean; // whether there's already a receipt for the entrada
  remainingInstallments: number;
  installmentAmount: number;
  parcelas?: {
    id: string;
    amount: number;
    due_date: string;
    status: string;
    paid_date?: string;
    payment_method?: string;
  }[];
  error?: string; // Optional error message if there was an issue
}

export function useClientBalance(clientId: string | undefined) {
  return useQuery({
    queryKey: ['/api/clients', clientId, 'balance'],
    queryFn: async (): Promise<ClientBalance | null> => {
      if (!clientId) return null;

      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }

      try {
        const response = await fetch(`/api/clients/${clientId}/balance`, {
          headers,
          credentials: 'include'
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Balance API error:', response.status, errorText);
          throw new Error(`Failed to fetch client balance: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching client balance:', error);
        // Return a minimal fallback structure with an error flag
        // so the UI can still show something useful
        return null;
      }
    },
    enabled: !!clientId,
    retry: 2, // Retry up to 2 times on failure
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
