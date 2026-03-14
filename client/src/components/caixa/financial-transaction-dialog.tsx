import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFinancialTransactionSchema, type FinancialTransaction } from "@shared/schema";
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
import { CalendarIcon } from "lucide-react";
import { useCreateFinancialTransaction, useUpdateFinancialTransaction } from "@/hooks/use-financial-transactions";
import { useEffect, useRef } from "react";

interface FinancialTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  transaction?: FinancialTransaction | null;
}

const colorOptions = [
  { value: "red", label: "Alta (Vermelho)", color: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200" },
  { value: "yellow", label: "Média (Amarelo)", color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200" },
  { value: "green", label: "Baixa (Verde)", color: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" },
  { value: "blue", label: "Informativo (Azul)", color: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200" },
];

export function FinancialTransactionDialog({ 
  open, 
  onClose, 
  transaction 
}: FinancialTransactionDialogProps) {
  const createTransaction = useCreateFinancialTransaction();
  const updateTransaction = useUpdateFinancialTransaction();
  const prevTransactionIdRef = useRef<string | null | undefined>(undefined);

  const form = useForm({
    resolver: zodResolver(insertFinancialTransactionSchema),
    defaultValues: {
      amount: transaction ? Math.abs(transaction.amount) : undefined,
      description: transaction?.description || "",
      category: transaction?.category || "",
      payment_method: transaction?.payment_method || "pix",
      type: transaction ? (transaction.amount >= 0 ? "income" : "expense") : "income",
      transaction_date: transaction?.transaction_date || new Date(),
    },
  });

  useEffect(() => {
    const currentTransactionId = transaction?.id || null;
    const prevTransactionId = prevTransactionIdRef.current;
    
    if (prevTransactionId !== currentTransactionId) {
      form.reset({
        amount: transaction ? Math.abs(transaction.amount) : undefined,
        description: transaction?.description || "",
        category: transaction?.category || "",
        payment_method: transaction?.payment_method || "pix",
        type: transaction ? (transaction.amount >= 0 ? "income" : "expense") : "income",
        transaction_date: transaction?.transaction_date || new Date(),
      });
      
      prevTransactionIdRef.current = currentTransactionId;
    }
  }, [transaction, form]);

  const onSubmit = (data: any) => {
    let amount = parseFloat(data.amount.toString()); // Ensure it's a number
    
    // Make amount negative for expenses and positive for income
    if (data.type === "expense" && amount > 0) {
      amount = -amount;
    } else if (data.type === "income" && amount < 0) {
      amount = Math.abs(amount);
    }
    
    const transactionData = {
      ...data,
      amount,
    };

    if (transaction) {
      updateTransaction.mutate(
        { id: transaction.id, data: transactionData },
        { onSuccess: onClose }
      );
    } else {
      createTransaction.mutate(transactionData, { onSuccess: onClose });
    }
  };

  const isLoading = createTransaction.isPending || updateTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação Financeira"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo da Transação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">💰 Entrada</SelectItem>
                        <SelectItem value="expense">💸 Saída</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Transação</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-date-picker"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: pt })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={pt}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1500.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-amount"
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que é essa transação (ex: Pagamento de taxas, Impostos, Recebimento de cliente)"
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix">📱 PIX</SelectItem>
                      <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="credito">💳 Crédito</SelectItem>
                      <SelectItem value="debito">🏦 Débito</SelectItem>
                      <SelectItem value="boleto">📄 Boleto</SelectItem>
                      <SelectItem value="link">🔗 Link</SelectItem>
                      <SelectItem value="credito_viagens_interiores">🎁 Crédito de Viagens Interiores</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Despesa operacional, Receita de viagem"
                      {...field}
                      data-testid="input-category"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-save"
              >
                {isLoading ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
