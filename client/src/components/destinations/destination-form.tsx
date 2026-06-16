import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Tag, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseDateValue } from "@/lib/date-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBuses } from "@/hooks/use-buses";
import { insertDestinationSchema, type Destination, type InsertDestination } from "@shared/schema";

interface DestinationFormProps {
  destination?: Destination;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DestinationForm({ destination, onSuccess, onCancel }: DestinationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: buses, isLoading: busesLoading } = useBuses();

  const form = useForm<InsertDestination>({
    resolver: zodResolver(insertDestinationSchema),
    defaultValues: {
      name: destination?.name || "",
      description: destination?.description || "",
      country: destination?.country || "",
      price: destination?.price ?? undefined,
      bus_id: destination?.bus_id || undefined,
      operadora: destination?.operadora || undefined,
      kids_policy: destination?.kids_policy || undefined,
      periodo_viagem_inicio: destination?.periodo_viagem_inicio ? parseDateValue(destination.periodo_viagem_inicio) || undefined : undefined,
      periodo_viagem_fim: destination?.periodo_viagem_fim ? parseDateValue(destination.periodo_viagem_fim) || undefined : undefined,
      embarque: destination?.embarque || "",
      retorno: destination?.retorno || "",
      horario_saida: destination?.horario_saida || "",
      horario_volta: destination?.horario_volta || "",
      transporte: destination?.transporte || "",
      hospedagem: destination?.hospedagem || "",
      passeios_adicionais: destination?.passeios_adicionais || "",
      whatsapp_group_link: destination?.whatsapp_group_link || "",
      guias: destination?.guias || "",
      o_motorista: destination?.o_motorista || "",
      nome_empresa_onibus: destination?.nome_empresa_onibus || "",
      is_active: destination?.is_active ?? true,
      has_levels: destination?.has_levels ?? false,
      ouro_price: destination?.ouro_price ?? undefined,
      prata_price: destination?.prata_price ?? undefined,
      bronze_price: destination?.bronze_price ?? undefined,
      is_black_friday: destination?.is_black_friday ?? false,
      black_friday_price: destination?.black_friday_price ?? undefined,
      black_friday_start: destination?.black_friday_start ? parseDateValue(destination.black_friday_start) || undefined : undefined,
      black_friday_end: destination?.black_friday_end ? parseDateValue(destination.black_friday_end) || undefined : undefined,
      frete: destination?.frete ?? undefined,
      custo_almoços: destination?.custo_almoços ?? undefined,
      custo_inclusos: destination?.custo_inclusos ?? undefined,
    },
  });

  const isBlackFriday = useWatch({
    control: form.control,
    name: "is_black_friday",
  });

