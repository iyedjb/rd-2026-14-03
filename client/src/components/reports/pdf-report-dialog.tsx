import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon, FileText } from "lucide-react";
import { generateMonthlyReport } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { useMonthlyReport } from "@/hooks/use-reports";

const pdfReportSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  year: z.string().min(1, "Ano é obrigatório"),
  month: z.string().min(1, "Mês é obrigatório"),
  reportType: z.enum(["all", "clients", "departures", "revenue"]),
  includeCharts: z.boolean().default(true),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  customPeriod: z.boolean().default(false),
});

type PdfReportFormData = z.infer<typeof pdfReportSchema>;

interface PdfReportDialogProps {
  open: boolean;
  onClose: () => void;
  initialYear?: string;
  initialMonth?: string;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const reportTypeOptions = [
  { value: "all", label: "📊 Relatório Completo", description: "Inclui clientes, embarques e receita" },
  { value: "clients", label: "👥 Apenas Clientes", description: "Foco nos dados dos clientes" },
  { value: "departures", label: "✈️ Apenas Embarques", description: "Dados de viagens e embarques" },
  { value: "revenue", label: "💰 Receita", description: "Análise financeira e receitas" },
];

export function PdfReportDialog({ 
  open, 
  onClose, 
  initialYear = new Date().getFullYear().toString(),
  initialMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
}: PdfReportDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<PdfReportFormData>({
    resolver: zodResolver(pdfReportSchema),
    defaultValues: {
      title: `Relatório Mensal - ${monthNames[parseInt(initialMonth) - 1]} ${initialYear}`,
      description: "",
      year: initialYear,
      month: initialMonth,
      reportType: "all",
      includeCharts: true,
      customPeriod: false,
    },
  });

  const watchCustomPeriod = form.watch("customPeriod");
  const selectedYear = form.watch("year");
  const selectedMonth = form.watch("month");

  // Reset form when dialog opens or initial props change
  useEffect(() => {
    if (open) {
      const newTitle = `Relatório Mensal - ${monthNames[parseInt(initialMonth) - 1]} ${initialYear}`;
      form.reset({
        title: newTitle,
        description: "",
        year: initialYear,
        month: initialMonth,
        reportType: "all",
        includeCharts: true,
        customPeriod: false,
      });
    }
  }, [open, initialYear, initialMonth, form]);

  // Get data for the selected period
  const { data: monthlyData } = useMonthlyReport(
    parseInt(selectedYear), 
    parseInt(selectedMonth)
  );

  const onSubmit = async (data: PdfReportFormData) => {
    if (!monthlyData) {
      toast({
        title: "Nenhum dado disponível",
        description: "Não há dados para o período selecionado.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      console.log('Starting PDF generation with data:', monthlyData);
      console.log('Month name:', monthNames[parseInt(data.month) - 1]);
      console.log('Year:', data.year);

      toast({
        title: "Gerando relatório PDF...",
        description: "Aguarde enquanto preparamos seu relatório personalizado.",
      });

      const monthName = monthNames[parseInt(data.month) - 1];
      await generateMonthlyReport(monthlyData, monthName, data.year);
      
      toast({
        title: "✅ Relatório gerado com sucesso!",
        description: `O arquivo "${data.title}" foi baixado automaticamente.`,
      });
      
      onClose();
    } catch (error) {
      console.error('PDF generation error (detailed):', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Monthly data that caused error:', monthlyData);
      
      toast({
        title: "❌ Erro ao gerar relatório",
        description: `Erro: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Configurar Relatório PDF
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
            
            {/* Report Title and Description */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>🏷️ Título do Relatório</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Relatório Mensal - Janeiro 2025"
                        {...field}
                        data-testid="input-report-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>📝 Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione uma descrição personalizada para este relatório..."
                        className="min-h-[80px]"
                        {...field}
                        data-testid="textarea-report-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Period Selection */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>📅 Ano</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-report-year">
                          <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>🗓️ Mês</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-report-month">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthNames.map((month, index) => (
                          <SelectItem key={index} value={(index + 1).toString().padStart(2, '0')}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Report Type */}
            <FormField
              control={form.control}
              name="reportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>📋 Tipo de Relatório</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-report-type">
                        <SelectValue placeholder="Selecione o tipo de relatório" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reportTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data Summary */}
            {monthlyData && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  📊 Dados do Período Selecionado
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      {monthlyData.stats.newClients}
                    </div>
                    <div className="text-muted-foreground">Clientes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-green-600 dark:text-green-400">
                      {monthlyData.stats.departures}
                    </div>
                    <div className="text-muted-foreground">Embarques</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      R$ {monthlyData.stats.revenue.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-muted-foreground">Receita</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isGenerating}
                data-testid="button-cancel-report"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isGenerating || !monthlyData}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-generate-report"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Relatório PDF
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}