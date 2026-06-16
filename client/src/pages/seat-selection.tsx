import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Armchair, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Bus, Child } from "@shared/schema";
import { DD64Layout } from "@/components/buses/layouts/DD64Layout";
import { Executivo46Layout } from "@/components/buses/layouts/Executivo46Layout";
import { LD44Layout } from "@/components/buses/layouts/LD44Layout";
import { Grafico42Layout } from "@/components/buses/layouts/Grafico42Layout";
import { GenericBusLayout } from "@/components/buses/layouts/GenericBusLayout";

interface SeatSelectionData {
  client: Client;
  children: Child[];
  bus: Bus | null;
  destination_name: string;
  destination_kids_policy: "yes" | "no" | null;
  reserved_seats: string[]; // List of already reserved seat numbers
  valid: boolean;
  expired: boolean;
  already_selected: boolean;
}

export default function SeatSelection() {
  const { token } = useParams();
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>({});
  const [currentPersonIndex, setCurrentPersonIndex] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seatData, isLoading, error } = useQuery<SeatSelectionData>({
    queryKey: ["/api/seat-selection", token],
    queryFn: async () => {
      const response = await fetch(`/api/seat-selection/${token}`);
      if (!response.ok) {
        throw new Error('Link de seleção de assento inválido ou expirado');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const selectSeatMutation = useMutation({
    mutationFn: async (seatSelections: { client_seat: string; children_seats: Array<{ child_id: string; seat_number: string }> }) => {
      await apiRequest('POST', `/api/seat-selection/${token}`, seatSelections);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seat-selection", token] });
      toast({
        title: "Assentos selecionados!",
        description: "Todos os assentos foram reservados com sucesso.",
      });
      
      // Redirect to thank you page after 1.5 seconds
      setTimeout(() => {
        window.location.href = `/thank-you/${token}`;
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na seleção",
        description: error.message || "Ocorreu um erro ao reservar os assentos. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const calculateAge = (birthdate: Date): number => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const canChildChooseSeat = (child: Child): boolean => {
    if (!seatData) return true;
    
    const age = calculateAge(child.birthdate);
    const kidsPolicy = seatData.destination_kids_policy;
    
    if (kidsPolicy === "no") {
      return age > 5;
    }
    
    if (kidsPolicy === "yes") {
      return age >= 5;
    }
    
    return true;
  };

  // Get all people (client + children)
  const getAllPeople = () => {
    if (!seatData) return [];
    const people: Array<{ id: string; name: string; type: 'client' | 'child'; price: number }> = [
      { id: 'client', name: `${seatData.client.first_name} ${seatData.client.last_name}`, type: 'client', price: seatData.client.travel_price || 0 }
    ];
    seatData.children.forEach(child => {
      if (canChildChooseSeat(child)) {
        people.push({ id: child.id, name: child.name, type: 'child', price: child.price || 0 });
      }
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

  const handleNext = () => {
    if (!selectedSeats[currentPerson.id]) {
      toast({
        title: "Nenhum assento selecionado",
        description: `Por favor, selecione um assento para ${currentPerson.name}.`,
        variant: "destructive",
      });
      return;
    }
    if (currentPersonIndex < allPeople.length - 1) {
      setCurrentPersonIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPersonIndex > 0) {
      setCurrentPersonIndex(prev => prev - 1);
    }
  };

  const handleConfirmAll = () => {
    // Check if all people have seats selected
    const allSelected = allPeople.every(person => selectedSeats[person.id]);
    if (!allSelected) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione assentos para todas as pessoas antes de confirmar.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for submission - only include children who can choose seats
    const clientSeat = selectedSeats['client'];
    const childrenSeats = seatData!.children
      .filter(child => canChildChooseSeat(child))
      .map(child => ({
        child_id: child.id,
        seat_number: selectedSeats[child.id]
      }));

    selectSeatMutation.mutate({ client_seat: clientSeat, children_seats: childrenSeats });
  };

  const getTotalPrice = () => {
    if (!seatData) return 0;
    const clientPrice = seatData.client.travel_price || 0;
    const childrenTotal = seatData.children.reduce((sum, child) => sum + (child.price || 0), 0);
    return clientPrice + childrenTotal;
  };

  const getAllReservedSeats = () => {
    if (!seatData) return [];
    // Include both existing reservations and currently selected seats by other people in this selection
    const reserved = [...seatData.reserved_seats];
    Object.entries(selectedSeats).forEach(([personId, seatNumber]) => {
      if (personId !== currentPerson?.id) {
        reserved.push(seatNumber);
      }
    });
    return reserved;
  };

  // Determine bus layout component based on bus type
  const getBusLayout = () => {
    if (!seatData?.bus || !currentPerson) return null;
    
    const busType = seatData.bus.type?.toLowerCase() || '';
    const totalSeats = seatData.bus.total_seats;
    const reservedSeats = getAllReservedSeats();
    const currentSeat = selectedSeats[currentPerson.id] || null;
    
    // Match bus types to specific layouts
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
    } else if ((busType.includes('ld') || busType.includes('leito')) && totalSeats === 44) {
      return (
        <LD44Layout
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
    } else {
      // Generic layout for other bus types
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando assentos disponíveis...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !seatData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Link Inválido
              </h1>
              <p className="text-muted-foreground mb-4">
                Este link de seleção de assento é inválido ou pode ter expirado.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a agência de viagens para obter um novo link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (seatData.already_selected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Assento Já Selecionado
              </h1>
              <p className="text-muted-foreground mb-4">
                Você já selecionou o assento <strong>{seatData.client.seat_number}</strong> para sua viagem.
              </p>
              <p className="text-sm text-muted-foreground">
                Se precisar alterar sua seleção, entre em contato com a agência.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!seatData.valid || seatData.expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Link Expirado
              </h1>
              <p className="text-muted-foreground mb-4">
                Este link de seleção de assento expirou.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a agência de viagens para obter um novo link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!seatData.bus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center">
              <Armchair className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sem Ônibus Configurado
              </h1>
              <p className="text-muted-foreground mb-4">
                Este destino ainda não possui um ônibus configurado para seleção de assentos.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a agência de viagens para mais informações.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const totalPrice = getTotalPrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Armchair className="h-8 w-8 text-blue-600" />
              <CardTitle className="text-2xl">Seleção de Assentos - {seatData.bus?.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{seatData.destination_name}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                {allPeople.length === 1 ? (
                  <>
                    Olá <strong>{currentPerson?.name}</strong>,
                    selecione seu assento para a viagem.
                  </>
                ) : (
                  <>
                    Olá <strong>{seatData.client.first_name}</strong>,
                    selecione seu assento e os assentos dos seus acompanhantes.
                  </>
                )}
                {' '}Assentos em vermelho já estão reservados.
              </AlertDescription>
            </Alert>

            {/* Progress indicator showing all people */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Selecionando para:
                </h3>
                <span className="text-sm text-muted-foreground">
                  {currentPersonIndex + 1} de {allPeople.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allPeople.map((person, index) => (
                  <Badge
                    key={person.id}
                    variant={index === currentPersonIndex ? "default" : "outline"}
                    className={`cursor-pointer ${selectedSeats[person.id] ? 'bg-green-100 dark:bg-green-900 border-green-500' : ''}`}
                    onClick={() => setCurrentPersonIndex(index)}
                    data-testid={`badge-person-${index}`}
                  >
                    {person.name}
                    {selectedSeats[person.id] && ` - #${selectedSeats[person.id]}`}
                    {index === currentPersonIndex && ' ⬅'}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Current person info */}
              {currentPerson && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-lg mb-1" data-testid="text-current-person">
                    Selecionando assento para: {currentPerson.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Clique em um assento verde disponível para selecioná-lo
                  </p>
                </div>
              )}

              {/* Bus Layout */}
              <div className="overflow-x-auto">
                {getBusLayout()}
              </div>

              {currentPerson && selectedSeats[currentPerson.id] && (
                <div className="flex justify-center">
                  <Badge variant="outline" className="text-lg p-3 bg-blue-50 dark:bg-blue-950">
                    Assento selecionado para {currentPerson.name}: <strong className="ml-1 text-blue-600 dark:text-blue-400">#{selectedSeats[currentPerson.id]}</strong>
                  </Badge>
                </div>
              )}
            </div>

            {/* Total Price Display */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-lg">Valor Total da Viagem</h4>
                  <p className="text-sm text-muted-foreground">
                    {allPeople.length === 1 ? '1 passageiro' : `${allPeople.length} passageiros`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400" data-testid="text-total-price">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation and confirm buttons */}
            <div className="flex justify-between gap-4 pt-4 border-t">
              <div className="flex gap-2">
                {currentPersonIndex > 0 && (
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    size="lg"
                    data-testid="button-previous"
                  >
                    ← Anterior
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {currentPersonIndex < allPeople.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="px-8"
                    disabled={!selectedSeats[currentPerson.id]}
                    data-testid="button-next"
                  >
                    Próximo →
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirmAll}
                    disabled={!allPeople.every(p => selectedSeats[p.id]) || selectSeatMutation.isPending}
                    size="lg"
                    className="px-8"
                    data-testid="button-confirm-all-seats"
                  >
                    {selectSeatMutation.isPending ? "Confirmando..." : "Confirmar Todos os Assentos"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


