import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDepartmentSchema, type Department } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { z } from "zod";

const formSchema = insertDepartmentSchema.extend({
  subsectors: z.array(z.object({
    title: z.string().min(1, "Título é obrigatório"),
    description: z.string().min(1, "Descrição é obrigatória")
  })).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface DepartmentFormProps {
  department?: Department;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subsectors, setSubsectors] = useState<Array<{ title: string; description: string }>>(
    department?.subsectors || []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: department?.name || "",
      description: department?.description || "",
      responsible: department?.responsible || "",
      order: department?.order || 0,
      is_active: department?.is_active !== undefined ? department.is_active : true,
      subsectors: department?.subsectors || []
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest('POST', `/api/departments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments/active"] });
      toast({
        title: "Departamento criado",
        description: "O departamento foi criado com sucesso.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar departamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest('PUT', `/api/departments/${department?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments/active"] });
      toast({
        title: "Departamento atualizado",
        description: "O departamento foi atualizado com sucesso.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar departamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    const submitData = {
      ...data,
      subsectors
    };

    if (department) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addSubsector = () => {
    setSubsectors([...subsectors, { title: "", description: "" }]);
  };

  const removeSubsector = (index: number) => {
    setSubsectors(subsectors.filter((_, i) => i !== index));
  };

  const updateSubsector = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...subsectors];
    updated[index][field] = value;
    setSubsectors(updated);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Departamento</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-department-name" />
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
              <FormLabel>Descrição / Função</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} data-testid="input-department-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável (opcional)</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-department-responsible" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de Exibição</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value))}
                  data-testid="input-department-order"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Subsetores e Funções</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSubsector}
              data-testid="button-add-subsector"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Subsetor
            </Button>
          </div>

          {subsectors.map((subsector, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subsetor {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubsector(index)}
                  data-testid={`button-remove-subsector-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Input
                placeholder="Título do subsetor"
                value={subsector.title}
                onChange={e => updateSubsector(index, 'title', e.target.value)}
                data-testid={`input-subsector-title-${index}`}
              />
              
              <Textarea
                placeholder="Descrição do subsetor"
                value={subsector.description}
                onChange={e => updateSubsector(index, 'description', e.target.value)}
                rows={2}
                data-testid={`input-subsector-description-${index}`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-submit"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Salvando..."
              : department
              ? "Atualizar"
              : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
