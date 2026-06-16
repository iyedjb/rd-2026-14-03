import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Armchair, Save, X } from "lucide-react";
import { useDestinations } from "@/hooks/use-destinations";
import { useBuses } from "@/hooks/use-buses";
import { useSeatReservationsByDestination } from "@/hooks/use-seat-reservations";
import { DD64Layout } from "@/components/buses/layouts/DD64Layout";
import { Executivo46Layout } from "@/components/buses/layouts/Executivo46Layout";
import { Grafico42Layout } from "@/components/buses/layouts/Grafico42Layout";
import { LD44Layout } from "@/components/buses/layouts/LD44Layout";
import { GenericBusLayout } from "@/components/buses/layouts/GenericBusLayout";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Child } from "@/types";

interface SeatEditorProps {
  client: Client;
  children?: Child[];
}

export function SeatEditor({ client, children = [] }: SeatEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>({});
  const [currentPersonIndex, setCurrentPersonIndex] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: destinations = [] } = useDestinations();
  const { data: buses = [] } = useBuses();
  const destination = destinations.find(d => d.name === client.destination);
  const bus = destination?.bus_id ? buses.find(b => b.id === destination.bus_id) : null;
  const { data: reservations = [] } = useSeatReservationsByDestination(destination?.id);

  const updateSeatsMutation = useMutation({
    mutationFn: async (seatData: { client_seat: string; children_seats: Array<{ child_id: string; seat_number: string }> }) => {
      await apiRequest('PUT', `/api/clients/${client.id}/seats`, seatData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api/clients", client.id] });
      queryClient.invalidateQueries({ queryKey: ["api/clients"] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', destination?.id] });
      toast({
        title: "Assentos atualizados!",
        description: "Os assentos foram modificados com sucesso.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar assentos",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (client.seat_number) {
      setSelectedSeats({ client: client.seat_number });
    }
    children.forEach(child => {
      if (child.seat_number) {
        setSelectedSeats(prev => ({ ...prev, [child.id]: child.seat_number! }));
      }
    });
  }, [client, children]);

  if (!destination || !bus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Gerenciar Assentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Cliente precisa ter um destino com ônibus configurado para gerenciar assentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getAllPeople = () => {
    const people: Array<{ id: string; name: string; type: 'client' | 'child' }> = [
      { id: 'client', name: `${client.first_name} ${client.last_name}`, type: 'client' }
    ];
    children.forEach(child => {
      people.push({ id: child.id, name: child.name, type: 'child' });
    });
    return people;
  };

  const allPeople = getAllPeople();
  const currentPerson = allPeople[currentPersonIndex];

  const handleSeatSelect = (seatNumber: string) => {
    if (!currentPerson) return;
    setSelectedSeats(prev => ({
      ...prev,
      [currentPerson.id]: seatNumber
    }));
  };

  const getAllReservedSeats = (): string[] => {
    const childrenIds = children.map(c => c.id);
    return reservations
      .filter(r => r.client_id !== client.id && !childrenIds.includes(r.client_id))
      .map(r => r.seat_number);
  };

  const getBusLayout = () => {
    if (!bus || !currentPerson) return null;
    
    const busType = bus.type?.toLowerCase() || '';
    const totalSeats = bus.total_seats;
    const reservedSeats = getAllReservedSeats();
    const currentSeat = selectedSeats[currentPerson.id] || null;
    
    if (busType.includes('dd') && busType.includes('64')) {
      return (
        <DD64Layout
          reservedSeats={reservedSeats}
          selectedSeat={currentSeat}
          onSeatSelect={handleSeatSelect}
          isSelectable={true}
        />
      );
    } else if ((busType.includes('executivo') || busType.includes('46')) && totalSeats === 46) {
      return (
        <Executivo46Layout
          reservedSeats={reservedSeats}
          selectedSeat={currentSeat}
          onSeatSelect={handleSeatSelect}
          isSelectable={true}
        />
      );
    } else if ((busType.includes('grafico') || busType.includes('gráfico')) && totalSeats === 42) {
      return (
        <Grafico42Layout
          reservedSeats={reservedSeats}
          selectedSeat={currentSeat}
          onSeatSelect={handleSeatSelect}
          isSelectable={true}
        />
      );
    } else if ((busType.includes('ld') && busType.includes('44')) || totalSeats === 44) {
      return (
        <LD44Layout
          reservedSeats={reservedSeats}
          selectedSeat={currentSeat}
          onSeatSelect={handleSeatSelect}
          isSelectable={true}
        />
      );
    } else {
      return (
        <GenericBusLayout
          totalSeats={totalSeats}
          reservedSeats={reservedSeats}
          selectedSeat={currentSeat}
          onSeatSelect={handleSeatSelect}
          isSelectable={true}
        />
      );
    }
  };

  const handleSave = () => {
    const allSelected = allPeople.every(person => selectedSeats[person.id]);
    if (!allSelected) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione assentos para todas as pessoas.",
        variant: "destructive",
      });
      return;
    }

    const clientSeat = selectedSeats['client'];
    const childrenSeats = children.map(child => ({
      child_id: child.id,
      seat_number: selectedSeats[child.id]
    }));

    updateSeatsMutation.mutate({ client_seat: clientSeat, children_seats: childrenSeats });
  };

  const handleCancel = () => {
    setSelectedSeats({});
    if (client.seat_number) {
      setSelectedSeats({ client: client.seat_number });
    }
    children.forEach(child => {
      if (child.seat_number) {
        setSelectedSeats(prev => ({ ...prev, [child.id]: child.seat_number! }));
      }
    });
    setCurrentPersonIndex(0);
    setIsEditing(false);
  };

  const hasSeatsSelected = client.seat_number || children.some(c => c.seat_number);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Gerenciar Assentos
          </CardTitle>
          {!isEditing && hasSeatsSelected && (
            <Button onClick={() => setIsEditing(true)} data-testid="button-edit-seats">
              Editar Assentos
            </Button>
          )}
          {!isEditing && !hasSeatsSelected && (
            <Button onClick={() => setIsEditing(true)} data-testid="button-assign-seats">
              Atribuir Assentos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{client.first_name} {client.last_name}:</span>
              {client.seat_number ? (
                <Badge data-testid="badge-client-seat">Assento {client.seat_number}</Badge>
              ) : (
                <span className="text-muted-foreground text-sm" data-testid="text-no-seat">Sem assento atribuído</span>
              )}
            </div>
            {children.map(child => (
              <div key={child.id} className="flex items-center gap-2">
                <span className="font-medium">{child.name}:</span>
                {child.seat_number ? (
                  <Badge data-testid={`badge-child-seat-${child.id}`}>Assento {child.seat_number}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm" data-testid={`text-child-no-seat-${child.id}`}>Sem assento atribuído</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                Selecionando assento para: <span className="text-primary">{currentPerson?.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPersonIndex(Math.max(0, currentPersonIndex - 1))}
                  disabled={currentPersonIndex === 0}
                  data-testid="button-previous-person"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPersonIndex(Math.min(allPeople.length - 1, currentPersonIndex + 1))}
                  disabled={currentPersonIndex === allPeople.length - 1}
                  data-testid="button-next-person"
                >
                  Próximo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {allPeople.map((person, index) => (
                <div key={person.id} className="flex items-center gap-2 text-sm">
                  <span className={index === currentPersonIndex ? "font-semibold text-primary" : ""}>
                    {person.name}:
                  </span>
                  {selectedSeats[person.id] ? (
                    <Badge variant={index === currentPersonIndex ? "default" : "secondary"}>
                      Assento {selectedSeats[person.id]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Não selecionado</span>
                  )}
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 bg-muted/20">
              {getBusLayout()}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateSeatsMutation.isPending}
                data-testid="button-cancel-seats"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateSeatsMutation.isPending}
                data-testid="button-save-seats"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSeatsMutation.isPending ? 'Salvando...' : 'Salvar Assentos'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

