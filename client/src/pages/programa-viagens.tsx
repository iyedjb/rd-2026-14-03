import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveDestinations } from "@/hooks/use-destinations";
import { useBuses } from "@/hooks/use-buses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, Bus, Users, Info, Plane, Tag, Sparkles, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAllSeatReservations } from "@/hooks/use-seat-reservations";
import { useClients } from "@/hooks/use-clients";
import { getAvailableSeats } from "@/lib/seat-utils";
import type { Destination, Child } from "@shared/schema";

type CapacityData = {
  availableSeats: number;
  isSoldOut: boolean;
  totalPassengers: number;
  totalSeats: number;
};

export default function ProgramaViagens() {
  const { data: destinations, isLoading: isLoadingDestinations } = useActiveDestinations();
  const { data: buses } = useBuses();
  const { data: seatReservations } = useAllSeatReservations();
  const { clients } = useClients({ limit: 99999 });
  const { data: allChildren } = useQuery<Child[]>({
    queryKey: ['/api/children'],
  });
  const { data: capacities } = useQuery<Record<string, CapacityData>>({
    queryKey: ['/api/destinations/capacities'],
  });
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  const years = [2025, 2026, 2027];

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const filteredDestinations = destinations?.filter((dest) => {
    if (!selectedYear) return true;
    
    if (!dest.periodo_viagem_inicio) return false;
    
    const destYear = new Date(dest.periodo_viagem_inicio).getFullYear();
    return destYear === selectedYear;
  });

  // Group destinations by month when a year is selected
  const destinationsByMonth = useMemo(() => {
    if (!selectedYear || !filteredDestinations) return null;

    const grouped: Record<number, Destination[]> = {};

    filteredDestinations.forEach((dest) => {
      if (dest.periodo_viagem_inicio) {
        const month = new Date(dest.periodo_viagem_inicio).getMonth(); // 0-11
        if (!grouped[month]) {
          grouped[month] = [];
        }
        grouped[month].push(dest);
      }
    });

    // Sort destinations within each month by date
    Object.keys(grouped).forEach((monthKey) => {
      const month = parseInt(monthKey);
      grouped[month].sort((a, b) => {
        const dateA = a.periodo_viagem_inicio ? new Date(a.periodo_viagem_inicio).getTime() : 0;
        const dateB = b.periodo_viagem_inicio ? new Date(b.periodo_viagem_inicio).getTime() : 0;
        return dateA - dateB;
      });
    });

    return grouped;
  }, [selectedYear, filteredDestinations]);

  const getBusName = (busId?: string) => {
    if (!busId || !buses) return "Não especificado";
    const bus = buses.find((b) => b.id === busId);
    return bus ? `${bus.name} (${bus.total_seats} assentos)` : "Não especificado";
  };

  const getAvailableSeatsCount = (destination: Destination) => {
    return getAvailableSeats(destination, buses, seatReservations, clients, allChildren);
  };

  const isSoldOut = (destination: Destination) => {
    const available = getAvailableSeatsCount(destination);
    return available !== null && available <= 0;
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return "A definir";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getKidsPolicyText = (policy?: string) => {
    if (policy === "yes") return "Aceita crianças 5+ anos com assento";
    if (policy === "no") return "Crianças 5 anos ou menos sem assento próprio";
    return "Política não especificada";
  };

  const getOperadoraText = (operadora?: string) => {
    const operadoras: Record<string, string> = {
      azul_viagens: "Azul Viagens",
      cvc: "CVC",
      patria: "Pátria Viagens",
      next_tour: "Next Tour",
      galaxia: "Galáxia"
    };
    return operadora ? operadoras[operadora] || operadora : "Não especificada";
  };

  const isBlackFridayFlagged = (destination: Destination) => {
    return destination.is_black_friday === true;
  };

  const getBlackFridayStatus = (destination: Destination) => {
    if (!destination.is_black_friday) return 'none';
    
    const now = new Date();
    const start = destination.black_friday_start ? new Date(destination.black_friday_start) : null;
    const end = destination.black_friday_end ? new Date(destination.black_friday_end) : null;
    
    if (start && now < start) return 'upcoming';
    if (end && now > end) return 'expired';
    if (start && end && now >= start && now <= end) return 'active';
    if (start && !end && now >= start) return 'active';
    if (!start && end && now <= end) return 'active';
    return 'active';
  };

  const activeBlackFridayDestinations = useMemo(() => {
    if (!filteredDestinations) return [];
    return filteredDestinations.filter((dest) => {
      if (!isBlackFridayFlagged(dest)) return false;
      const status = getBlackFridayStatus(dest);
      return status === 'active' || status === 'upcoming';
    });
  }, [filteredDestinations]);

  const expiredBlackFridayDestinations = useMemo(() => {
    if (!filteredDestinations) return [];
    return filteredDestinations.filter((dest) => {
      if (!isBlackFridayFlagged(dest)) return false;
      const status = getBlackFridayStatus(dest);
      return status === 'expired';
    });
  }, [filteredDestinations]);

  const regularDestinations = useMemo(() => {
    if (!filteredDestinations) return [];
    return filteredDestinations.filter((dest) => !isBlackFridayFlagged(dest));
  }, [filteredDestinations]);

  const expiredBlackFridayAsRegular = useMemo(() => {
    if (!filteredDestinations) return [];
    return filteredDestinations.filter((dest) => {
      if (!isBlackFridayFlagged(dest)) return false;
      return getBlackFridayStatus(dest) === 'expired';
    });
  }, [filteredDestinations]);

  const allRegularDestinations = useMemo(() => {
    return [...regularDestinations, ...expiredBlackFridayAsRegular];
  }, [regularDestinations, expiredBlackFridayAsRegular]);

  const renderDestinationCard = (destination: Destination) => (
    <Card 
      key={destination.id} 
      className={`hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group ${isSoldOut(destination) ? 'opacity-75' : ''}`}
      data-testid={`card-destination-${destination.id}`}
      onClick={() => setSelectedDestination(destination)}
    >
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-teal-500/10 border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        {isSoldOut(destination) && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-red-600 text-white font-bold border-0 shadow-lg" data-testid={`badge-sold-out-${destination.id}`}>
              ESGOTADO
            </Badge>
          </div>
        )}
        <div className={`flex items-start justify-between relative z-10 ${isSoldOut(destination) ? 'mt-6' : ''}`}>
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
              <MapPin className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              {destination.name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {destination.country}
            </CardDescription>
          </div>
          {destination.price && (
            <Badge variant="secondary" className="text-base font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100">
              R$ {destination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-emerald-600/60 group-hover:text-emerald-600 transition-colors font-medium">
          Clique para detalhes →
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3">
        {/* Travel Period */}
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Período da Viagem</p>
            <p className="text-muted-foreground">
              {formatDate(destination.periodo_viagem_inicio)} até {formatDate(destination.periodo_viagem_fim)}
            </p>
          </div>
        </div>

        {/* Bus Type and Available Seats */}
        <div className="flex items-start gap-2 text-sm">
          <Bus className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Tipo de Ônibus</p>
            <p className="text-muted-foreground">{getBusName(destination.bus_id)}</p>
            {getAvailableSeatsCount(destination) !== null && (
              <div className="mt-1">
                <Badge 
                  variant={getAvailableSeatsCount(destination)! > 10 ? "default" : getAvailableSeatsCount(destination)! > 0 ? "secondary" : "destructive"}
                  className="text-xs"
                  data-testid={`badge-available-seats-${destination.id}`}
                >
                  {getAvailableSeatsCount(destination)! > 0 
                    ? `${getAvailableSeatsCount(destination)} lugares disponíveis` 
                    : "Esgotado"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Kids Policy */}
        <div className="flex items-start gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Política de Crianças</p>
            <p className="text-muted-foreground">{getKidsPolicyText(destination.kids_policy)}</p>
          </div>
        </div>

        {/* Price Details */}
        {destination.price && (
          <div className="flex items-start gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Valor por Pessoa</p>
              <p className="text-muted-foreground">
                R$ {destination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Tour Operator */}
        {destination.operadora && (
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Operadora</p>
              <p className="text-muted-foreground">{getOperadoraText(destination.operadora)}</p>
            </div>
          </div>
        )}

        {/* Departure Location and Time */}
        {(destination.embarque || destination.horario_saida) && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Embarque</p>
            {destination.embarque && (
              <p className="text-muted-foreground text-sm">Local: {destination.embarque}</p>
            )}
            {destination.horario_saida && (
              <p className="text-muted-foreground text-sm">Horário de Saída: {destination.horario_saida}</p>
            )}
          </div>
        )}

        {/* Return Location and Time */}
        {(destination.retorno || destination.horario_volta) && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Retorno</p>
            {destination.retorno && (
              <p className="text-muted-foreground text-sm">Local: {destination.retorno}</p>
            )}
            {destination.horario_volta && (
              <p className="text-muted-foreground text-sm">Horário de Volta: {destination.horario_volta}</p>
            )}
          </div>
        )}

        {/* Transportation Details */}
        {destination.transporte && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Transporte</p>
            <p className="text-muted-foreground text-sm line-clamp-2">{destination.transporte}</p>
          </div>
        )}

        {/* Accommodation */}
        {destination.hospedagem && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Hospedagem</p>
            <p className="text-muted-foreground text-sm line-clamp-2">{destination.hospedagem}</p>
          </div>
        )}

        {/* Additional Tours */}
        {destination.passeios_adicionais && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Passeios Adicionais</p>
            <p className="text-muted-foreground text-sm line-clamp-2">{destination.passeios_adicionais}</p>
            <p className="text-xs text-muted-foreground italic mt-1">(Cobrados à parte)</p>
          </div>
        )}

        {/* Description */}
        {destination.description && (
          <div className="pt-2 border-t">
            <p className="font-medium text-sm">Descrição</p>
            <p className="text-muted-foreground text-sm line-clamp-3">{destination.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderBlackFridayCard = (destination: Destination) => (
    <Card 
      key={destination.id} 
      className={`hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 border-red-500 bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden ${isSoldOut(destination) ? 'opacity-75' : ''}`}
      data-testid={`card-black-friday-destination-${destination.id}`}
      onClick={() => setSelectedDestination(destination)}
    >
      {/* Animated sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-4 animate-pulse">
          <Sparkles className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="absolute top-8 right-6 animate-pulse delay-150">
          <Sparkles className="h-3 w-3 text-red-400" />
        </div>
        <div className="absolute bottom-12 left-8 animate-pulse delay-300">
          <Sparkles className="h-3 w-3 text-yellow-300" />
        </div>
      </div>
      
      <CardHeader className="bg-gradient-to-r from-red-600/30 via-red-500/20 to-orange-500/30 border-b border-red-500/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-yellow-400/20 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        
        {/* Black Friday Badge */}
        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-red-600 text-white font-bold animate-pulse border-0 shadow-lg shadow-red-500/50">
            <Tag className="h-3 w-3 mr-1" />
            BLACK FRIDAY
          </Badge>
        </div>
        
        {/* Sold Out Badge */}
        {isSoldOut(destination) && (
          <div className="absolute top-10 right-2 z-20">
            <Badge className="bg-gray-800 text-white font-bold border-2 border-white shadow-lg" data-testid={`badge-black-friday-sold-out-${destination.id}`}>
              ESGOTADO
            </Badge>
          </div>
        )}
        
        <div className="flex items-start justify-between relative z-10 mt-4">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2 text-white group-hover:text-yellow-300 transition-colors">
              <MapPin className="h-5 w-5 text-red-400 group-hover:scale-110 transition-transform" />
              {destination.name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1 text-gray-300">
              <Plane className="h-3 w-3" />
              {destination.country}
            </CardDescription>
          </div>
        </div>
        
        {/* Status indicator for upcoming/expired */}
        {getBlackFridayStatus(destination) === 'upcoming' && (
          <Badge className="absolute top-2 left-2 bg-yellow-600 text-white text-xs z-20">
            Em breve
          </Badge>
        )}
        {getBlackFridayStatus(destination) === 'expired' && (
          <Badge className="absolute top-2 left-2 bg-gray-600 text-white text-xs z-20">
            Encerrada
          </Badge>
        )}
        
        {/* Price Section with original crossed out and promotional price */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {destination.price && destination.black_friday_price && (
            <span className="text-gray-400 line-through text-sm">
              R$ {destination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {destination.black_friday_price ? (
            <Badge className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
              R$ {destination.black_friday_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          ) : destination.price && (
            <Badge className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
              R$ {destination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </div>
        
        <div className="absolute bottom-2 right-2 text-xs text-yellow-400/80 group-hover:text-yellow-300 transition-colors font-medium">
          Clique para detalhes →
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3 bg-gradient-to-b from-gray-900 to-black">
        {/* Travel Period */}
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-100">Período da Viagem</p>
            <p className="text-gray-400">
              {formatDate(destination.periodo_viagem_inicio)} até {formatDate(destination.periodo_viagem_fim)}
            </p>
          </div>
        </div>

        {/* Bus Type and Available Seats */}
        <div className="flex items-start gap-2 text-sm">
          <Bus className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-gray-100">Tipo de Ônibus</p>
            <p className="text-gray-400">{getBusName(destination.bus_id)}</p>
            {getAvailableSeatsCount(destination) !== null && (
              <div className="mt-1">
                <Badge 
                  className={`text-xs ${getAvailableSeatsCount(destination)! > 10 
                    ? "bg-green-600 text-white" 
                    : getAvailableSeatsCount(destination)! > 0 
                      ? "bg-yellow-600 text-white" 
                      : "bg-red-800 text-white"}`}
                  data-testid={`badge-black-friday-available-seats-${destination.id}`}
                >
                  {getAvailableSeatsCount(destination)! > 0 
                    ? `${getAvailableSeatsCount(destination)} lugares disponíveis` 
                    : "Esgotado"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Kids Policy */}
        <div className="flex items-start gap-2 text-sm">
          <Users className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-100">Política de Crianças</p>
            <p className="text-gray-400">{getKidsPolicyText(destination.kids_policy)}</p>
          </div>
        </div>

        {/* Savings Highlight */}
        {destination.price && destination.black_friday_price && destination.price > destination.black_friday_price && (
          <div className="bg-gradient-to-r from-red-600/20 to-orange-500/20 border border-red-500/50 rounded-lg p-3 mt-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">
                Economia de R$ {(destination.price - destination.black_friday_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Tour Operator */}
        {destination.operadora && (
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-100">Operadora</p>
              <p className="text-gray-400">{getOperadoraText(destination.operadora)}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {destination.description && (
          <div className="pt-2 border-t border-gray-700">
            <p className="font-medium text-sm text-gray-100">Descrição</p>
            <p className="text-gray-400 text-sm line-clamp-3">{destination.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoadingDestinations) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Destination Details Modal */}
      <Dialog open={!!selectedDestination} onOpenChange={(open) => { if (!open) setSelectedDestination(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDestination && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-emerald-600" />
                  {selectedDestination.name}
                </DialogTitle>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Plane className="h-4 w-4" />
                  {selectedDestination.country}
                </p>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Price Section - Black Friday (active/upcoming) or Regular */}
                {isBlackFridayFlagged(selectedDestination) && getBlackFridayStatus(selectedDestination) !== 'expired' ? (
                  <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-6 rounded-2xl border-2 border-red-500 relative overflow-hidden">
                    {/* Animated sparkle effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-2 left-4 animate-pulse">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div className="absolute top-4 right-8 animate-pulse delay-150">
                        <Sparkles className="h-3 w-3 text-red-400" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-600 text-white font-bold animate-pulse border-0 shadow-lg shadow-red-500/50">
                            <Tag className="h-3 w-3 mr-1" />
                            BLACK FRIDAY
                          </Badge>
                          {getBlackFridayStatus(selectedDestination) === 'upcoming' && (
                            <Badge className="bg-yellow-600 text-white text-xs">Em breve</Badge>
                          )}
                        </div>
                        {selectedDestination.price && selectedDestination.black_friday_price && (
                          <p className="text-gray-400 line-through text-lg">
                            De: R$ {selectedDestination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {selectedDestination.black_friday_price ? (
                          <p className="text-4xl font-bold text-red-500 mt-1">
                            R$ {selectedDestination.black_friday_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        ) : selectedDestination.price && (
                          <p className="text-4xl font-bold text-red-500 mt-1">
                            R$ {selectedDestination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {selectedDestination.price && selectedDestination.black_friday_price && selectedDestination.price > selectedDestination.black_friday_price && (
                          <p className="text-yellow-400 font-bold mt-2">
                            Economia de R$ {(selectedDestination.price - selectedDestination.black_friday_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                      <Tag className="h-16 w-16 text-red-500/30" />
                    </div>
                  </div>
                ) : isBlackFridayFlagged(selectedDestination) && getBlackFridayStatus(selectedDestination) === 'expired' ? (
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-gray-500 text-white">
                            <Archive className="h-3 w-3 mr-1" />
                            Promoção Black Friday Encerrada
                          </Badge>
                        </div>
                        {selectedDestination.black_friday_price && (
                          <p className="text-gray-400 line-through text-sm">
                            Preço promocional era: R$ {selectedDestination.black_friday_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <p className="text-sm font-medium text-muted-foreground mt-2">Valor Atual por Pessoa</p>
                        <p className="text-4xl font-bold text-emerald-600 mt-1">
                          R$ {selectedDestination.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                        </p>
                        {selectedDestination.black_friday_end && (
                          <p className="text-xs text-gray-500 mt-2">
                            Promoção encerrou em: {formatDate(selectedDestination.black_friday_end)}
                          </p>
                        )}
                      </div>
                      <Archive className="h-16 w-16 text-gray-400/30" />
                    </div>
                  </div>
                ) : selectedDestination.price && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor por Pessoa</p>
                        <p className="text-4xl font-bold text-emerald-600 mt-1">
                          R$ {selectedDestination.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <DollarSign className="h-16 w-16 text-emerald-600/20" />
                    </div>
                  </div>
                )}

                {/* Travel Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      <p className="font-semibold">Período da Viagem</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedDestination.periodo_viagem_inicio)} até {formatDate(selectedDestination.periodo_viagem_fim)}
                    </p>
                  </div>

                  <div className="bg-card p-4 rounded-xl border">
                    <div className="flex items-center gap-2 mb-2">
                      <Bus className="h-5 w-5 text-emerald-600" />
                      <p className="font-semibold">Tipo de Ônibus</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{getBusName(selectedDestination.bus_id)}</p>
                    {getAvailableSeatsCount(selectedDestination) !== null && (
                      <Badge 
                        variant={getAvailableSeatsCount(selectedDestination)! > 10 ? "default" : getAvailableSeatsCount(selectedDestination)! > 0 ? "secondary" : "destructive"}
                        className="mt-2"
                      >
                        {getAvailableSeatsCount(selectedDestination)! > 0 
                          ? `${getAvailableSeatsCount(selectedDestination)} lugares disponíveis` 
                          : "Esgotado"}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-card p-4 rounded-xl border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-emerald-600" />
                      <p className="font-semibold">Política de Crianças</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{getKidsPolicyText(selectedDestination.kids_policy)}</p>
                  </div>

                  {selectedDestination.operadora && (
                    <div className="bg-card p-4 rounded-xl border">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-5 w-5 text-emerald-600" />
                        <p className="font-semibold">Operadora</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{getOperadoraText(selectedDestination.operadora)}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedDestination.description && (
                  <div className="bg-card p-4 rounded-xl border">
                    <p className="font-semibold mb-2">Descrição</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedDestination.description}</p>
                  </div>
                )}

                {/* Departure and Return */}
                {(selectedDestination.embarque || selectedDestination.horario_saida || selectedDestination.retorno || selectedDestination.horario_volta) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(selectedDestination.embarque || selectedDestination.horario_saida) && (
                      <div className="bg-card p-4 rounded-xl border">
                        <p className="font-semibold mb-2">Embarque</p>
                        {selectedDestination.embarque && (
                          <p className="text-sm text-muted-foreground">Local: {selectedDestination.embarque}</p>
                        )}
                        {selectedDestination.horario_saida && (
                          <p className="text-sm text-muted-foreground">Horário: {selectedDestination.horario_saida}</p>
                        )}
                      </div>
                    )}

                    {(selectedDestination.retorno || selectedDestination.horario_volta) && (
                      <div className="bg-card p-4 rounded-xl border">
                        <p className="font-semibold mb-2">Retorno</p>
                        {selectedDestination.retorno && (
                          <p className="text-sm text-muted-foreground">Local: {selectedDestination.retorno}</p>
                        )}
                        {selectedDestination.horario_volta && (
                          <p className="text-sm text-muted-foreground">Horário: {selectedDestination.horario_volta}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Services */}
                {(selectedDestination.transporte || selectedDestination.hospedagem || selectedDestination.passeios_adicionais) && (
                  <div className="space-y-3">
                    {selectedDestination.transporte && (
                      <div className="bg-card p-4 rounded-xl border">
                        <p className="font-semibold mb-2">Transporte</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedDestination.transporte}</p>
                      </div>
                    )}

                    {selectedDestination.hospedagem && (
                      <div className="bg-card p-4 rounded-xl border">
                        <p className="font-semibold mb-2">Hospedagem</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedDestination.hospedagem}</p>
                      </div>
                    )}

                    {selectedDestination.passeios_adicionais && (
                      <div className="bg-card p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                        <p className="font-semibold mb-2">Passeios Adicionais</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedDestination.passeios_adicionais}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic mt-2">* Cobrados à parte</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Programa de Viagens
        </h1>
        <p className="text-muted-foreground mt-1">
          Explore todos os destinos disponíveis com informações completas
        </p>
      </div>

      {/* Year Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por ano:</span>
        <Button
          variant={selectedYear === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedYear(null)}
          data-testid="button-filter-all"
        >
          Todos os anos
        </Button>
        {years.map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedYear(year)}
            data-testid={`button-filter-${year}`}
          >
            {year}
          </Button>
        ))}
      </div>

      {/* Black Friday Section - Active/Upcoming offers only */}
      {activeBlackFridayDestinations.length > 0 && (
        <div className="space-y-4" data-testid="section-black-friday">
          <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 rounded-2xl p-6 border-2 border-red-500 relative overflow-hidden">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 left-8 animate-pulse">
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="absolute top-6 right-12 animate-pulse delay-150">
                <Sparkles className="h-5 w-5 text-red-400" />
              </div>
              <div className="absolute bottom-4 left-16 animate-pulse delay-300">
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </div>
              <div className="absolute bottom-6 right-20 animate-pulse delay-500">
                <Sparkles className="h-5 w-5 text-orange-400" />
              </div>
            </div>
            
            <div className="relative z-10 flex items-center justify-center gap-4">
              <Tag className="h-8 w-8 text-red-500" />
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-wider">
                BLACK FRIDAY
              </h2>
              <Tag className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-center text-gray-400 mt-2 relative z-10">
              Ofertas exclusivas por tempo limitado!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeBlackFridayDestinations.map((destination) => renderBlackFridayCard(destination))}
          </div>
        </div>
      )}

      {/* Destinations with Tabs for Active and Archived */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active-destinations">
            Destinos Ativos
          </TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived-black-friday">
            <Archive className="mr-2 h-4 w-4" />
            Black Friday Arquivados ({expiredBlackFridayDestinations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6 mt-6">
          {/* Destinations - Grouped by Month or Regular Grid */}
          {selectedYear && destinationsByMonth ? (
            // Show destinations grouped by month
            <div className="space-y-8">
              {monthNames.map((monthName, monthIndex) => {
                const monthDestinations = destinationsByMonth[monthIndex];
                const regularMonthDestinations = monthDestinations?.filter((dest) => {
                  if (!isBlackFridayFlagged(dest)) return true;
                  const status = getBlackFridayStatus(dest);
                  return status === 'expired';
                }) || [];
                
                if (!regularMonthDestinations || regularMonthDestinations.length === 0) {
                  return null;
                }

                return (
                  <div key={monthIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-border flex-1" />
                      <h2 className="text-2xl font-bold text-primary" data-testid={`text-month-${monthName.toLowerCase()}`}>
                        {monthName}
                      </h2>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {regularMonthDestinations.map((destination) => renderDestinationCard(destination))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show all destinations in a regular grid when no year is selected
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allRegularDestinations && allRegularDestinations.length > 0 ? (
                allRegularDestinations.map((destination) => renderDestinationCard(destination))
              ) : (
                activeBlackFridayDestinations.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Nenhum destino encontrado</h3>
                    <p className="text-muted-foreground">
                      {selectedYear 
                        ? `Não há destinos programados para ${selectedYear}` 
                        : "Não há destinos disponíveis no momento"}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {expiredBlackFridayDestinations.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-gray-800/50 via-gray-700/30 to-gray-800/50 rounded-xl p-4 border border-gray-600/50">
                <div className="flex items-center gap-2 text-gray-400">
                  <Archive className="h-5 w-5" />
                  <span className="font-medium">Ofertas Black Friday Encerradas</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Estas ofertas tiveram seu período promocional encerrado e voltaram ao preço normal.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {expiredBlackFridayDestinations.map((destination) => (
                  <Card 
                    key={destination.id} 
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer opacity-75 hover:opacity-100 border-gray-600/50" 
                    data-testid={`card-archived-black-friday-${destination.id}`}
                    onClick={() => setSelectedDestination(destination)}
                  >
                    <CardHeader className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b relative">
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-gray-500 text-white text-xs">
                          <Archive className="h-3 w-3 mr-1" />
                          Promoção Encerrada
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between pt-6">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            {destination.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            {destination.country}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-1">
                        {destination.black_friday_price && destination.price && (
                          <div className="text-xs text-gray-500">
                            <span className="line-through">Preço BF: R$ {destination.black_friday_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <Badge variant="secondary" className="text-base font-bold">
                          R$ {destination.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                        </Badge>
                        <p className="text-xs text-gray-500">Preço atual (normal)</p>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Período da Viagem</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(destination.periodo_viagem_inicio)} até {formatDate(destination.periodo_viagem_fim)}
                          </p>
                        </div>
                      </div>
                      
                      {destination.black_friday_end && (
                        <div className="flex items-start gap-2 text-sm">
                          <Tag className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Promoção encerrou em</p>
                            <p className="text-muted-foreground text-xs">
                              {formatDate(destination.black_friday_end)}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 text-center pt-2 border-t">
                        Clique para ver detalhes completos
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma oferta arquivada</h3>
              <p className="text-muted-foreground">
                Ofertas Black Friday expiradas aparecerão aqui após o término do período promocional.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary */}
      {filteredDestinations && filteredDestinations.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>
            Mostrando {filteredDestinations.length} destino{filteredDestinations.length !== 1 ? 's' : ''}
            {selectedYear ? ` para ${selectedYear}` : ' (todos os anos)'}
          </span>
        </div>
      )}
    </div>
  );
}
