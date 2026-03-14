import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Armchair, Users, MapPin, FileDown, Bus as BusIcon, Hotel, Save, X, UserPlus, Trash2, Search } from "lucide-react";
import { useActiveDestinations } from "@/hooks/use-destinations";
import { useBuses } from "@/hooks/use-buses";
import { useSeatReservationsByDestination } from "@/hooks/use-seat-reservations";
import { generateEmbarqueWord, generateMotoristaWord } from "@/lib/word-generator";
import { generateHotelPDF, generateListaCompletaPDF, generateBusGraphicPDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DD64Layout } from "@/components/buses/layouts/DD64Layout";
import { Executivo46Layout } from "@/components/buses/layouts/Executivo46Layout";
import { Grafico42Layout } from "@/components/buses/layouts/Grafico42Layout";
import { LD44Layout } from "@/components/buses/layouts/LD44Layout";
import { GenericBusLayout } from "@/components/buses/layouts/GenericBusLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import type { SeatReservation } from "@shared/schema";

export function BusOccupancy() {
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [editingSeatReservation, setEditingSeatReservation] = useState<SeatReservation | null>(null);
  const [newSeatNumber, setNewSeatNumber] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editCpfOrRg, setEditCpfOrRg] = useState("");
  const [editEmbarque, setEditEmbarque] = useState("");
  const [manualAssignmentSeat, setManualAssignmentSeat] = useState<string | null>(null);
  const [manualClientName, setManualClientName] = useState("");
  const [manualCpfOrRg, setManualCpfOrRg] = useState("");
  const [manualEmbarque, setManualEmbarque] = useState("");
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [pendingPDFType, setPendingPDFType] = useState<"embarque" | "motorista" | "hotel" | "lista_completa" | null>(null);
  const [passengerToDelete, setPassengerToDelete] = useState<any | null>(null);
  const [deletedPassengerIds, setDeletedPassengerIds] = useState<Set<string>>(new Set());
  const [showUnassignedClientsModal, setShowUnassignedClientsModal] = useState(false);
  const [selectedEmptySeat, setSelectedEmptySeat] = useState<string | null>(null);
  const [unassignedClientFilter, setUnassignedClientFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSeat, setHighlightedSeat] = useState<string | null>(null);
  const busLayoutRef = useRef<HTMLDivElement>(null);
  const { data: destinations = [], isLoading: destinationsLoading } = useActiveDestinations();
  const { data: buses = [] } = useBuses();
  const { data: reservations = [], isLoading: reservationsLoading } = useSeatReservationsByDestination(selectedDestinationId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservationsWithClients = [] } = useQuery({
    queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'],
    queryFn: async () => {
      if (!selectedDestinationId) return [];
      
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch(`/api/seat-reservations/destination/${selectedDestinationId}/with-clients`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reservations with client data');
      return response.json();
    },
    enabled: !!selectedDestinationId,
  });

  const selectedDestination = destinations.find(d => d.id === selectedDestinationId);
  const selectedBus = selectedDestination?.bus_id ? buses.find(b => b.id === selectedDestination.bus_id) : null;

  const { data: allPassengers = [], isLoading: isLoadingPassengers } = useQuery({
    queryKey: ['/api/passengers/destination', selectedDestination?.name],
    queryFn: async () => {
      if (!selectedDestination?.name) return [];
      
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const response = await fetch(`/api/passengers/destination/${encodeURIComponent(selectedDestination.name)}`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch all passengers');
      return response.json();
    },
    enabled: !!selectedDestination?.name,
  });

  const { data: unassignedClients = [], isLoading: isLoadingUnassigned, refetch: refetchUnassigned } = useQuery({
    queryKey: ['/api/clients/unassigned-seats', selectedDestination?.name],
    queryFn: async () => {
      if (!selectedDestination?.name) return [];
      
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (error) {
          console.warn("Failed to get Firebase token:", error);
        }
      }
      
      const domain = window.location.origin;
      const url = `${domain}/api/clients/destination/${encodeURIComponent(selectedDestination.name)}/unassigned`;
      const response = await fetch(url, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('❌ Failed to fetch unassigned clients:', response.status, response.statusText);
        throw new Error('Failed to fetch unassigned clients');
      }
      return response.json();
    },
    enabled: !!selectedDestination?.name,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // Effect to refetch unassigned clients when destination changes
  useEffect(() => {
    if (selectedDestinationId) {
      refetchUnassigned();
    }
  }, [selectedDestinationId, refetchUnassigned]);

  const updateSeatMutation = useMutation({
    mutationFn: async ({ reservationId, seatNumber }: { reservationId: string; seatNumber: string }) => {
      await apiRequest('PUT', `/api/seat-reservations/${reservationId}`, { seat_number: seatNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passengers/destination', selectedDestination?.name] });
      toast({
        title: "Assento atualizado!",
        description: "O assento do cliente foi alterado com sucesso.",
      });
      setEditingSeatReservation(null);
      setNewSeatNumber(null);
      setEditClientName("");
      setEditCpfOrRg("");
      setEditEmbarque("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar assento",
        description: error.message || "Não foi possível alterar o assento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updatePassengerDataMutation = useMutation({
    mutationFn: async ({ 
      reservationId, 
      clientId, 
      clientName, 
      cpfOrRg, 
      embarque 
    }: { 
      reservationId: string; 
      clientId: string; 
      clientName?: string; 
      cpfOrRg?: string; 
      embarque?: string;
    }) => {
      const updates: any = {};
      
      if (clientName) {
        const nameParts = clientName.trim().split(' ');
        updates.first_name = nameParts[0];
        updates.last_name = nameParts.slice(1).join(' ') || nameParts[0];
      }
      
      if (cpfOrRg !== undefined) {
        if (cpfOrRg.length === 11 || cpfOrRg.includes('.')) {
          updates.cpf = cpfOrRg;
        } else if (cpfOrRg) {
          updates.rg = cpfOrRg;
        }
      }
      
      if (embarque !== undefined) {
        updates.departure_location = embarque;
      }
      
      if (Object.keys(updates).length > 0) {
        await apiRequest('PUT', `/api/clients/${clientId}`, updates);
      }
      
      if (clientName) {
        await apiRequest('PUT', `/api/seat-reservations/${reservationId}`, { client_name: clientName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passengers/destination', selectedDestination?.name] });
      toast({
        title: "Dados atualizados!",
        description: "Os dados do passageiro foram atualizados com sucesso.",
      });
      setEditingSeatReservation(null);
      setNewSeatNumber(null);
      setEditClientName("");
      setEditCpfOrRg("");
      setEditEmbarque("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar dados",
        description: error.message || "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const manualAssignmentMutation = useMutation({
    mutationFn: async (data: { destination_id: string; bus_id: string; seat_number: string; client_name: string; cpf_or_rg?: string; departure_location?: string }) => {
      await apiRequest('POST', '/api/seat-reservations/manual', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passengers/destination', selectedDestination?.name] });
      toast({
        title: "Cliente adicionado!",
        description: "O cliente foi atribuído ao assento com sucesso.",
      });
      handleCancelManualAssignment();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message || "Não foi possível adicionar o cliente ao assento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const assignExistingClientMutation = useMutation({
    mutationFn: async (data: { client_id: string; destination_id: string; bus_id: string; seat_number: string; child_id?: string; passenger_type?: string }) => {
      await apiRequest('POST', '/api/seat-reservations/assign-existing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passengers/destination', selectedDestination?.name] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients/unassigned-seats', selectedDestination?.name] });
      toast({
        title: "Cliente atribuído!",
        description: "O cliente foi atribuído ao assento com sucesso.",
      });
      setShowUnassignedClientsModal(false);
      setSelectedEmptySeat(null);
      setUnassignedClientFilter("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atribuir cliente",
        description: error.message || "Não foi possível atribuir o cliente ao assento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest('DELETE', `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/unassigned-seats', selectedDestination?.name] });
      toast({
        title: "Cliente removido!",
        description: "O cliente foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover cliente",
        description: error.message || "Não foi possível remover o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteCompanionMutation = useMutation({
    mutationFn: async (childId: string) => {
      await apiRequest('DELETE', `/api/children/${childId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients/unassigned-seats', selectedDestination?.name] });
      toast({
        title: "Acompanhante removido!",
        description: "O acompanhante foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover acompanhante",
        description: error.message || "Não foi possível remover o acompanhante. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteSeatMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      await apiRequest('DELETE', `/api/seat-reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/seat-reservations/destination', selectedDestinationId, 'with-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/passengers/destination', selectedDestination?.name] });
      toast({
        title: "Assento removido!",
        description: "O assento foi liberado com sucesso.",
      });
      // Only close edit dialog if we're in edit mode, not modal mode
      if (editingSeatReservation) {
        handleCancelEdit();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover assento",
        description: error.message || "Não foi possível remover o assento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleReservedSeatClick = (seatNumber: string) => {
    const reservation = reservations.find(r => r.seat_number === seatNumber);
    if (reservation) {
      const reservationWithClient = reservationsWithClients.find((r: any) => r.id === reservation.id);
      
      setEditingSeatReservation(reservation);
      setNewSeatNumber(seatNumber);
      setEditClientName(reservation.client_name || "");
      
      if (reservationWithClient?.client) {
        const client = reservationWithClient.client;
        const child = reservationWithClient.child || reservationWithClient.child_data;
        
        // If it's a child/companion reservation, use the child's data
        if ((reservation.is_child || reservationWithClient.is_child) && child) {
          setEditCpfOrRg(child.cpf || child.rg || "");
        } else {
          setEditCpfOrRg(client.cpf || client.rg || "");
        }
        setEditEmbarque(client.departure_location || "");
      } else {
        setEditCpfOrRg("");
        setEditEmbarque("");
      }
    }
  };

  const handleEmptySeatClick = (seatNumber: string) => {
    setSelectedEmptySeat(seatNumber);
    setShowUnassignedClientsModal(true);
    setUnassignedClientFilter("");
  };

  const handleAssignExistingClient = (passenger: any) => {
    if (!selectedEmptySeat || !selectedDestination || !selectedBus) return;
    
    assignExistingClientMutation.mutate({
      client_id: passenger.client_id || passenger.id,
      destination_id: selectedDestination.id,
      bus_id: selectedBus.id,
      seat_number: selectedEmptySeat,
      child_id: passenger.child_id,
      passenger_type: passenger.type
    });
  };

  const handleSearchPassenger = () => {
    if (!searchQuery.trim()) return;
    
    const searchLower = searchQuery.toLowerCase().trim();
    const reservation = reservations.find(r => 
      r.client_name?.toLowerCase().includes(searchLower)
    );
    
    if (reservation) {
      setHighlightedSeat(reservation.seat_number);
      
      setTimeout(() => {
        const seatElement = document.querySelector(`[data-testid="seat-${reservation.seat_number}"]`);
        if (seatElement) {
          seatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      setTimeout(() => {
        setHighlightedSeat(null);
      }, 3000);
    } else {
      toast({
        title: "Passageiro não encontrado",
        description: `Nenhum passageiro com "${searchQuery}" foi encontrado neste ônibus.`,
        variant: "destructive",
      });
    }
  };

  const handleCloseUnassignedModal = () => {
    setShowUnassignedClientsModal(false);
    setSelectedEmptySeat(null);
    setUnassignedClientFilter("");
    setManualClientName("");
    setManualCpfOrRg("");
    setManualEmbarque("");
  };

  const handleSeatChange = (seatNumber: string) => {
    setNewSeatNumber(seatNumber);
  };

  const handleSaveSeatChange = () => {
    if (!editingSeatReservation || !newSeatNumber) return;
    
    updateSeatMutation.mutate({
      reservationId: editingSeatReservation.id,
      seatNumber: newSeatNumber,
    });
  };

  const handleCancelEdit = () => {
    setEditingSeatReservation(null);
    setNewSeatNumber(null);
    setEditClientName("");
    setEditCpfOrRg("");
    setEditEmbarque("");
  };

  const handleSavePassengerData = () => {
    if (!editingSeatReservation) return;
    
    const hasDataChanged = 
      editClientName !== editingSeatReservation.client_name ||
      editCpfOrRg.trim() !== "" ||
      editEmbarque.trim() !== "";
    
    if (!hasDataChanged && newSeatNumber === editingSeatReservation.seat_number) {
      toast({
        title: "Nenhuma alteração",
        description: "Nenhum dado foi modificado.",
        variant: "destructive",
      });
      return;
    }
    
    if (newSeatNumber !== editingSeatReservation.seat_number) {
      updateSeatMutation.mutate({
        reservationId: editingSeatReservation.id,
        seatNumber: newSeatNumber!,
      });
    }
    
    if (hasDataChanged) {
      updatePassengerDataMutation.mutate({
        reservationId: editingSeatReservation.id,
        clientId: editingSeatReservation.client_id,
        clientName: editClientName !== editingSeatReservation.client_name ? editClientName : undefined,
        cpfOrRg: editCpfOrRg.trim() || undefined,
        embarque: editEmbarque.trim() || undefined,
      });
    }
  };

  const handleCancelManualAssignment = () => {
    setManualAssignmentSeat(null);
    setManualClientName("");
    setManualCpfOrRg("");
    setManualEmbarque("");
  };

  const handleSaveManualAssignment = () => {
    if (!manualAssignmentSeat || !manualClientName || !selectedDestination || !selectedBus) return;
    
    manualAssignmentMutation.mutate({
      destination_id: selectedDestination.id,
      bus_id: selectedBus.id,
      seat_number: manualAssignmentSeat,
      client_name: manualClientName,
      cpf_or_rg: manualCpfOrRg || undefined,
      departure_location: manualEmbarque || undefined,
    });
  };

  const handleDeleteSeat = () => {
    if (!editingSeatReservation) return;
    
    if (confirm(`Tem certeza que deseja remover o assento ${editingSeatReservation.seat_number} de ${editingSeatReservation.client_name}?`)) {
      deleteSeatMutation.mutate(editingSeatReservation.id);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedDestination || !selectedBus) return;
    
    try {
      await generateEmbarqueWord(selectedDestination, selectedBus, reservations);
      toast({
        title: "Arquivo Word gerado!",
        description: "O manifesto de passageiros foi gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o arquivo Word. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPassengerModal = (pdfType: "embarque" | "motorista" | "hotel" | "lista_completa") => {
    if (!selectedDestination || !selectedBus) return;
    if (isLoadingPassengers) {
      toast({
        title: "Carregando dados...",
        description: "Aguarde enquanto os dados dos passageiros são carregados.",
      });
      return;
    }
    setPendingPDFType(pdfType);
    setShowPassengerModal(true);
  };

  const handleGeneratePDFAfterReview = async () => {
    if (!selectedDestination || !selectedBus || !pendingPDFType) return;
    
    try {
      // Filter reservationsWithClients to exclude passengers marked for deletion
      // Uses the same uniqueKey format as the modal display
      const filteredPassengers = reservationsWithClients.filter((r: any, index: number) => {
        const uniqueKey = `${r.id || ''}-${r.client_name}-${index}`;
        return !deletedPassengerIds.has(uniqueKey);
      });
      
      if (pendingPDFType === "embarque") {
        await generateEmbarqueWord(selectedDestination, selectedBus, filteredPassengers);
        toast({ title: "Word Embarque gerado!", description: "A lista de embarque foi gerada com sucesso." });
      } else if (pendingPDFType === "motorista") {
        await generateMotoristaWord(selectedDestination, selectedBus, filteredPassengers);
        toast({ title: "Word Motorista gerado!", description: "A lista do motorista foi gerada com sucesso." });
      } else if (pendingPDFType === "hotel") {
        await generateHotelPDF(selectedDestination, selectedBus, filteredPassengers);
        toast({ title: "PDF Hotel gerado!", description: "A lista para o hotel foi gerada com sucesso." });
      } else if (pendingPDFType === "lista_completa") {
        await generateListaCompletaPDF(selectedDestination, selectedBus, filteredPassengers);
        toast({ title: "PDF Lista Completa gerado!", description: "A lista completa com telefones foi gerada com sucesso." });
      }
      setShowPassengerModal(false);
      setPendingPDFType(null);
      setDeletedPassengerIds(new Set());
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível gerar o arquivo Word. Tente novamente.", variant: "destructive" });
    }
  };

  const handleDeletePassengerFromModal = (uniqueKey: string, hasReservation: boolean, passengerId?: string) => {
    if (confirm("Tem certeza que deseja remover este passageiro de todas as listas de PDF?")) {
      setDeletedPassengerIds(prev => {
        const newSet = new Set(prev);
        newSet.add(uniqueKey);
        return newSet;
      });
      if (hasReservation && passengerId) {
        deleteSeatMutation.mutate(passengerId);
      }
    }
  };

  const getBusLayout = (isEditMode = false) => {
    if (!selectedBus) return null;

    const busType = selectedBus.type?.toLowerCase() || '';
    const totalSeats = selectedBus.total_seats;
    const reservedSeats = reservations.map(r => r.seat_number);
    
    const seatInfo: { [key: string]: string } = {};
    reservations.forEach(r => {
      seatInfo[r.seat_number] = r.client_name || "";
    });

    const editModeReservedSeats = isEditMode && editingSeatReservation 
      ? reservedSeats.filter(s => s !== editingSeatReservation.seat_number)
      : reservedSeats;
    
    const onSeatSelect = isEditMode 
      ? handleSeatChange 
      : (seatNumber: string) => {
          const isReserved = reservedSeats.includes(seatNumber);
          if (isReserved) {
            handleReservedSeatClick(seatNumber);
          } else {
            handleEmptySeatClick(seatNumber);
          }
        };
    
    const selectedSeat = isEditMode ? newSeatNumber : null;
    const isSelectable = isEditMode ? true : "all";
    const currentHighlightedSeat = isEditMode ? null : highlightedSeat;
    
    if (busType.includes('dd') && busType.includes('64')) {
      return (
        <DD64Layout
          reservedSeats={editModeReservedSeats}
          selectedSeat={selectedSeat}
          onSeatSelect={onSeatSelect}
          isSelectable={isSelectable}
          seatInfo={isEditMode ? {} : seatInfo}
          highlightedSeat={currentHighlightedSeat}
        />
      );
    } else if ((busType.includes('executivo') || busType.includes('46')) && totalSeats === 46) {
      return (
        <Executivo46Layout
          reservedSeats={editModeReservedSeats}
          selectedSeat={selectedSeat}
          onSeatSelect={onSeatSelect}
          isSelectable={isSelectable}
          seatInfo={isEditMode ? {} : seatInfo}
          highlightedSeat={currentHighlightedSeat}
        />
      );
    } else if ((busType.includes('grafico') || busType.includes('gráfico')) && totalSeats === 42) {
      return (
        <Grafico42Layout
          reservedSeats={editModeReservedSeats}
          selectedSeat={selectedSeat}
          onSeatSelect={onSeatSelect}
          isSelectable={isSelectable}
          seatInfo={isEditMode ? {} : seatInfo}
          highlightedSeat={currentHighlightedSeat}
        />
      );
    } else if ((busType.includes('ld') || busType.includes('leito')) && totalSeats === 44) {
      return (
        <LD44Layout
          reservedSeats={editModeReservedSeats}
          selectedSeat={selectedSeat}
          onSeatSelect={onSeatSelect}
          isSelectable={isSelectable}
          seatInfo={isEditMode ? {} : seatInfo}
          highlightedSeat={currentHighlightedSeat}
        />
      );
    } else {
      return (
        <GenericBusLayout
          totalSeats={totalSeats}
          reservedSeats={editModeReservedSeats}
          selectedSeat={selectedSeat}
          onSeatSelect={onSeatSelect}
          isSelectable={isSelectable}
          seatInfo={isEditMode ? {} : seatInfo}
          highlightedSeat={currentHighlightedSeat}
        />
      );
    }
  };

  const occupiedCount = reservations.length;
  const unassignedCount = unassignedClients.length;
  const availableCount = selectedBus ? Math.max(0, selectedBus.total_seats - occupiedCount - unassignedCount) : 0;

  return (
    <div className="space-y-1">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Visualizar Ocupação de Ônibus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Selecione o Destino</label>
              <Select
                value={selectedDestinationId}
                onValueChange={setSelectedDestinationId}
                disabled={destinationsLoading}
              >
                <SelectTrigger data-testid="select-destination-occupancy">
                  <SelectValue placeholder="Escolha um destino" />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id}>
                      {destination.name} ({destination.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDestination && selectedBus && reservations.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => handleOpenPassengerModal("embarque")}
                  variant="outline"
                  size="sm"
                  data-testid="button-generate-embarque-word"
                  disabled={isLoadingPassengers}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {isLoadingPassengers ? "Carregando..." : "DOCX Embarque"}
                </Button>
                <Button
                  onClick={() => handleOpenPassengerModal("lista_completa")}
                  variant="outline"
                  size="sm"
                  data-testid="button-generate-lista-completa-pdf"
                  disabled={isLoadingPassengers}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {isLoadingPassengers ? "Carregando..." : "PDF Lista Completa"}
                </Button>
                <Button
                  onClick={() => handleOpenPassengerModal("motorista")}
                  variant="outline"
                  size="sm"
                  data-testid="button-generate-motorista-word"
                  disabled={isLoadingPassengers}
                >
                  <BusIcon className="h-4 w-4 mr-2" />
                  {isLoadingPassengers ? "Carregando..." : "DOCX Motorista"}
                </Button>
                <Button
                  onClick={() => handleOpenPassengerModal("hotel")}
                  variant="outline"
                  size="sm"
                  data-testid="button-generate-hotel-pdf"
                  disabled={isLoadingPassengers}
                >
                  <Hotel className="h-4 w-4 mr-2" />
                  {isLoadingPassengers ? "Carregando..." : "PDF Hotel"}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedBus && selectedDestination) {
                      const seatInfo: { [key: string]: string } = {};
                      reservationsWithClients.forEach((r: any) => {
                        if (r.seat_number && r.client_name) {
                          seatInfo[r.seat_number] = r.client_name;
                        }
                      });
                      generateBusGraphicPDF(
                        selectedBus.name,
                        selectedBus.type || '',
                        selectedBus.total_seats,
                        selectedDestination.name,
                        seatInfo
                      );
                      toast({ title: "PDF gerado!", description: "Gráfico do ônibus salvo com sucesso." });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  data-testid="button-generate-bus-graphic-pdf"
                >
                  <BusIcon className="h-4 w-4 mr-2" />
                  Gráfico Ônibus
                </Button>
              </div>
            )}
          </div>

          {!selectedDestination && (
            <div className="text-center py-1 text-muted-foreground">
              Selecione um destino para visualizar a ocupação do ônibus
            </div>
          )}

          {selectedDestination && !selectedBus && (
            <div className="text-center py-1 text-muted-foreground">
              Este destino não possui um ônibus configurado
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBus && selectedDestination && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedBus.name} - {selectedDestination.name}
              </CardTitle>
              <div className="flex gap-3 flex-wrap">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                  <span className="text-green-700 dark:text-green-300">
                    {availableCount} Disponíveis
                  </span>
                </Badge>
                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
                  <span className="text-red-700 dark:text-red-300">
                    {occupiedCount} Ocupados
                  </span>
                </Badge>
                {unassignedCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20">
                    <span className="text-yellow-700 dark:text-yellow-300">
                      {unassignedCount} Aguardando Assento
                    </span>
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="text-center py-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando assentos...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Dicas:</strong> Clique em um assento <span className="text-red-600 font-semibold">vermelho</span> (ocupado) para editar, ou <span className="text-green-600 font-semibold">verde</span> (disponível) para atribuir um cliente.
                  </p>
                </div>
                
                <div className="mb-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar passageiro pelo nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPassenger()}
                      className="pl-10"
                      data-testid="input-search-passenger"
                    />
                  </div>
                  <Button 
                    onClick={handleSearchPassenger}
                    disabled={!searchQuery.trim()}
                    data-testid="button-search-passenger"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>

                <div ref={busLayoutRef}>
                  {getBusLayout(false)}
                </div>

                {reservations.length === 0 && (
                  <p className="text-center mt-1 text-muted-foreground">
                    Nenhum assento reservado ainda
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingSeatReservation} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="h-5 w-5" />
              Editar Assento do Cliente
            </DialogTitle>
          </DialogHeader>
          
          {editingSeatReservation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Assento atual: <Badge>{editingSeatReservation.seat_number}</Badge></p>
                {newSeatNumber && newSeatNumber !== editingSeatReservation.seat_number && (
                  <p className="text-sm mt-2">Novo assento: <Badge variant="default">{newSeatNumber}</Badge></p>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-medium">Dados do Passageiro:</p>
                
                <div>
                  <Label htmlFor="edit-client-name">Nome Completo</Label>
                  <Input
                    id="edit-client-name"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    placeholder="Nome completo do passageiro"
                    data-testid="input-edit-client-name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-cpf-rg">CPF ou RG</Label>
                  <Input
                    id="edit-cpf-rg"
                    value={editCpfOrRg}
                    onChange={(e) => setEditCpfOrRg(e.target.value)}
                    placeholder="CPF ou RG do passageiro"
                    data-testid="input-edit-cpf-rg"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-embarque">Local de Embarque</Label>
                  <Input
                    id="edit-embarque"
                    value={editEmbarque}
                    onChange={(e) => setEditEmbarque(e.target.value)}
                    placeholder="Local de embarque"
                    data-testid="input-edit-embarque"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Selecione um novo assento:</p>
                {getBusLayout(true)}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 flex justify-start">
              <Button
                variant="destructive"
                onClick={handleDeleteSeat}
                disabled={deleteSeatMutation.isPending || updateSeatMutation.isPending}
                data-testid="button-delete-seat"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteSeatMutation.isPending ? 'Removendo...' : 'Remover Assento'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updateSeatMutation.isPending || deleteSeatMutation.isPending}
                data-testid="button-cancel-edit-seat"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSavePassengerData}
                disabled={updateSeatMutation.isPending || deleteSeatMutation.isPending || updatePassengerDataMutation.isPending}
                data-testid="button-save-edit-seat"
              >
                <Save className="h-4 w-4 mr-2" />
                {(updateSeatMutation.isPending || updatePassengerDataMutation.isPending) ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manualAssignmentSeat} onOpenChange={(open) => !open && handleCancelManualAssignment()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Cliente ao Assento {manualAssignmentSeat}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Nome do Cliente *</Label>
              <Input
                id="client-name"
                value={manualClientName}
                onChange={(e) => setManualClientName(e.target.value)}
                placeholder="Digite o nome completo"
                data-testid="input-manual-client-name"
              />
            </div>

            <div>
              <Label htmlFor="cpf-rg">CPF ou RG</Label>
              <Input
                id="cpf-rg"
                value={manualCpfOrRg}
                onChange={(e) => setManualCpfOrRg(e.target.value)}
                placeholder="Digite o CPF ou RG (opcional)"
                data-testid="input-manual-cpf-rg"
              />
            </div>

            <div>
              <Label htmlFor="embarque">Local de Embarque</Label>
              <Input
                id="embarque"
                value={manualEmbarque}
                onChange={(e) => setManualEmbarque(e.target.value)}
                placeholder="Digite o local de embarque (opcional)"
                data-testid="input-manual-embarque"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelManualAssignment}
              disabled={manualAssignmentMutation.isPending}
              data-testid="button-cancel-manual-assignment"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveManualAssignment}
              disabled={!manualClientName || manualAssignmentMutation.isPending}
              data-testid="button-save-manual-assignment"
            >
              <Save className="h-4 w-4 mr-2" />
              {manualAssignmentMutation.isPending ? 'Salvando...' : 'Adicionar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPassengerModal} onOpenChange={(open) => { if (!open) { setShowPassengerModal(false); setPendingPDFType(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Passageiros antes de Gerar Documento
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando apenas passageiros com assento no ônibus. Você pode remover passageiros antes de gerar o arquivo.
            </p>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {reservationsWithClients && reservationsWithClients.length > 0 ? (
              [...reservationsWithClients].sort((a: any, b: any) => {
                const nameA = (a.client_name || '').toLowerCase();
                const nameB = (b.client_name || '').toLowerCase();
                return nameA.localeCompare(nameB);
              }).map((passenger: any, index: number) => {
                const uniqueKey = `${passenger.id || ''}-${passenger.client_name}-${index}`;
                const isDeleted = deletedPassengerIds.has(uniqueKey);
                
                const getCpfRgString = () => {
                  if ((passenger.is_child || passenger.passenger_type === 'companion') && (passenger.child_data || passenger.child)) {
                    const child = passenger.child_data || passenger.child;
                    return child.cpf || child.rg;
                  }
                  return passenger.client?.cpf || passenger.client?.rg;
                };
                const cpfOrRg = getCpfRgString();
                
                return (
                  <div 
                    key={uniqueKey} 
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-opacity ${isDeleted ? 'opacity-50 line-through' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{passenger.client_name}</p>
                      <p className="text-xs text-muted-foreground">Assento: {passenger.seat_number}</p>
                      {cpfOrRg && (
                        <p className="text-xs text-muted-foreground">CPF/RG: {cpfOrRg}</p>
                      )}
                      {isDeleted && <p className="text-xs text-red-600 font-semibold mt-1">Será removido do documento</p>}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePassengerFromModal(uniqueKey, true, passenger.id)}
                      disabled={deleteSeatMutation.isPending || isDeleted}
                      data-testid={`button-delete-passenger-${uniqueKey}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum passageiro com assento atribuído</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowPassengerModal(false); setPendingPDFType(null); }}
              disabled={deleteSeatMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGeneratePDFAfterReview}
              disabled={deleteSeatMutation.isPending}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Gerar Arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnassignedClientsModal} onOpenChange={(open) => !open && handleCloseUnassignedModal()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Atribuir Passageiro ao Assento {selectedEmptySeat}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Clique em "Atribuir" para designar ao assento. Clientes e acompanhantes sem assento estão listados abaixo.
            </p>
          </DialogHeader>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar passageiros pelo nome..."
                value={unassignedClientFilter}
                onChange={(e) => setUnassignedClientFilter(e.target.value)}
                className="pl-10"
                data-testid="input-filter-unassigned-clients"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {isLoadingUnassigned ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando passageiros...</p>
              </div>
            ) : unassignedClients.length > 0 ? (
              unassignedClients
                .filter((passenger: any) => {
                  if (!unassignedClientFilter.trim()) return true;
                  const name = passenger.name?.toLowerCase() || '';
                  return name.includes(unassignedClientFilter.toLowerCase());
                })
                .map((passenger: any) => (
                  <div 
                    key={passenger.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`unassigned-passenger-${passenger.id}`}
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleAssignExistingClient(passenger)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{passenger.name}</p>
                        {passenger.type === 'companion' && (
                          <Badge variant="secondary" className="text-xs">Acompanhante</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passenger.cpf && `CPF: ${passenger.cpf.substring(0, 3)}...`}
                        {passenger.departure_location && ` | Embarque: ${passenger.departure_location}`}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button
                        size="sm"
                        disabled={assignExistingClientMutation.isPending}
                        onClick={() => handleAssignExistingClient(passenger)}
                        data-testid={`button-assign-passenger-${passenger.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Atribuir
                      </Button>
                      {passenger.type === 'client' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteClientMutation.isPending}
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover ${passenger.name} do destino?`)) {
                              deleteClientMutation.mutate(passenger.client_id);
                            }
                          }}
                          data-testid={`button-delete-passenger-${passenger.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {passenger.type === 'companion' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteCompanionMutation.isPending}
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover o acompanhante ${passenger.name}?`)) {
                              deleteCompanionMutation.mutate(passenger.child_id);
                            }
                          }}
                          data-testid={`button-delete-companion-${passenger.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Nenhum passageiro sem assento encontrado para este destino.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleCloseUnassignedModal}
              disabled={assignExistingClientMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


