import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFuncionarioSchema } from "@shared/schema";
import type { InsertFuncionario } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

interface TrialPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InsertFuncionario & { trial_period_days: number }) => Promise<void>;
  isLoading?: boolean;
}

export function TrialPeriodDialog({ isOpen, onClose, onSubmit, isLoading = false }: TrialPeriodDialogProps) {
  const { toast } = useToast();
  const [trialDays, setTrialDays] = useState<number>(30);
  
  const form = useForm<InsertFuncionario>({
    resolver: zodResolver(insertFuncionarioSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      cpf: "",
      position: "",
      department: "",
      salary: 0,
      hire_date: new Date(),
    },
  });

  const handleSubmit = async (data: InsertFuncionario) => {
    if (trialDays <= 0) {
      toast({
        title: "Erro",
        description: "Período de experiência deve ser maior que 0 dias.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit({
        ...data,
        trial_period_days: trialDays,
      });
      
      form.reset();
      setTrialDays(30);
      onClose();
      
      toast({
        title: "Sucesso!",
        description: `Funcionário adicionado em período de experiência por ${trialDays} dias.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o funcionário.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Funcionário em Período de Experiência</DialogTitle>
          <DialogDescription>
            Configure os dados do funcionário e defina a duração do período de experiência
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Trial Period Duration */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <Label className="flex items-center gap-2 text-base font-semibold mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Período de Experiência (dias)
            </Label>
            <Input
              type="number"
              min="1"
              value={trialDays}
              onChange={(e) => setTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Ex: 30"
              data-testid="input-trial-days"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Após {trialDays} dia{trialDays !== 1 ? 's' : ''}, você poderá ativar ou deletar este funcionário.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Dados do Funcionário</h3>
            
            {/* Names */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="first-name">Nome</Label>
                <Input
                  id="first-name"
                  placeholder="Nome"
                  value={form.watch("first_name")}
                  onChange={(e) => form.setValue("first_name", toTitleCase(e.target.value))}
                  data-testid="input-trial-first-name"
                />
                {form.formState.errors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last-name">Sobrenome</Label>
                <Input
                  id="last-name"
                  placeholder="Sobrenome"
                  value={form.watch("last_name")}
                  onChange={(e) => form.setValue("last_name", toTitleCase(e.target.value))}
                  data-testid="input-trial-last-name"
                />
                {form.formState.errors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="email">Email (Opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...form.register("email")}
                  data-testid="input-trial-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone (Opcional)</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...form.register("phone")}
                  data-testid="input-trial-phone"
                />
              </div>
            </div>

            {/* CPF */}
            <div className="mb-4">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...form.register("cpf")}
                data-testid="input-trial-cpf"
              />
              {form.formState.errors.cpf && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.cpf.message}</p>
              )}
            </div>

            {/* Position and Department */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  placeholder="Ex: Motorista"
                  {...form.register("position")}
                  data-testid="input-trial-position"
                />
                {form.formState.errors.position && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.position.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  placeholder="Ex: Operação"
                  {...form.register("department")}
                  data-testid="input-trial-department"
                />
                {form.formState.errors.department && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.department.message}</p>
                )}
              </div>
            </div>

            {/* Salary and Hire Date */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="salary">Salário</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("salary", { valueAsNumber: true })}
                  data-testid="input-trial-salary"
                />
                {form.formState.errors.salary && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.salary.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="hire-date">Data de Admissão</Label>
                <Input
                  id="hire-date"
                  type="date"
                  {...form.register("hire_date", {
                    valueAsDate: true,
                  })}
                  data-testid="input-trial-hire-date"
                />
                {form.formState.errors.hire_date && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.hire_date.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              data-testid="button-cancel-trial"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-trial"
            >
              {isLoading ? "Adicionando..." : "Adicionar em Período de Experiência"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
