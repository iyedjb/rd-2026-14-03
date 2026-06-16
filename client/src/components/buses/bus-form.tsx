import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBus, useUpdateBus } from "@/hooks/use-buses";
import { insertBusSchema, type Bus, type InsertBus } from "@shared/schema";
import { z } from "zod";

const busFormSchema = insertBusSchema.omit({ seat_layout: true });

interface BusFormProps {
  bus?: Bus;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BusForm({ bus, onSuccess, onCancel }: BusFormProps) {
  const createMutation = useCreateBus();
  const updateMutation = useUpdateBus();

  const form = useForm<z.infer<typeof busFormSchema>>({
    resolver: zodResolver(busFormSchema),
    defaultValues: {
      name: bus?.name || "",
      type: bus?.type || "",
      total_seats: bus?.total_seats || 0,
      pdf_file_name: bus?.pdf_file_name || "",
      is_active: bus?.is_active ?? true,
    },
  });

  const onSubmit = async (data: z.infer<typeof busFormSchema>) => {
    // Only auto-generate seat layout for new buses or when it doesn't exist
    let busData;
    if (bus && bus.seat_layout) {
      // Preserve existing layout when editing
      busData = {
        ...data,
        seat_layout: bus.seat_layout
      };
    } else {
      // Auto-generate simple seat layout for new buses
      const seats = Array.from({ length: data.total_seats }, (_, i) => (i + 1).toString());
      busData = {
        ...data,
        seat_layout: JSON.stringify({ seats })
      };
    }
    
    if (bus) {
      updateMutation.mutate(
        { id: bus.id, data: busData },
        { onSuccess }
      );
    } else {
      createMutation.mutate(busData, { onSuccess });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bus ? "Editar Ônibus" : "Adicionar Ônibus"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Ônibus</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Ônibus Executivo 1"
                        data-testid="input-bus-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo do Ônibus</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-bus-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DD 64">DD 64 (Double Decker 64 assentos)</SelectItem>
                        <SelectItem value="LD 46">LD 46 (Leito 46 assentos)</SelectItem>
                        <SelectItem value="Executivo 46">Executivo 46 assentos</SelectItem>
                        <SelectItem value="Grafico 42">Gráfico 42 assentos</SelectItem>
                        <SelectItem value="Micro 30">Micro 30 lugares</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_seats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Assentos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 46"
                        data-testid="input-total-seats"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_file_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arquivo PDF (Referência)</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-pdf-file">
                          <SelectValue placeholder="Selecione o PDF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="MAPA ÔNIBUS G7_1759959677485.pdf">MAPA ÔNIBUS G7 (DD 64)</SelectItem>
                        <SelectItem value="NOVO MAPA LD_1759959677488.pdf">NOVO MAPA LD</SelectItem>
                        <SelectItem value="Mapa de poltronas micro 30 lugares_1759959677488.pdf">Micro 30 lugares</SelectItem>
                        <SelectItem value="Mapa de Poltronas - EXECUTIVO 46 POLTRONAS (1)_1759959677489.pdf">Executivo 46 poltronas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Arquivo PDF com o mapa de assentos do ônibus
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ônibus Ativo</FormLabel>
                    <FormDescription>
                      Ônibus ativos podem ser selecionados em destinos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Salvando..." : bus ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