  const hasLevels = useWatch({
    control: form.control,
    name: "has_levels",
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDestination) => {
      await apiRequest('POST', '/api/destinations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'] });
      toast({
        title: "Destino criado",
        description: "O novo destino foi adicionado com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o destino.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertDestination) => {
      await apiRequest('PUT', `/api/destinations/${destination!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/destinations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/destinations/active'] });
      toast({
        title: "Destino atualizado",
        description: "O destino foi modificado com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o destino.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDestination) => {
    if (destination) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {destination ? "Editar Destino" : "Adicionar Novo Destino"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Destino</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Maceió, Gramado, Porto de Galinhas..."
                      data-testid="input-destination-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Brasil, Argentina, Chile..."
                      data-testid="input-destination-country"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bus_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Ônibus (opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value ?? "none"}
                    disabled={busesLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-destination-bus">
                        <SelectValue placeholder="Selecione o tipo de ônibus" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {buses?.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id}>
                          {bus.name} ({bus.total_seats} assentos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operadora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operadora / Consolidadora (opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-destination-operadora">
                        <SelectValue placeholder="Selecione a operadora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="azul_viagens">Azul Viagens</SelectItem>
                      <SelectItem value="cvc">CVC</SelectItem>
                      <SelectItem value="patria">Pátria</SelectItem>
                      <SelectItem value="next_tour">Next Tour</SelectItem>
                      <SelectItem value="galaxia">Galáxia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kids_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Política de Crianças (opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-destination-kids-policy">
                        <SelectValue placeholder="Selecione a política" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Não especificada</SelectItem>
                      <SelectItem value="yes">Crianças 5+ anos podem escolher assento e pagam</SelectItem>
                      <SelectItem value="no">Crianças 5 anos ou menos não podem escolher assento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define se crianças com 5 anos ou menos podem selecionar assentos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição opcional do destino..."
                      className="min-h-[80px]"
                      data-testid="input-destination-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (Valor da Viagem)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 1500.00"
                      data-testid="input-destination-price"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Este valor será automaticamente usado ao criar um cliente para este destino
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custos da Viagem - para Previsão de Recebimento e Fechamento */}
            <div className="rounded-lg border-2 border-dashed border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 p-4 space-y-3">
              <div className="font-bold text-base text-gray-900 dark:text-gray-100">Custos da Viagem (opcional)</div>
              <p className="text-sm text-muted-foreground">
                Usados nos cálculos de Previsão de Recebimento e Fechamento
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="frete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          data-testid="input-frete"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? undefined : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="custo_almoços"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Almoços (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          data-testid="input-custo-almocos"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? undefined : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="custo_inclusos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclusos (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          data-testid="input-custo-inclusos"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? undefined : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="periodo_viagem_inicio"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Período da Viagem - Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-periodo-inicio"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
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
                          locale={ptBR}
                          disabled={(date) => date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo_viagem_fim"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Período da Viagem - Fim</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-periodo-fim"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
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
                          locale={ptBR}
                          disabled={(date) => date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Após esta data, o destino expira e não aparecerá mais para seleção
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="embarque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embarque (Local)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Terminal Rodoviário"
                        data-testid="input-embarque"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retorno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retorno (Local)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Mesmo local"
                        data-testid="input-retorno"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="horario_saida"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Saída</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        placeholder="00:00"
                        data-testid="input-horario-saida"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Horário de partida do destino
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horario_volta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Volta</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        placeholder="00:00"
                        data-testid="input-horario-volta"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Horário de retorno do destino
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="transporte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transporte</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição do transporte (ônibus executivo, ar-condicionado, etc.)"
                      className="min-h-[60px]"
                      data-testid="input-transporte"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hospedagem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hospedagem</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição da hospedagem (nome do hotel, tipo de quarto, café da manhã, etc.)"
                      className="min-h-[60px]"
                      data-testid="input-hospedagem"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passeios_adicionais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passeios Adicionais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Passeios opcionais cobrados à parte (valores e descrições)"
                      className="min-h-[60px]"
                      data-testid="input-passeios-adicionais"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Valores cobrados à parte do pacote principal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp_group_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do Grupo WhatsApp (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://chat.whatsapp.com/..."
                      data-testid="input-whatsapp-group-link"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Os clientes verão este link após selecionarem seus assentos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3">
              <FormField
                control={form.control}
                name="guias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guias (nomes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="Ex: Maria Silva, João Santos"
                        data-testid="input-guias"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Digite os nomes dos guias separados por vírgula
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="o_motorista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O Motorista (nome)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: João Silva"
                        data-testid="input-motorista"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_empresa_onibus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa de Ônibus</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Viação ABC"
                        data-testid="input-nome-empresa-onibus"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Levels Section */}
            <div className="rounded-lg border-2 border-dashed border-amber-500 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">NÍVEIS DE PREÇO</span>
              </div>
              
              <FormField
                control={form.control}
                name="has_levels"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/30 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-bold">
                        Ativar Níveis de Preço
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Oferecer opções Ouro, Prata e Bronze com preços diferentes
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-has-levels"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {hasLevels && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="ouro_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Crown className="h-4 w-4" /> Ouro (Gold)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Ex: 2000.00"
                              data-testid="input-ouro-price"
                              className="border-amber-300 dark:border-amber-600 focus:ring-amber-500"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : Number(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prata_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Crown className="h-4 w-4" /> Prata (Silver)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Ex: 1500.00"
                              data-testid="input-prata-price"
                              className="border-gray-300 dark:border-gray-600 focus:ring-gray-500"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : Number(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bronze_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                            <Crown className="h-4 w-4" /> Bronze
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Ex: 1000.00"
                              data-testid="input-bronze-price"
                              className="border-orange-300 dark:border-orange-600 focus:ring-orange-500"
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : Number(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription className="text-amber-700 dark:text-amber-400">
                    Ao criar um cliente para este destino, será possível escolher o nível de preço
                  </FormDescription>
                </div>
              )}
            </div>

            {/* Black Friday Section */}
            <div className="rounded-lg border-2 border-dashed border-gray-800 dark:border-gray-600 bg-gradient-to-r from-gray-900/5 to-black/10 dark:from-gray-900/50 dark:to-black/30 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5 text-red-500" />
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">BLACK FRIDAY</span>
              </div>
              
              <FormField
                control={form.control}
                name="is_black_friday"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-800 dark:border-gray-600 bg-black/5 dark:bg-black/30 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-bold">
                        Ativar Black Friday
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Marcar este destino como promoção Black Friday
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-black-friday"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isBlackFriday && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <FormField
                    control={form.control}
                    name="black_friday_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-red-600 dark:text-red-400">
                          Preço Promocional Black Friday
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 999.00"
                            data-testid="input-black-friday-price"
                            className="border-red-300 dark:border-red-600 focus:ring-red-500"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? undefined : Number(value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Este valor será exibido como preço promocional no período da Black Friday
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="black_friday_start"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-bold">Início da Promoção</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-gray-800 dark:border-gray-600",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-black-friday-start"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
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
                                locale={ptBR}
                                disabled={(date) => date < new Date("1900-01-01")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="black_friday_end"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-bold">Fim da Promoção</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-gray-800 dark:border-gray-600",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-black-friday-end"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
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
                                locale={ptBR}
                                disabled={(date) => date < new Date("1900-01-01")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            A promoção ficará ativa até esta data
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Destino Ativo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Destinos inativos não aparecem na seleção de clientes
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-destination-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                data-testid="button-cancel-destination"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-save-destination"
              >
                {isLoading ? "Salvando..." : destination ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}