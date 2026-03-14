import { Plus, Edit, Trash2, Archive, FileDown, TrendingUp, Receipt, MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseDateValue } from "@/lib/date-utils";
import { getAvailableSeats } from "@/lib/seat-utils";
import { type Destination, type Client, type Child } from "@shared/schema";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBuses } from "@/hooks/use-buses";
import { useAllSeatReservations } from "@/hooks/use-seat-reservations";
import { useClients } from "@/hooks/use-clients";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DestinationListProps {
  onEdit: (destination: Destination) => void;
  onAdd: () => void;
  isVadmin: boolean;
}

export function DestinationList({ onEdit, onAdd, isVadmin }: DestinationListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ['/api/destinations'],
  });

  const { data: buses } = useBuses();
  const { data: seatReservations } = useAllSeatReservations();
  const { clients } = useClients({ limit: 99999 });
  const { data: allChildren } = useQuery<Child[]>({
    queryKey: ['/api/children'],
  });

  const availableSeatsCount = (destination: Destination) => {
    return getAvailableSeats(destination, buses, seatReservations, clients, allChildren);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'] });
      toast({
        title: "Destino excluído",
        description: "O destino foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o destino.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const [previsaoDialogDest, setPrevisaoDialogDest] = useState<Destination | null>(null);
  const [fechamentoDialogDest, setFechamentoDialogDest] = useState<Destination | null>(null);

  const getTotalCosts = (dest: Destination) => {
    const frete = dest.frete ?? 0;
    const almoços = dest.custo_almoços ?? 0;
    const inclusos = dest.custo_inclusos ?? 0;
    return frete + almoços + inclusos;
  };

  const getEffectivePrice = (dest: Destination) => {
    if (dest.has_levels) {
      const prices = [dest.ouro_price, dest.prata_price, dest.bronze_price].filter((p): p is number => p != null && p > 0);
      if (prices.length > 0) return prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    return dest.price ?? dest.ouro_price ?? dest.prata_price ?? dest.bronze_price ?? 0;
  };

  const getOccupiedSeatsCount = (dest: Destination) => {
    return (seatReservations ?? []).filter((r) => r.destination_id === dest.id).length;
  };

  const getPrevisaoRecebimento = (dest: Destination) => {
    const bus = buses?.find((b) => b.id === dest.bus_id);
    const totalSeats = bus?.total_seats ?? 0;
    const seatsForSale = Math.max(0, totalSeats - 2);
    const price = getEffectivePrice(dest);
    const totalCosts = getTotalCosts(dest);
    const receitaEstimada = seatsForSale * price;
    const lucroEstimado = receitaEstimada - totalCosts;
    return { totalSeats, seatsForSale, price, totalCosts, receitaEstimada, lucroEstimado };
  };

  const getFechamento = (dest: Destination) => {
    const occupiedSeats = getOccupiedSeatsCount(dest);
    const price = getEffectivePrice(dest);
    const totalCosts = getTotalCosts(dest);
    const receitaReal = occupiedSeats * price;
    const lucroReal = receitaReal - totalCosts;
    return { occupiedSeats, price, totalCosts, receitaReal, lucroReal };
  };

  const generatePrevisaoPDF = (dest: Destination) => {
    const { totalSeats, seatsForSale, price, totalCosts, receitaEstimada, lucroEstimado } = getPrevisaoRecebimento(dest);
    const bus = buses?.find((b) => b.id === dest.bus_id);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('RODA BEM TURISMO', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(108, 194, 74);
    doc.text('Previsão de Recebimento', 15, 28);
    doc.setDrawColor(108, 194, 74);
    doc.setLineWidth(1);
    doc.line(15, 33, 195, 33);
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(dest.name, 15, 43);
    doc.setFontSize(10);
    const rows = [
      ['Assentos do ônibus', `${bus?.name ?? 'N/A'} (${totalSeats} assentos)`],
      ['Assentos para venda (total - 2)', String(seatsForSale)],
      ['Preço médio por assento', formatCurrency(price)],
      ['Receita bruta estimada', formatCurrency(receitaEstimada)],
      ['Custos (frete + almoços + inclusos)', formatCurrency(totalCosts)],
      ['Lucro estimado', formatCurrency(lucroEstimado)],
    ];
    autoTable(doc, {
      startY: 52,
      head: [['Item', 'Valor']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [108, 194, 74] },
      styles: { fontSize: 10 },
    });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 15, doc.internal.pageSize.getHeight() - 10);
    doc.save(`previsao-recebimento-${dest.name.replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: "PDF gerado", description: "Previsão de Recebimento exportada com sucesso." });
  };

  const generateFechamentoPDF = (dest: Destination) => {
    const { occupiedSeats, price, totalCosts, receitaReal, lucroReal } = getFechamento(dest);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('RODA BEM TURISMO', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(108, 194, 74);
    doc.text('Fechamento', 15, 28);
    doc.setDrawColor(108, 194, 74);
    doc.setLineWidth(1);
    doc.line(15, 33, 195, 33);
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(dest.name, 15, 43);
    doc.setFontSize(10);
    const rows = [
      ['Assentos ocupados', String(occupiedSeats)],
      ['Preço médio por assento', formatCurrency(price)],
      ['Receita real', formatCurrency(receitaReal)],
      ['Custos (frete + almoços + inclusos)', formatCurrency(totalCosts)],
      ['Lucro real', formatCurrency(lucroReal)],
    ];
    autoTable(doc, {
      startY: 52,
      head: [['Item', 'Valor']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [108, 194, 74] },
      styles: { fontSize: 10 },
    });
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 15, doc.internal.pageSize.getHeight() - 10);
    doc.save(`fechamento-${dest.name.replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: "PDF gerado", description: "Fechamento exportado com sucesso." });
  };

  // Separate active and archived destinations
  const { activeDestinations, archivedDestinations } = useMemo(() => {
    const now = new Date();
    const active: Destination[] = [];
    const archived: Destination[] = [];

    destinations.forEach((dest) => {
      const endDate = parseDateValue(dest.periodo_viagem_fim);
      
      if (endDate && endDate < now) {
        archived.push(dest);
      } else {
        active.push(dest);
      }
    });

    return { activeDestinations: active, archivedDestinations: archived };
  }, [destinations]);

  // Group active destinations by month
  const destinationsByMonth = useMemo(() => {
    const grouped: { [key: string]: { destinations: Destination[], sampleDate: Date } } = {};
    const undatedKey = 'no-date';
    
    activeDestinations.forEach((dest) => {
      const startDate = parseDateValue(dest.periodo_viagem_inicio);
      
      if (startDate) {
        const monthKey = format(startDate, 'yyyy-MM', { locale: ptBR });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = { destinations: [], sampleDate: startDate };
        }
        grouped[monthKey].destinations.push(dest);
      } else {
        // No valid date - add to undated
        if (!grouped[undatedKey]) {
          grouped[undatedKey] = { destinations: [], sampleDate: new Date() };
        }
        grouped[undatedKey].destinations.push(dest);
      }
    });

    // Sort month keys, putting undated at the end
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === undatedKey) return 1;
      if (b === undatedKey) return -1;
      return a.localeCompare(b);
    });
  }, [activeDestinations]);

  // Filter archived destinations by year and month (using end date)
  const filteredArchivedDestinations = useMemo(() => {
    let filtered = archivedDestinations;

    if (selectedYear !== 'all') {
      filtered = filtered.filter((dest) => {
        const date = parseDateValue(dest.periodo_viagem_fim);
        return date && date.getFullYear().toString() === selectedYear;
      });
    }

    if (selectedMonth !== 'all') {
      filtered = filtered.filter((dest) => {
        const date = parseDateValue(dest.periodo_viagem_fim);
        return date && (date.getMonth() + 1).toString() === selectedMonth;
      });
    }

    return filtered;
  }, [archivedDestinations, selectedYear, selectedMonth]);

  // Get available years from archived destinations (using end date)
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    archivedDestinations.forEach((dest) => {
      const date = parseDateValue(dest.periodo_viagem_fim);
      if (date) {
        years.add(date.getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [archivedDestinations]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Lista de Destinos", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);

    const tableData = activeDestinations.map((dest) => {
      const startDate = parseDateValue(dest.periodo_viagem_inicio);
      const endDate = parseDateValue(dest.periodo_viagem_fim);
      const availableSeats = availableSeatsCount(dest);
      
      return [
        dest.name,
        dest.country || '-',
        startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : '-',
        endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : '-',
        dest.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dest.price) : '-',
        availableSeats !== null ? `${availableSeats} vagas` : '-',
        dest.is_active ? 'Ativo' : 'Inativo'
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [['Nome', 'País', 'Início', 'Fim', 'Preço', 'Vagas', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [108, 194, 74] },
    });

    doc.save(`destinos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "PDF exportado",
      description: "A lista de destinos foi exportada com sucesso.",
    });
  };

  const renderDestinationRow = (destination: Destination) => (
    <TableRow key={destination.id} data-testid={`row-destination-${destination.id}`}>
      <TableCell className="font-medium" data-testid={`text-destination-name-${destination.id}`}>
        {destination.name}
      </TableCell>
      <TableCell data-testid={`text-destination-country-${destination.id}`}>
        {destination.country}
      </TableCell>
      <TableCell data-testid={`text-destination-dates-${destination.id}`}>
        {(() => {
          const startDate = parseDateValue(destination.periodo_viagem_inicio);
          const endDate = parseDateValue(destination.periodo_viagem_fim);
          
          if (startDate && endDate) {
            return (
              <div className="text-sm">
                <div>{format(startDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
                <div className="text-muted-foreground">até</div>
                <div>{format(endDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
              </div>
            );
          }
          return '-';
        })()}
      </TableCell>
      <TableCell data-testid={`text-destination-price-${destination.id}`}>
        {destination.price ? 
          new Intl.NumberFormat("pt-BR", { 
            style: "currency", 
            currency: "BRL" 
          }).format(destination.price) 
          : "-"
        }
      </TableCell>
      <TableCell data-testid={`text-destination-available-seats-${destination.id}`}>
        {(() => {
          const availableSeats = availableSeatsCount(destination);
          if (availableSeats === null) return "-";
          
          return (
            <Badge 
              variant={availableSeats > 10 ? "default" : availableSeats > 0 ? "secondary" : "destructive"}
            >
              {availableSeats > 0 
                ? `${availableSeats} ${availableSeats === 1 ? 'vaga' : 'vagas'}` 
                : "Esgotado"}
            </Badge>
          );
        })()}
      </TableCell>
      <TableCell data-testid={`text-destination-status-${destination.id}`}>
        <Badge variant={destination.is_active ? "default" : "secondary"}>
          {destination.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid={`button-destination-more-${destination.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPrevisaoDialogDest(destination)} data-testid={`button-previsao-${destination.id}`}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Previsão de Recebimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFechamentoDialogDest(destination)} data-testid={`button-fechamento-${destination.id}`}>
                <Receipt className="h-4 w-4 mr-2" />
                Fechamento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(destination)}
            disabled={!isVadmin}
            data-testid={`button-edit-destination-${destination.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={!isVadmin}
                data-testid={`button-delete-destination-${destination.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir destino</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o destino "{destination.name}"? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(destination.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando destinos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciar Destinos</h3>
          <p className="text-sm text-muted-foreground">
            Destinos ativos e arquivados por data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-destinations-pdf">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={onAdd} disabled={!isVadmin} data-testid="button-add-destination">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Destino
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active-destinations">
            Destinos Ativos ({activeDestinations.length})
          </TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived-destinations">
            <Archive className="mr-2 h-4 w-4" />
            Arquivados ({archivedDestinations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {destinationsByMonth.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-1 text-muted-foreground">
                  Nenhum destino ativo cadastrado.
                </div>
              </CardContent>
            </Card>
          ) : (
            destinationsByMonth.map(([monthKey, { destinations: monthDestinations, sampleDate }]) => {
              let monthLabel: string;
              
              if (monthKey === 'no-date') {
                monthLabel = 'Sem data definida';
              } else {
                monthLabel = format(sampleDate, 'MMMM yyyy', { locale: ptBR });
              }
              
              return (
                <Card key={monthKey}>
                  <CardHeader>
                    <CardTitle className="text-xl capitalize">{monthLabel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>País</TableHead>
                          <TableHead>Datas da Viagem</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Vagas Disponíveis</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthDestinations.map(renderDestinationRow)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Destinos Arquivados
              </CardTitle>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filtrar por Ano</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger data-testid="select-year-filter">
                      <SelectValue placeholder="Todos os anos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filtrar por Mês</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger data-testid="select-month-filter">
                      <SelectValue placeholder="Todos os meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      <SelectItem value="1">Janeiro</SelectItem>
                      <SelectItem value="2">Fevereiro</SelectItem>
                      <SelectItem value="3">Março</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Maio</SelectItem>
                      <SelectItem value="6">Junho</SelectItem>
                      <SelectItem value="7">Julho</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredArchivedDestinations.length === 0 ? (
                <div className="text-center py-1 text-muted-foreground">
                  Nenhum destino arquivado encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Datas da Viagem</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Vagas Disponíveis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArchivedDestinations.map(renderDestinationRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Previsão de Recebimento Dialog */}
      <Dialog open={!!previsaoDialogDest} onOpenChange={(open) => !open && setPrevisaoDialogDest(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-previsao-recebimento">
          <DialogHeader>
            <DialogTitle>Previsão de Recebimento</DialogTitle>
          </DialogHeader>
          {previsaoDialogDest && (() => {
            const { totalSeats, seatsForSale, price, totalCosts, receitaEstimada, lucroEstimado } = getPrevisaoRecebimento(previsaoDialogDest);
            const bus = buses?.find((b) => b.id === previsaoDialogDest.bus_id);
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">{previsaoDialogDest.name}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Assentos do ônibus ({bus?.name ?? "N/A"}):</span>
                    <span>{totalSeats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assentos para venda (total - 2):</span>
                    <span className="font-medium">{seatsForSale}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preço médio por assento:</span>
                    <span>{formatCurrency(price)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Receita bruta estimada:</span>
                    <span className="text-green-600">{formatCurrency(receitaEstimada)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Custos (frete + almoços + inclusos):</span>
                    <span>-{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Lucro estimado:</span>
                    <span className={lucroEstimado >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(lucroEstimado)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => previsaoDialogDest && setPrevisaoDialogDest(null)}>Fechar</Button>
            <Button onClick={() => previsaoDialogDest && generatePrevisaoPDF(previsaoDialogDest)} data-testid="button-previsao-pdf">
              <Download className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fechamento Dialog */}
      <Dialog open={!!fechamentoDialogDest} onOpenChange={(open) => !open && setFechamentoDialogDest(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-fechamento">
          <DialogHeader>
            <DialogTitle>Fechamento</DialogTitle>
          </DialogHeader>
          {fechamentoDialogDest && (() => {
            const { occupiedSeats, price, totalCosts, receitaReal, lucroReal } = getFechamento(fechamentoDialogDest);
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">{fechamentoDialogDest.name}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Assentos ocupados:</span>
                    <span className="font-medium">{occupiedSeats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preço médio por assento:</span>
                    <span>{formatCurrency(price)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Receita real:</span>
                    <span className="text-green-600">{formatCurrency(receitaReal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Custos (frete + almoços + inclusos):</span>
                    <span>-{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Lucro real:</span>
                    <span className={lucroReal >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(lucroReal)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => fechamentoDialogDest && setFechamentoDialogDest(null)}>Fechar</Button>
            <Button onClick={() => fechamentoDialogDest && generateFechamentoPDF(fechamentoDialogDest)} data-testid="button-fechamento-pdf">
              <Download className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}