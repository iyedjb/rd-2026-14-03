import { type Destination, type Bus, type SeatReservation, type Client, type Child } from "@shared/schema";

export const getAvailableSeats = (
  destination: Destination,
  buses: Bus[] | undefined,
  seatReservations: SeatReservation[] | undefined,
  clients: Client[] | undefined,
  children: Child[] | undefined
) => {
  if (!destination.bus_id || !buses || !seatReservations || !clients) return null;

  const bus = buses.find((b) => b.id === destination.bus_id);
  if (!bus) return null;

  const totalSeats = bus.total_seats;
  
  // Confirmed reservations
  const reservedSeatsCount = seatReservations.filter(
    (r) => r.destination_id === destination.id
  ).length;

  // Unassigned clients (aguardando assento)
  // We need to count clients who are assigned to this destination but don't have a reservation yet
  const unassignedCount = clients.filter(c => 
    c.destination === destination.name && 
    !c.is_cancelled &&
    !c.is_deleted &&
    !seatReservations.some(r => r.client_id === c.id)
  ).length;

  // Count unassigned children (accompanhantes) who should have a seat
  // Children with age 5+ usually occupy a seat.
  // We'll count all children who are NOT in seatReservations but their parent's destination matches.
  const unassignedChildrenCount = children?.filter(child => {
    const parent = clients.find(c => c.id === child.client_id);
    if (!parent || parent.destination !== destination.name || parent.is_cancelled || parent.is_deleted) return false;
    
    // Check if child already has a reservation
    const hasReservation = seatReservations.some(r => r.child_id === child.id);
    if (hasReservation) return false;

    // In many travel systems, if a child is listed, they take a seat unless explicitly excluded.
    // Let's assume they take a seat if they are associated with an active travel client.
    return true;
  }).length || 0;

  return Math.max(0, totalSeats - reservedSeatsCount - unassignedCount - unassignedChildrenCount);
};
