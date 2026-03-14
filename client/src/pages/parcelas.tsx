import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, Circle, Phone, Receipt, FileText, RefreshCw, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { ProtectedMoney } from "@/components/ui/protected-money";
import { generateParcelasReport, generateForecastReportPDF } from "@/lib/pdf-generator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ParcelaWithDetails {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  amount: number;
  due_date: Date;
  installment_number: number;
  total_installments: number;
  is_paid: boolean;
  paid_date?: Date;
  paid_by_user_id?: string;
  paid_by_user_email?: string;
  payment_method?: string;
  notes?: string;
  observations?: string;
  status: "pending" | "paid" | "overdue";
  created_at: Date;
  updated_at: Date;
}

export default function ParcelasPage() {
  const { toast } = useToast();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [forecastStartDay, setForecastStartDay] = useState("1");
  const [forecastEndDay, setForecastEndDay] = useState("31");
  const [selectedParcela, setSelectedParcela] = useState<ParcelaWithDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState<string>("");

  const { data: parcelas, isLoading } = useQuery<ParcelaWithDetails[]>({
    queryKey: ['/api/parcelas/month', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/parcelas/month/${selectedMonth}/${selectedYear}`);
      const data = await response.json();
      return data.map((p: any) => ({
        ...p,
        due_date: new Date(p.due_date),
        paid_date: p.paid_date ? new Date(p.paid_date) : undefined,
        paid_by_user_id: p.paid_by_user_id,
        paid_by_user_email: p.paid_by_user_email,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at),
      })) as ParcelaWithDetails[];
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, isPaid, paymentMethod, paymentDate, observations }: { id: string; isPaid: boolean; paymentMethod?: string; paymentDate?: string; observations?: string }) => {
      const response = await apiRequest('PATCH', `/api/parcelas/${id}`, {
        is_paid: isPaid,
        paid_date: isPaid && paymentDate ? new Date(paymentDate) : (isPaid ? new Date() : undefined),
        payment_method: paymentMethod,
        observations: observations || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parcelas/month', selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "Sucesso",
        description: "Pagamento registrado e recibo gerado com sucesso!",
      });
      setPaymentDialogOpen(false);
      setSelectedParcela(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao registrar pagamento",
        variant: "destructive",
      });
    },
  });

  const regenerateParcelasMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await apiRequest('POST', `/api/clients/${clientId}/regenerate-parcelas`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/parcelas/month', selectedMonth, selectedYear] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Parcelas Recalculadas",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao recalcular parcelas",
        variant: "destructive",
      });
    },
  });

  const handleRegenerateParcelas = (clientId: string, clientName: string) => {
    if (confirm(`Tem certeza que deseja recalcular TODAS as parcelas de ${clientName}? Isso irá apagar as parcelas atuais e criar novas com os valores corretos.`)) {
      regenerateParcelasMutation.mutate(clientId);
    }
  };

  const handleTogglePaid = (parcela: ParcelaWithDetails) => {
    if (!parcela.is_paid) {
      // Open dialog for payment details
      setSelectedParcela(parcela);
      setPaymentMethod("pix");
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setObservations("");
      setPaymentDialogOpen(true);
    } else {
      // Mark as unpaid directly
      togglePaidMutation.mutate({
        id: parcela.id,
        isPaid: false,
      });
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedParcela) return;

    togglePaidMutation.mutate({
      id: selectedParcela.id,
      isPaid: true,
      paymentMethod,
      paymentDate,
      observations,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleGenerateReport = async () => {
    if (!parcelas || parcelas.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há parcelas para gerar o relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const monthName = months.find(m => m.value === selectedMonth)?.label || '';
      await generateParcelasReport(parcelas, monthName, selectedYear.toString(), summary);
      toast({
        title: "Relatório gerado!",
        description: "O PDF foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateForecast = async () => {
    if (!parcelas || parcelas.length === 0) {
      toast({
        title: "Sem dados",
        description: "Não há parcelas para gerar a previsão",
        variant: "destructive",
      });
      return;
    }

    try {
      const start = parseInt(forecastStartDay);
      const end = parseInt(forecastEndDay);
      
      const startDate = new Date(selectedYear, selectedMonth - 1, start);
      const endDate = new Date(selectedYear, selectedMonth - 1, end);
      
      const filteredParcelas = parcelas.filter(p => {
        const day = p.due_date.getDate();
        return day >= start && day <= end && !p.is_paid;
      });

      if (filteredParcelas.length === 0) {
        toast({
          title: "Sem parcelas pendentes",
          description: "Não há parcelas a receber no período selecionado.",
          variant: "destructive",
        });
        return;
      }

      await generateForecastReportPDF({
        parcelas: filteredParcelas,
        startDate,
        endDate
      });

      toast({
        title: "Previsão gerada!",
        description: "O PDF da previsão foi baixado com sucesso.",
      });
      setForecastDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao gerar previsão",
        description: "Não foi possível gerar o PDF da previsão.",
        variant: "destructive",
      });
    }
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

    const summary = useMemo(() => {
    if (!parcelas) return { total: 0, paid: 0, pending: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
    
    // Sort parcelas by due date
    const sortedParcelas = [...parcelas].sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    
    return sortedParcelas.reduce(
      (acc, parcela) => {
        acc.total++;
        acc.totalAmount += parcela.amount;
        
        if (parcela.is_paid || parcela.status === "paid") {
          acc.paid++;
          acc.paidAmount += parcela.amount;
        } else {
          acc.pending++;
          acc.pendingAmount += parcela.amount;
        }
        
        return acc;
      },
      { total: 0, paid: 0, pending: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 }
    );
  }, [parcelas]);

  // Client balance data for showing discount
  const clientId = parcelas?.[0]?.client_id;
  const { data: balanceData } = useQuery({
    queryKey: ['/api/clients', clientId, 'balance'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/balance`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken') || ''}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch balance');
      return response.json();
    },
    enabled: !!clientId,
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parcelas</h1>
          <p className="text-muted-foreground">
            Gerencie os pagamentos a receber dos clientes
          </p>
        </div>
        <Button
          onClick={() => handleGenerateReport()}
          disabled={!parcelas || parcelas.length === 0}
          data-testid="button-generate-pdf"
        >
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório PDF
        </Button>
        <Dialog open={forecastDialogOpen} onOpenChange={setForecastDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!parcelas || parcelas.length === 0}
              data-testid="button-forecast-pdf"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Previsão de Recebimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Previsão de Recebimento</DialogTitle>
              <DialogDescription>
                Selecione o intervalo de dias do mês atual ({months.find(m => m.value === selectedMonth)?.label}) para calcular quanto você irá receber.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="start-day">Dia Inicial</Label>
                <Input
                  id="start-day"
                  type="number"
                  min="1"
                  max="31"
                  value={forecastStartDay}
                  onChange={(e) => setForecastStartDay(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-day">Dia Final</Label>
                <Input
                  id="end-day"
                  type="number"
                  min="1"
                  max="31"
                  value={forecastEndDay}
                  onChange={(e) => setForecastEndDay(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total a receber no período:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(parcelas?.filter(p => {
                    const day = p.due_date.getDate();
                    return day >= parseInt(forecastStartDay) && day <= parseInt(forecastEndDay) && !p.is_paid;
                  }).reduce((sum, p) => sum + p.amount, 0) || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quantidade de parcelas:</span>
                <span className="font-bold">
                  {parcelas?.filter(p => {
                    const day = p.due_date.getDate();
                    return day >= parseInt(forecastStartDay) && day <= parseInt(forecastEndDay) && !p.is_paid;
                  }).length || 0}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setForecastDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleGenerateForecast}>Gerar PDF de Previsão</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Mês:</label>
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Ano:</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <ProtectedMoney amount={summary.totalAmount} formatted={formatCurrency(summary.totalAmount)} />
            </p>
          </CardContent>
        </Card>

        {balanceData && balanceData.discountAmount > 0 && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">Desconto Aplicado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-discount-amount">
                -{formatCurrency(balanceData.discountAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {balanceData.discountType === '3' ? '3%' : balanceData.discountType === '5' ? '5%' : 'Personalizado'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-paid-count">{summary.paid}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <ProtectedMoney amount={summary.paidAmount} formatted={formatCurrency(summary.paidAmount)} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">Aguardando Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">{summary.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <ProtectedMoney amount={summary.pendingAmount} formatted={formatCurrency(summary.pendingAmount)} />
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos do Mês</CardTitle>
          <CardDescription>
            Parcelas com vencimento em {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Carregando parcelas...</div>
            </div>
          ) : parcelas && parcelas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recebido por</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((parcela) => (
                  <TableRow key={parcela.id} data-testid={`row-parcela-${parcela.id}`}>
                    <TableCell className="font-medium" data-testid={`text-client-${parcela.id}`}>
                      {parcela.client_name}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${parcela.id}`}>
                      {parcela.client_phone ? (
                        <a 
                          href={`https://wa.me/55${parcela.client_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <Phone className="h-4 w-4" />
                          {parcela.client_phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-due-date-${parcela.id}`}>
                      {formatDate(parcela.due_date)}
                    </TableCell>
                    <TableCell data-testid={`text-installment-${parcela.id}`}>
                      {parcela.installment_number}/{parcela.total_installments}
                    </TableCell>
                    <TableCell className="font-semibold" data-testid={`text-amount-${parcela.id}`}>
                      <ProtectedMoney amount={parcela.amount} formatted={formatCurrency(parcela.amount)} />
                    </TableCell>
                    <TableCell data-testid={`text-status-${parcela.id}`}>
                      {parcela.is_paid || parcela.status === "paid" ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Pago
                        </span>
                      ) : (
                        (() => {
                          const now = new Date();
                          const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
                          const dueDateUTC = Date.UTC(parcela.due_date.getUTCFullYear(), parcela.due_date.getUTCMonth(), parcela.due_date.getUTCDate());
                          const isOverdue = dueDateUTC < todayUTC;
                          if (isOverdue) {
                            return (
                              <span className="flex items-center gap-1 text-red-600">
                                <Circle className="h-4 w-4" />
                                Atrasado
                              </span>
                            );
                          }
                          return (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Circle className="h-4 w-4" />
                              Pendente
                            </span>
                          );
                        })()
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-paid-by-${parcela.id}`}>
                      {parcela.is_paid && parcela.paid_by_user_email ? (
                        <div className="text-sm">
                          <div className="font-medium">{parcela.paid_by_user_email}</div>
                          {parcela.paid_date && (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(parcela.paid_date)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant={parcela.is_paid ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleTogglePaid(parcela)}
                          disabled={togglePaidMutation.isPending}
                          data-testid={`button-toggle-paid-${parcela.id}`}
                        >
                          {parcela.is_paid ? 'Marcar como não Pago' : 'Marcar como Pago'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRegenerateParcelas(parcela.client_id, parcela.client_name)}
                          disabled={regenerateParcelasMutation.isPending}
                          data-testid={`button-regenerate-${parcela.id}`}
                          title="Recalcular parcelas deste cliente"
                        >
                          <RefreshCw className={`h-4 w-4 ${regenerateParcelasMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Circle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma parcela encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não há parcelas com vencimento neste mês
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Informe os detalhes do pagamento recebido. Um recibo será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>

          {selectedParcela && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente</Label>
                <div className="text-sm p-2 bg-muted rounded">{selectedParcela.client_name}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Valor</Label>
                <div className="text-sm p-2 bg-muted rounded font-semibold">
                  <ProtectedMoney amount={selectedParcela.amount} formatted={formatCurrency(selectedParcela.amount)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Parcela</Label>
                <div className="text-sm p-2 bg-muted rounded">
                  {selectedParcela.installment_number}/{selectedParcela.total_installments}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-medium">
                  Forma de Pagamento *
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" data-testid="select-payment-method">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="link">Link de Pagamento</SelectItem>
                    <SelectItem value="credito_viagens_interiores">Crédito de Viagens Interiores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date" className="text-sm font-medium">
                  Data do Recebimento *
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  data-testid="input-payment-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations" className="text-sm font-medium">
                  OBS (Observações)
                </Label>
                <Textarea
                  id="observations"
                  placeholder="Adicione observações sobre este pagamento (opcional)"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  data-testid="textarea-observations"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              data-testid="button-cancel-payment"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={togglePaidMutation.isPending || !paymentMethod || !paymentDate}
              data-testid="button-confirm-payment"
            >
              {togglePaidMutation.isPending ? "Processando..." : "Confirmar e Gerar Recibo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
