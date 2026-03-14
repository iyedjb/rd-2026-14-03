import { useQuery } from "@tanstack/react-query";
import type { SeatReservation } from "@shared/schema";

export function useSeatReservationsByDestination(destinationId: string | undefined) {
  return useQuery<SeatReservation[]>({
    queryKey: ['/api/seat-reservations/destination', destinationId],
    queryFn: async () => {
      if (!destinationId) return [];
      const response = await fetch(`/api/seat-reservations/destination/${destinationId}`);
      if (!response.ok) throw new Error('Failed to fetch seat reservations');
      return response.json();
    },
    enabled: !!destinationId,
  });
}

export function useSeatReservationsByBus(busId: string | undefined) {
  return useQuery<SeatReservation[]>({
    queryKey: ['/api/seat-reservations/bus', busId],
    queryFn: async () => {
      if (!busId) return [];
      const response = await fetch(`/api/seat-reservations/bus/${busId}`);
      if (!response.ok) throw new Error('Failed to fetch seat reservations');
      return response.json();
    },
    enabled: !!busId,
  });
}

export function useAllSeatReservations() {
  return useQuery<SeatReservation[]>({
    queryKey: ['/api/seat-reservations'],
  });
}
