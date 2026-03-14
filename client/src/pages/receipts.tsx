import { useState, useMemo } from "react";
import { Plus, FileText, Download, Trash2, TrendingUp, FileBarChart, Search, Eye, Pencil } from "lucide-react";
import { ProtectedMoney } from "@/components/ui/protected-money";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReceiptForm } from "@/components/receipts/receipt-form";
import { useReceipts, useCreateReceipt, useDeleteReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { generateReceiptPDF } from "@/lib/pdf-generator";
import { type InsertReceipt, type Receipt } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Helper function to normalize strings for better searching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

// Smart search function that handles accents, typos, and partial matches
function smartSearch(text: string, query: string): boolean {
  if (!query) return true;
  
  const normalizedText = normalizeString(text);
  const normalizedQuery = normalizeString(query);
  
  // Exact match (normalized)
  if (normalizedText.includes(normalizedQuery)) return true;
  
  // Match each word separately (helps with multi-word searches)
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  if (queryWords.length > 1) {
    return queryWords.every(word => normalizedText.includes(word));
  }
  
  // Fuzzy matching: allow up to 2 character differences for typos
  if (normalizedQuery.length >= 3) {
    const searchLength = normalizedQuery.length;
    for (let i = 0; i <= normalizedText.length - searchLength; i++) {
      const substring = normalizedText.substr(i, searchLength);
      let differences = 0;
      
      for (let j = 0; j < searchLength; j++) {
        if (normalizedQuery[j] !== substring[j]) {
          differences++;
          if (differences > 2) break; // Allow max 2 typos
        }
      }
      
      if (differences <= 2) return true;
    }
  }
  
  return false;
}

export default function ReceiptsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "daily" | "weekly" | "monthly">("monthly");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  
  const { data: receipts, isLoading } = useReceipts();
  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const { toast } = useToast();

  const getDateRange = (anchorDate: Date, type: "daily" | "weekly" | "monthly") => {
    const start = new Date(anchorDate);
    const end = new Date(anchorDate);

    if (type === "daily") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const availablePeriods = useMemo(() => {
    if (!receipts || receipts.length === 0) return [];
    
    const periods = new Set<string>();
    receipts.forEach(receipt => {
      const date = new Date(receipt.created_at);
      const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.add(periodKey);
    });
    
    return Array.from(periods).sort().reverse();
  }, [receipts]);

  const { filteredReceipts, totalRevenue, totalFees } = useMemo(() => {
    if (!receipts) return { filteredReceipts: [], totalRevenue: 0, totalFees: 0 };
    
    let filtered = receipts;
    
    // Filter by period (specific month/year) - takes priority over timeFilter
    if (selectedPeriod !== "all") {
      filtered = filtered.filter(receipt => {
        const date = new Date(receipt.created_at);
        const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return periodKey === selectedPeriod;
      });
    } else if (timeFilter !== "all") {
      // Only apply time filter (daily/weekly/monthly from today) if no specific period is selected
      const now = new Date();
      const { start, end } = getDateRange(now, timeFilter);
      
      filtered = filtered.filter(receipt => {
        const receiptDate = new Date(receipt.created_at);
        return receiptDate >= start && receiptDate <= end;
      });
    }

    // Filter by client name, reference, and paid_to using smart search
    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        smartSearch(receipt.name || '', searchTerm) ||
        smartSearch(receipt.reference || '', searchTerm) ||
        smartSearch(receipt.paid_to || '', searchTerm)
      );
    }
    
    const total = filtered.reduce((sum, receipt) => sum + receipt.amount, 0);
    const fees = filtered.reduce((sum, receipt) => sum + (receipt.fee_amount || 0), 0);
    
    return { filteredReceipts: filtered, totalRevenue: total, totalFees: fees };
  }, [receipts, selectedPeriod, searchTerm, timeFilter]);

  const handleCreateReceipt = async (submitData: { receipt: InsertReceipt; clientBalance?: any; parcelaPayments?: Array<{parcela_id: string; amount: number}> }) => {
    try {
      await createReceipt.mutateAsync({
        receipt: submitData.receipt,
        paymentHistoryData: submitData.clientBalance,
        parcelaPayments: submitData.parcelaPayments
      });
      setIsDialogOpen(false);
      setEditingReceipt(null);
    } catch (error) {
      console.error('Error creating receipt:', error);
    }
  };

  const handleUpdateReceipt = async (submitData: { receipt: InsertReceipt; clientBalance?: any }) => {
    if (!editingReceipt) return;
    
    try {
      await updateReceipt.mutateAsync({ id: editingReceipt.id, data: submitData.receipt });
      setIsDialogOpen(false);
      setEditingReceipt(null);
    } catch (error) {
      console.error('Error updating receipt:', error);
    }
  };

  const handleEditClick = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingReceipt(null);
    }
  };

  const handleDownloadReceipt = async (receipt: any) => {
    try {
      await generateReceiptPDF(receipt);
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
    }
  };

  const handleDeleteReceipt = async () => {
    if (deleteId) {
      await deleteReceipt.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPeriodLabel = (period: string) => {
    const [year, month] = period.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handleGenerateReport = async () => {
    if (!receipts || receipts.length === 0) {
      toast({
        title: "Nenhum recibo encontrado",
        description: "Não há recibos para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    const { start, end } = getDateRange(reportDate, reportType);
    const filteredForReport = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.created_at);
      return receiptDate >= start && receiptDate <= end;
    });

    if (filteredForReport.length === 0) {
      toast({
        title: "Nenhum recibo no período",
        description: "Não há recibos no período selecionado para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { generateReceiptsReportPDF } = await import('@/lib/pdf-generator');
      const periodLabel = reportType === "daily" 
        ? format(reportDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : reportType === "weekly"
        ? `Semana de ${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`
        : format(reportDate, "MMMM 'de' yyyy", { locale: ptBR });

      await generateReceiptsReportPDF({
        receipts: filteredForReport,
        periodLabel,
        range: { start, end },
      });

      toast({
        title: "Relatório gerado",
        description: `Relatório ${reportType === "daily" ? "diário" : reportType === "weekly" ? "semanal" : "mensal"} gerado com sucesso.`,
      });

      setIsReportDialogOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos De Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os recibos de pagamento dos clientes
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-receipt">
              <Plus className="mr-2 h-4 w-4" />
              Novo Recibo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReceipt ? "Editar Recibo" : "Criar Novo Recibo"}</DialogTitle>
              <DialogDescription>
                {editingReceipt 
                  ? "Atualize os dados do recibo de pagamento" 
                  : "Preencha os dados para gerar um novo recibo de pagamento"}
              </DialogDescription>
            </DialogHeader>
            <ReceiptForm
              onSubmit={editingReceipt ? handleUpdateReceipt : handleCreateReceipt}
              defaultValues={editingReceipt ? {
                name: editingReceipt.name,
                amount: editingReceipt.amount,
                amount_in_words: editingReceipt.amount_in_words,
                reference: editingReceipt.reference,
                payment_method: editingReceipt.payment_method || undefined,
                seat_number: editingReceipt.seat_number || undefined,
                paid_to: editingReceipt.paid_to || undefined,
                payment_date: editingReceipt.payment_date ? new Date(editingReceipt.payment_date) : new Date(editingReceipt.created_at),
              } : undefined}
              isLoading={editingReceipt ? updateReceipt.isPending : createReceipt.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      {/* Search and Time Filter */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-search-client"
              />
            </div>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                data-testid="button-clear-search"
              >
                Limpar
              </Button>
            )}
          </div>
          
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <div className="flex gap-2">
              <Button
                variant={timeFilter === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("monthly")}
                data-testid="button-filter-monthly"
              >
                Mensal
              </Button>
              <Button
                variant={timeFilter === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("daily")}
                data-testid="button-filter-daily"
              >
                Diário
              </Button>
              <Button
                variant={timeFilter === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("weekly")}
                data-testid="button-filter-weekly"
              >
                Semanal
              </Button>
              <Button
                variant={timeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter("all")}
                data-testid="button-filter-all"
              >
                Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card data-testid="card-revenue-summary">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <CardTitle>Receita Total</CardTitle>
                {totalFees > 0 && (
                  <span className="text-[10px] text-orange-600 font-normal">
                    Taxas: {formatCurrency(totalFees)}
                  </span>
                )}
              </div>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]" data-testid="select-period">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all">Todos os períodos</SelectItem>
                {availablePeriods.map(period => (
                  <SelectItem key={period} value={period} data-testid={`option-${period}`}>
                    {formatPeriodLabel(period)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {selectedPeriod !== "all" 
              ? `Receita do período: ${formatPeriodLabel(selectedPeriod)}`
              : timeFilter === "monthly"
              ? "Receita do mês atual"
              : timeFilter === "weekly"
              ? "Receita da semana atual"
              : timeFilter === "daily"
              ? "Receita de hoje"
              : "Receita de todos os recibos gerados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold text-primary" data-testid="text-total-revenue">
                <ProtectedMoney amount={totalRevenue} formatted={formatCurrency(totalRevenue)} />
              </div>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-receipt-count">
                {filteredReceipts.length} {filteredReceipts.length === 1 ? 'recibo' : 'recibos'}
              </p>
            </div>
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-generate-report">
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Gerar Relatório de Recibos</DialogTitle>
                  <DialogDescription>
                    Selecione o tipo de relatório e a data de referência
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Relatório</Label>
                    <RadioGroup value={reportType} onValueChange={(value: any) => setReportType(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" data-testid="radio-daily" />
                        <Label htmlFor="daily" className="font-normal cursor-pointer">Diário</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" data-testid="radio-weekly" />
                        <Label htmlFor="weekly" className="font-normal cursor-pointer">Semanal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" data-testid="radio-monthly" />
                        <Label htmlFor="monthly" className="font-normal cursor-pointer">Mensal</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Referência</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !reportDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reportDate ? format(reportDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reportDate}
                          onSelect={(date) => date && setReportDate(date)}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      {reportType === "daily" && "Será gerado o relatório para este dia específico"}
                      {reportType === "weekly" && "Será gerado o relatório para a semana que contém esta data"}
                      {reportType === "monthly" && "Será gerado o relatório para o mês desta data"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} data-testid="button-cancel-report">
                    Cancelar
                  </Button>
                  <Button onClick={handleGenerateReport} data-testid="button-confirm-report">
                    Gerar PDF
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Recibos</CardTitle>
          <CardDescription>
            Todos os recibos gerados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Carregando recibos...</div>
            </div>
          ) : filteredReceipts && filteredReceipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Referente a</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} data-testid={`row-receipt-${receipt.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${receipt.id}`}>
                      {receipt.name}
                    </TableCell>
                    <TableCell data-testid={`text-amount-${receipt.id}`}>
                      {receipt.payment_method === 'credito' && receipt.net_amount !== undefined && receipt.net_amount > 0 ? (
                        <div className="flex flex-col">
                          <ProtectedMoney amount={receipt.net_amount} formatted={formatCurrency(receipt.net_amount)} />
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(receipt.amount)}
                          </span>
                        </div>
                      ) : (
                        <ProtectedMoney amount={receipt.amount} formatted={formatCurrency(receipt.amount)} />
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`text-reference-${receipt.id}`}>
                      {receipt.reference}
                    </TableCell>
                    <TableCell data-testid={`text-date-${receipt.id}`}>
                      {receipt.created_at.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewReceipt(receipt)}
                          data-testid={`button-preview-${receipt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(receipt)}
                          data-testid={`button-edit-${receipt.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(receipt)}
                          data-testid={`button-download-${receipt.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(receipt.id)}
                          data-testid={`button-delete-${receipt.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum recibo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro recibo de pagamento
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Receipt Preview Dialog */}
      <Dialog open={!!previewReceipt} onOpenChange={(open) => !open && setPreviewReceipt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualização do Recibo</DialogTitle>
            <DialogDescription>
              Prévia do recibo de pagamento
            </DialogDescription>
          </DialogHeader>
          
          {previewReceipt && (
            <div className="space-y-6 p-6 bg-white dark:bg-gray-950 rounded-lg border">
              {/* Header with company info */}
              <div className="text-center space-y-3 pb-4 border-b-2 border-primary">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">R</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-primary">RODA BEM TURISMO</h2>
                <p className="text-sm text-muted-foreground italic">sua melhor companhia</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>DANIEL DE PAIVA REZENDE OLIVEIRA</p>
                  <p>CNPJ: 27.643.735/0001-90</p>
                  <p>Rua Visconde de Caete, 44 - Centro - Esmeraldas/MG - CEP 32.800-070</p>
                  <p>Tel.: (31) 99932-5441 | E-mail: contato@rodabemturismo.com</p>
                </div>
              </div>

              {/* Receipt Title and Amount */}
              <div className="bg-primary text-white p-4 rounded-md flex justify-between items-center">
                <h3 className="text-2xl font-bold">RECIBO</h3>
                <div className="text-2xl font-bold">
                  {formatCurrency(previewReceipt.amount)}
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-4">
                {/* Received from */}
                <div>
                  <p className="text-sm font-semibold mb-2">Recebi(emos) de:</p>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <p className="font-medium uppercase">{previewReceipt.name}</p>
                  </div>
                </div>

                {/* Amount in words */}
                <div>
                  <p className="text-sm font-semibold mb-2">A quantia de:</p>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <p className="uppercase">{previewReceipt.amount_in_words}</p>
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <p className="text-sm font-semibold mb-2">Referente a:</p>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <p className="uppercase">{previewReceipt.reference}</p>
                  </div>
                </div>

                {/* Additional Details */}
                {(previewReceipt.payment_method || previewReceipt.seat_number || previewReceipt.paid_to) && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Detalhes Adicionais:</p>
                    <div className="text-sm space-y-1">
                      {previewReceipt.payment_method && (
                        <p>
                          <span className="font-medium">Forma de Pagamento:</span>{' '}
                          {(() => {
                            const methods: Record<string, string> = {
                              'dinheiro': 'Dinheiro',
                              'pix': 'PIX',
                              'credito': 'Cartão de Crédito',
                              'debito': 'Cartão de Débito',
                              'boleto': 'Boleto Bancário',
                              'link': 'Link'
                            };
                            return methods[previewReceipt.payment_method] || previewReceipt.payment_method;
                          })()}
                        </p>
                      )}
                      {previewReceipt.seat_number && (
                        <p><span className="font-medium">Assento:</span> {previewReceipt.seat_number}</p>
                      )}
                      {previewReceipt.paid_to && (
                        <p><span className="font-medium">Pago a:</span> {previewReceipt.paid_to}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="text-right text-sm text-muted-foreground">
                  <p>Emitido em: {previewReceipt.created_at.toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPreviewReceipt(null)}
                  data-testid="button-close-preview"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    handleDownloadReceipt(previewReceipt);
                    setPreviewReceipt(null);
                  }}
                  data-testid="button-download-from-preview"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este recibo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReceipt}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

