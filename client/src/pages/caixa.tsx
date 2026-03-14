import { useState, useMemo, useEffect } from "react";
import { Plus, PiggyBank, Edit, Trash2, Search, Filter, ArrowUpDown, Download, Calendar, TrendingUp, TrendingDown, FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ProtectedMoney } from "@/components/ui/protected-money";
import { FinancialTransactionDialog } from "@/components/caixa/financial-transaction-dialog";
import { BillsSection } from "@/components/caixa/bills-section";
import { useFinancialTransactions, useDeleteFinancialTransaction } from "@/hooks/use-financial-transactions";
import { useReceipts } from "@/hooks/use-receipts";
import { useActiveDestinations } from "@/hooks/use-destinations";
import { generateFinancialReport, type FinancialReportData } from "@/lib/pdf-generator";
import type { FinancialTransaction, Receipt } from "@shared/schema";

const importanceColorMap = {
  red: { bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-800 dark:text-red-200", label: "Alta" },
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-800 dark:text-yellow-200", label: "Média" },
  green: { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-800 dark:text-green-200", label: "Baixa" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-800 dark:text-blue-200", label: "Informativo" }
} as const;

const getMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    });
  }
  return months;
};

export default function Caixa() {
  const [activeTab, setActiveTab] = useState<"lancamento" | "contas">("lancamento");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterImportance, setFilterImportance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportFilterDestino, setReportFilterDestino] = useState<string>("all");
  const [reportFilterPaymentMethod, setReportFilterPaymentMethod] = useState<string>("all");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showAmounts, setShowAmounts] = useState(() => {
    const saved = localStorage.getItem("caixa_show_amounts");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("caixa_show_amounts", String(showAmounts));
    // Dispatch custom event for ProtectedMoney component
    window.dispatchEvent(new CustomEvent("toggle-amounts-visibility", { detail: { show: showAmounts } }));
  }, [showAmounts]);
  
  const { data: transactions, isLoading } = useFinancialTransactions();
  const { data: receiptsData } = useReceipts();
  const { data: destinations = [] } = useActiveDestinations();
  const deleteTransaction = useDeleteFinancialTransaction();

  const monthOptions = getMonthOptions();

  const handleExportPDF = () => {
    setExportDialogOpen(true);
  };

  const generateReport = async () => {
    if (!transactions || transactions.length === 0) {
      alert('Não há transações para exportar.');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      let filteredTransactions: FinancialTransaction[] = [];
      let periodLabel = "";

      if (reportType === "daily") {
        filteredTransactions = transactions.filter(t => {
          const tDate = t.transaction_date as any;
          const dateStr = typeof tDate === 'string' 
            ? tDate.split('T')[0]
            : new Date(tDate).toISOString().split('T')[0];
          return dateStr === selectedDate;
        });
        periodLabel = `Dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
      } else if (reportType === "weekly") {
        const date = new Date(selectedDate + 'T00:00:00');
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
        const startOfWeek = new Date(date.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        filteredTransactions = transactions.filter(t => {
          const tDate = new Date(t.transaction_date as any);
          return tDate >= startOfWeek && tDate <= endOfWeek;
        });
        periodLabel = `Semana de ${startOfWeek.toLocaleDateString('pt-BR')} a ${endOfWeek.toLocaleDateString('pt-BR')}`;
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        filteredTransactions = transactions.filter(t => {
          const tDate = t.transaction_date as any;
          const dateStr = typeof tDate === 'string' 
            ? tDate 
            : new Date(tDate).toISOString();
          const dateParts = dateStr.split('T')[0].split('-');
          return parseInt(dateParts[0], 10) === year && parseInt(dateParts[1], 10) === month;
        });
        periodLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }

      if (filteredTransactions.length === 0) {
        alert('Não há transações para o período selecionado.');
        setIsGeneratingPDF(false);
        return;
      }

      // Apply optional filters: payment method
      if (reportFilterPaymentMethod !== "all") {
        filteredTransactions = filteredTransactions.filter(t => t.payment_method === reportFilterPaymentMethod);
      }

      // Apply optional filter: destino (via receipt matching - receipts link transactions to destinations)
      if (reportFilterDestino !== "all" && receiptsData && receiptsData.length > 0) {
        const descToDestino = new Map<string, string>();
        for (const r of receiptsData) {
          if (r.destination_id) {
            const key1 = `${r.reference} - ${r.name}`;
            const key2 = `Recibo: ${r.reference} - ${r.name}`;
            descToDestino.set(key1, r.destination_id);
            descToDestino.set(key2, r.destination_id);
          }
        }
        filteredTransactions = filteredTransactions.filter(t => {
          const destId = descToDestino.get(t.description);
          return destId === reportFilterDestino;
        });
      }

      if (filteredTransactions.length === 0) {
        alert('Nenhuma transação encontrada com os filtros aplicados.');
        setIsGeneratingPDF(false);
        return;
      }

      filteredTransactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

      const totalEntradas = filteredTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const totalSaidas = filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const reportData: FinancialReportData = {
        transactions: filteredTransactions,
        period: periodLabel,
        summary: {
          totalEntradas,
          totalSaidas: -totalSaidas,
          saldoFinal: totalEntradas - totalSaidas,
          totalTransactions: filteredTransactions.length
        }
      };
      
      await generateFinancialReport(reportData);
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o relatório PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  };

  const handleDelete = (transactionId: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      deleteTransaction.mutate(transactionId);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = transactions.filter(transaction => {
      // Search filter
      const searchMatch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const typeMatch = filterType === "all" || 
        (filterType === "income" && transaction.amount > 0) ||
        (filterType === "expense" && transaction.amount < 0);
      
      // Payment method filter
      const paymentMatch = filterPaymentMethod === "all" || transaction.payment_method === filterPaymentMethod;
      
      return searchMatch && typeMatch && paymentMatch;
    });
    
    // Sort
    filtered.sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case "date":
          result = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case "amount":
          result = a.amount - b.amount;
          break;
        case "description":
          result = a.description.localeCompare(b.description);
          break;
      }
      
      return sortOrder === "asc" ? result : -result;
    });
    
    return filtered;
  }, [transactions, searchTerm, filterType, filterPaymentMethod, sortBy, sortOrder]);

  // Calculate totals (based on filtered data)
  const totalAmount = filteredAndSortedTransactions.reduce((sum, t) => sum + t.amount, 0) || 0;
  const positiveAmount = filteredAndSortedTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0) || 0;
  const negativeAmount = filteredAndSortedTransactions.reduce((sum, t) => t.amount < 0 ? sum + t.amount : sum, 0) || 0;

  // Calculate total fees from receipts included in these transactions
  const totalFees = useMemo(() => {
    if (!receiptsData || !filteredAndSortedTransactions) return 0;
    
    // Sum fees for all transactions that correspond to receipts
    return filteredAndSortedTransactions.reduce((sum, t) => {
      // Find the receipt by description matching pattern "REFERENCE - NAME" or "Recibo: REFERENCE - NAME"
      const receipt = receiptsData.find((r: Receipt) => {
        const desc = r.client_id ? `${r.reference} - ${r.name}` : `Recibo: ${r.reference} - ${r.name}`;
        return t.description === desc && t.payment_method === r.payment_method;
      });
      
      if (receipt && receipt.fee_amount) {
        return sum + receipt.fee_amount;
      }
      return sum;
    }, 0);
  }, [receiptsData, filteredAndSortedTransactions]);
  
  // Calculate period stats
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  const thisMonthTransactions = transactions?.filter(t => new Date(t.transaction_date) >= thisMonth) || [];
  const thisMonthIncome = thisMonthTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0);
  const thisMonthExpense = thisMonthTransactions.reduce((sum, t) => t.amount < 0 ? sum + t.amount : sum, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <PiggyBank className="h-8 w-8 text-blue-600" />
            Caixa Inteligente
          </h2>
          <p className="text-muted-foreground">Gerencie pagamentos da agência com controle avançado</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAmounts(!showAmounts)}
            title={showAmounts ? "Esconder valores" : "Mostrar valores"}
            data-testid="button-toggle-visibility"
          >
            {showAmounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Button 
            variant="outline" 
            className="hidden md:flex"
            onClick={handleExportPDF}
            disabled={!transactions || transactions.length === 0}
            data-testid="button-export-pdf"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={handleAddNew} data-testid="button-new-transaction">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <Button
          variant={activeTab === "lancamento" ? "default" : "ghost"}
          onClick={() => setActiveTab("lancamento")}
          className="rounded-b-none"
        >
          Lançamento
        </Button>
        <Button
          variant={activeTab === "contas" ? "default" : "ghost"}
          onClick={() => setActiveTab("contas")}
          className="rounded-b-none"
        >
          Contas a Pagar/Receber
        </Button>
      </div>

      {activeTab === "lancamento" ? (
        <>
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Saldo Total
              <div className="flex flex-col items-end">
                <PiggyBank className="h-4 w-4" />
                {totalFees > 0 && (
                  <span className="text-[10px] text-orange-600 font-normal mt-1">
                    Taxas: {formatCurrency(totalFees)}
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <ProtectedMoney amount={totalAmount} formatted={formatCurrency(totalAmount)} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAndSortedTransactions.length} transações
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center justify-between">
              Entradas
              <TrendingUp className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-24" /> : <ProtectedMoney amount={positiveAmount} formatted={formatCurrency(positiveAmount)} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mês: <ProtectedMoney amount={thisMonthIncome} formatted={formatCurrency(thisMonthIncome)} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center justify-between">
              Saídas
              <TrendingDown className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? <Skeleton className="h-8 w-24" /> : <ProtectedMoney amount={Math.abs(negativeAmount)} formatted={formatCurrency(Math.abs(negativeAmount))} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mês: <ProtectedMoney amount={Math.abs(thisMonthExpense)} formatted={formatCurrency(Math.abs(thisMonthExpense))} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Resultado Mensal
              <Calendar className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(thisMonthIncome + thisMonthExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <ProtectedMoney amount={thisMonthIncome + thisMonthExpense} formatted={formatCurrency(thisMonthIncome + thisMonthExpense)} />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Controles
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredAndSortedTransactions.length} de {transactions?.length || 0} transações
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: "all" | "income" | "expense") => setFilterType(value)}>
              <SelectTrigger data-testid="select-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
              <SelectTrigger data-testid="select-filter-payment">
                <SelectValue placeholder="Método de Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="credito_viagens_interiores">Crédito de Viagens Interiores</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: "date" | "amount" | "description") => setSortBy(value)}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="amount">Valor</SelectItem>
                <SelectItem value="description">Descrição</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2"
              data-testid="button-sort-order"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "asc" ? "Crescente" : "Decrescente"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Transações
            {filteredAndSortedTransactions.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                Mostrando {filteredAndSortedTransactions.length} resultados
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredAndSortedTransactions.map((transaction) => {
                const isIncome = transaction.amount > 0;
                const paymentMethodLabels: Record<string, string> = {
                  pix: "📱 PIX",
                  dinheiro: "💵 Dinheiro",
                  credito: "💳 Crédito",
                  debito: "🏦 Débito",
                  boleto: "📄 Boleto",
                  link: "🔗 Link"
                };
                return (
                  <div
                    key={transaction.id}
                    className="group flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 hover:shadow-sm transition-all duration-200"
                    data-testid={`transaction-item-${transaction.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-3 h-3 rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground" data-testid={`text-description-${transaction.id}`}>
                            {transaction.description}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={`border-0 text-xs ${isIncome ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}
                          >
                            {isIncome ? '💰 Entrada' : '💸 Saída'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-xs">•</span>
                            {paymentMethodLabels[transaction.payment_method] || transaction.payment_method}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span 
                          className={`text-lg font-bold ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                          data-testid={`text-amount-${transaction.id}`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          <ProtectedMoney amount={transaction.amount} formatted={formatCurrency(transaction.amount)} />
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {transaction.amount >= 0 ? 'Entrada' : 'Saída'}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          data-testid={`button-edit-${transaction.id}`}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                          data-testid={`button-delete-${transaction.id}`}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchTerm || filterType !== "all" || filterImportance !== "all" ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground">Tente ajustar os filtros ou termos de busca.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterImportance("all");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Nenhuma transação cadastrada</h3>
              <p className="text-muted-foreground">Comece adicionando sua primeira transação financeira.</p>
              <Button className="mt-4" onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Transação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      ) : (
        <BillsSection />
      )}

      <FinancialTransactionDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        transaction={editingTransaction}
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-export-pdf">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerar Relatório
            </DialogTitle>
            <DialogDescription>
              Selecione o período para gerar o relatório financeiro em PDF
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Relatório</label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês do Relatório</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-export-month">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {reportType === "daily" ? "Data do Relatório" : "Data de Referência (Semana)"}
                </label>
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-export-date"
                />
              </div>
            )}

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Filtros opcionais</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destino</label>
                  <Select value={reportFilterDestino} onValueChange={setReportFilterDestino}>
                    <SelectTrigger data-testid="select-report-destino">
                      <SelectValue placeholder="Todos os destinos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os destinos</SelectItem>
                      {destinations.filter(d => d.is_active).map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pagamento</label>
                  <Select value={reportFilterPaymentMethod} onValueChange={setReportFilterPaymentMethod}>
                    <SelectTrigger data-testid="select-report-payment">
                      <SelectValue placeholder="Todos os métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os métodos</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="credito_viagens_interiores">Crédito de Viagens Interiores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setExportDialogOpen(false)}
              data-testid="button-cancel-export"
            >
              Cancelar
            </Button>
            <Button 
              onClick={generateReport}
              disabled={isGeneratingPDF}
              data-testid="button-generate-report"
            >
              {isGeneratingPDF ? (
                <>Gerando...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}