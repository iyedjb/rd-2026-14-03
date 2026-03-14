import { useState, useMemo, useEffect } from "react";
import { FileText, Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedMoney } from "@/components/ui/protected-money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/validation";
import { PdfReportDialog } from "./pdf-report-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMonthlyReport, calculateMonthlyRevenue } from "@/hooks/use-reports";
import { useQuery } from "@tanstack/react-query";
import { useTutorial } from "@/contexts/TutorialContext";

export function ReportsView() {
  const { toast } = useToast();
  const { activeStep, completeTutorialStep } = useTutorial();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedType, setSelectedType] = useState("all");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // Get real data using the hook
  const { data: monthlyData, isLoading, error } = useMonthlyReport(
    parseInt(selectedYear), 
    parseInt(selectedMonth)
  );

  // Fetch all clients for chart data
  const { data: allClientsData } = useQuery<any>({
    queryKey: ['/api/clients'],
  });
  
  const allClients = allClientsData?.clients || [];
  
  // Helper function to get installment info for a client in the selected month
  const getClientInstallmentInfo = (client: any) => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const createdAt = new Date(client.created_at);
    const createdYear = createdAt.getFullYear();
    const createdMonth = createdAt.getMonth() + 1;
    
    const travelPrice = Number(client.travel_price) || 0;
    const downPayment = Number(client.down_payment) || 0;
    const installmentsCount = Number(client.installments_count) || 0;
    
    if (installmentsCount > 0 && travelPrice > 0) {
      const remainingAmount = travelPrice - downPayment;
      const installmentAmount = remainingAmount / installmentsCount;
      
      // Parse first installment date
      let firstInstallmentYear = createdYear;
      let firstInstallmentMonth = createdMonth + 1;
      
      if (client.first_installment_due_date) {
        try {
          // Convert to Date object if it's a string
          const firstInstallmentDate = typeof client.first_installment_due_date === 'string' 
            ? new Date(client.first_installment_due_date)
            : client.first_installment_due_date;
          
          if (firstInstallmentDate instanceof Date && !isNaN(firstInstallmentDate.getTime())) {
            firstInstallmentYear = firstInstallmentDate.getFullYear();
            firstInstallmentMonth = firstInstallmentDate.getMonth() + 1;
          }
        } catch (e) {
          // If date parsing fails, use default (month after creation)
          console.error('Failed to parse first_installment_due_date:', client.first_installment_due_date);
        }
      }
      
      // Calculate which installment this is
      const monthsSinceFirstInstallment = (year - firstInstallmentYear) * 12 + (month - firstInstallmentMonth);
      
      console.log('Client installment debug:', {
        clientName: `${client.first_name} ${client.last_name}`,
        selectedMonth: `${month}/${year}`,
        createdMonth: `${createdMonth}/${createdYear}`,
        firstInstallment: `${firstInstallmentMonth}/${firstInstallmentYear}`,
        monthsSince: monthsSinceFirstInstallment,
        installmentsCount,
        downPayment,
        installmentAmount
      });
      
      // Check if down payment applies this month
      if (createdYear === year && createdMonth === month && downPayment > 0) {
        return {
          type: 'down_payment',
          amount: downPayment,
          label: 'Entrada'
        };
      }
      
      // Check if this month has an installment
      if (monthsSinceFirstInstallment >= 0 && monthsSinceFirstInstallment < installmentsCount) {
        return {
          type: 'installment',
          amount: installmentAmount,
          installmentNumber: monthsSinceFirstInstallment + 1,
          totalInstallments: installmentsCount,
          label: `Parcela ${monthsSinceFirstInstallment + 1}/${installmentsCount}`
        };
      }
      
      return null;
    } else {
      // Full payment in creation month
      if (createdYear === year && createdMonth === month && travelPrice > 0) {
        return {
          type: 'full_payment',
          amount: travelPrice,
          label: 'À Vista'
        };
      }
      return null;
    }
  };

  useEffect(() => {
    if (activeStep === 'reports' && monthlyData) {
      const timer = setTimeout(() => {
        completeTutorialStep('reports');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeStep, monthlyData, completeTutorialStep]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Generate chart data for 6 months centered around selected month
  const chartData = useMemo(() => {
    if (!allClients.length) return [];
    
    const data = [];
    const selectedDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
    
    // Generate 6 months of data ending with the selected month
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      
      // Count new clients (by created_at)
      const newClients = allClients.filter((client: any) => {
        const createdAt = new Date(client.created_at);
        return createdAt >= date && createdAt < nextMonth;
      }).length;
      
      // Calculate revenue using installment-based logic
      const monthRevenue = calculateMonthlyRevenue(
        allClients, 
        date.getFullYear(), 
        date.getMonth() + 1
      );
      
      data.push({
        name: monthNames[date.getMonth()].slice(0, 3),
        fullName: monthNames[date.getMonth()],
        clientes: newClients,
        receita: monthRevenue,
        month: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      });
    }
    
    return data;
  }, [allClients, selectedYear, selectedMonth, monthNames]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'departed':
        return <Badge className="bg-green-100 text-green-800">Embarcado</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800">Confirmado</Badge>;
      case 'scheduled':
        return <Badge className="bg-amber-100 text-amber-800">Agendado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExportCSV = () => {
    if (!monthlyData) {
      toast({
        title: "Nenhum dado disponível",
        description: "Não há dados para o período selecionado.",
        variant: "destructive",
      });
      return;
    }

    // CSV export with security sanitization
    const sanitizeForCSV = (value: string) => {
      if (typeof value !== 'string') return value;
      // Prevent formula injection by prefixing dangerous characters with single quote
      if (value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@')) {
        return "'" + value;
      }
      return value;
    };

    const csvContent = [
      "Cliente,Telefone,Destino,Data Cadastro,Data Viagem,Preço",
      ...monthlyData.clients.map((client: any) => {
        const clientName = sanitizeForCSV(`${client.first_name} ${client.last_name}`);
        const phone = sanitizeForCSV(client.phone);
        const destination = sanitizeForCSV(client.destination);
        const createdAt = new Date(client.created_at).toLocaleDateString('pt-BR');
        const travelDate = client.travel_date ? new Date(client.travel_date).toLocaleDateString('pt-BR') : 'N/A';
        const price = client.travel_price ? `R$ ${client.travel_price.toFixed(2)}` : 'N/A';
        return `"${clientName}","${phone}","${destination}","${createdAt}","${travelDate}","${price}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${monthNames[parseInt(selectedMonth) - 1]}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV exportado com sucesso!",
      description: "O arquivo foi baixado automaticamente.",
    });
  };

  const handleGeneratePDF = () => {
    setPdfDialogOpen(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Erro ao carregar dados do relatório: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-3xl font-bold">Relatórios Mensais</h2>
          <p className="text-muted-foreground">Visualize e exporte relatórios organizados por mês</p>
        </div>
        <Button onClick={handleGeneratePDF} disabled={isLoading || !monthlyData} data-testid="button-open-report-dialog">
          <FileText className="mr-2 h-4 w-4" />
          Gerar Relatório PDF
        </Button>
      </div>

      {/* Report Filters */}
      <Card className="mb-1">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="year">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue placeholder="2024" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 2045 - 2022 + 1 }, (_, i) => 2045 - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="month">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Março</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Maio</SelectItem>
                  <SelectItem value="06">Junho</SelectItem>
                  <SelectItem value="07">Julho</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="report-type">Tipo de Relatório</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Completo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Completo</SelectItem>
                  <SelectItem value="clients">Apenas Clientes</SelectItem>
                  <SelectItem value="departures">Apenas Embarques</SelectItem>
                  <SelectItem value="revenue">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button variant="secondary" onClick={handleExportCSV} className="w-full" disabled={isLoading || !monthlyData} data-testid="button-export-csv">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center p-8">Carregando dados do relatório...</div>
      ) : (
        <>
          {/* Monthly Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-1">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Novos Clientes</p>
                    <h3 className="text-3xl font-bold text-blue-600 mt-2">{monthlyData?.stats.newClients || 0}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita do Mês</p>
                    <h3 className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(monthlyData?.stats.revenue || 0)}</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                    <h3 className="text-3xl font-bold text-purple-600 mt-2">{monthlyData?.clients.length || 0}</h3>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Section */}
          <div className="grid grid-cols-1 gap-6 mb-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Visão Mensal - {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="h-[300px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.toString()}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'receita') {
                                return [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita'];
                              }
                              return [value, name === 'clientes' ? 'Clientes' : name];
                            }}
                            labelFormatter={(label) => {
                              const item = chartData.find(d => d.name === label);
                              return item ? item.fullName : label;
                            }}
                          />
                          <Legend 
                            formatter={(value) => value === 'clientes' ? 'Clientes' : 'Receita'}
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="clientes" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="receita" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full bg-gradient-to-br from-chart-2 to-chart-4 rounded-lg flex items-center justify-center text-white font-semibold">
                        <span>Sem dados suficientes para gráfico</span>
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Report Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento do Relatório - {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}</CardTitle>
            </CardHeader>
            {monthlyData?.clients && monthlyData.clients.length > 0 ? (
              <div className="">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead>Tipo de Pagamento</TableHead>
                      <TableHead>Valor do Mês</TableHead>
                      <TableHead>Preço Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allClients
                      .map((client: any) => ({
                        ...client,
                        installmentInfo: getClientInstallmentInfo(client)
                      }))
                      .filter((client: any) => client.installmentInfo !== null)
                      .map((client: any) => (
                      <TableRow key={client.id} data-testid={`report-row-${client.id}`}>
                        <TableCell>
                          <div className="font-medium">{client.first_name} {client.last_name}</div>
                          <div className="text-sm text-muted-foreground">{client.phone}</div>
                        </TableCell>
                        <TableCell>{client.destination}</TableCell>
                        <TableCell className="text-sm">{new Date(client.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            client.installmentInfo.type === 'down_payment' ? 'default' :
                            client.installmentInfo.type === 'installment' ? 'secondary' :
                            'outline'
                          }>
                            {client.installmentInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(client.installmentInfo.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.travel_price ? formatCurrency(client.travel_price) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado para o período selecionado.
              </div>
            )}
            
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Total do período: <span className="font-medium text-foreground">{monthlyData?.clients.length || 0} clientes</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(monthlyData?.totalRevenue || 0)}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* PDF Report Configuration Dialog */}
      <PdfReportDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        initialYear={selectedYear}
        initialMonth={selectedMonth}
      />
    </div>
  );
}