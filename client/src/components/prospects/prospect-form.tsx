import { useState, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { insertProspectSchema } from "@shared/schema";
import { useActiveDestinations } from "@/hooks/use-destinations";
import { useQuery } from "@tanstack/react-query";
import type { InsertProspect, Prospect, Client } from "@/types";
import { toTitleCase, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  X, 
  Plus,
  Loader2,
  Calendar,
  Check,
  ChevronsUpDown,
  UserCheck,
  Users
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

interface ProspectFormProps {
  initialData?: Partial<Prospect>;
  onSubmit: (data: InsertProspect) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

interface PhoneNumber {
  label: string;
  number: string;
}

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const formatBrazilianPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";
  if (numbers.length <= 2) return `+${numbers}`;
  if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
  if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
  return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
};

const formSchema = insertProspectSchema.extend({
  cpf: z.string().min(1, "CPF é obrigatório"),
});

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function ProspectForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading, 
  mode 
}: ProspectFormProps) {
  const { data: destinations, isLoading: isLoadingDestinations } = useActiveDestinations();
  const { toast } = useToast();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    { label: 'Principal', number: initialData?.phone || '' }
  ]);
  const [cepLoading, setCepLoading] = useState(false);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(
    initialData?.interested_destinations || []
  );
  const [customDestination, setCustomDestination] = useState("");
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialData?.from_client_id);
  type RelationshipType = "filho" | "filha" | "pai" | "mae" | "sogro" | "sogra" | "enteado" | "enteada" | "neto" | "neta" | "cônjuge" | "noivo" | "namorado" | "irmao" | "irma" | "outro";
  const [companions, setCompanions] = useState<{
    name: string;
    birthdate?: Date;
    phone?: string;
    cpf?: string;
    rg?: string;
    passport_number?: string;
    relationship?: RelationshipType;
  }[]>(initialData?.companions || []);

  // Fetch ALL clients for the selector (limit=1000 to get all)
  const { data: clientsData, isLoading: isLoadingClients } = useQuery<{ clients: Client[] }>({
    queryKey: ['/api/clients?limit=1000'],
  });
  const clients = clientsData?.clients || [];
  
  const parseBirthdate = (value: Date | string | undefined): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  };

  const form = useForm<InsertProspect>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      cpf: initialData?.cpf || "",
      rg: initialData?.rg || "",
      birthdate: parseBirthdate(initialData?.birthdate),
      civil_status: initialData?.civil_status || undefined,
      spouse_name: initialData?.spouse_name || "",
      nationality: initialData?.nationality || "",
      gender: initialData?.gender || undefined,
      phone: initialData?.phone || "",
      phone_numbers: initialData?.phone_numbers || [],
      email: initialData?.email || "",
      profession: initialData?.profession || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      postal_code: initialData?.postal_code || "",
      notes: initialData?.notes || "",
      interested_destinations: initialData?.interested_destinations || [],
    },
  });

  const civilStatus = form.watch("civil_status");

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset({
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        cpf: initialData.cpf || "",
        rg: initialData.rg || "",
        birthdate: parseBirthdate(initialData.birthdate),
        civil_status: initialData.civil_status || undefined,
        spouse_name: initialData.spouse_name || "",
        nationality: initialData.nationality || "",
        gender: initialData.gender || undefined,
        phone: initialData.phone || "",
        phone_numbers: initialData.phone_numbers || [],
        email: initialData.email || "",
        profession: initialData.profession || "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        postal_code: initialData.postal_code || "",
        notes: initialData.notes || "",
        interested_destinations: initialData.interested_destinations || [],
      });
      setPhoneNumbers([{ label: 'Principal', number: initialData.phone || '' }]);
      setSelectedDestinations(initialData.interested_destinations || []);
    }
  }, [initialData, mode, form]);

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { label: '', number: '' }]);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index: number, field: 'label' | 'number', value: string) => {
    const updated = [...phoneNumbers];
    updated[index][field] = value;
    setPhoneNumbers(updated);
    if (index === 0 && field === 'number') {
      form.setValue('phone', value);
    }
  };

  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
        return;
      }
      
      form.setValue('address', data.logradouro || '');
      form.setValue('city', data.localidade || '');
      form.setValue('state', data.uf || '');
      form.setValue('postal_code', cleanCep);

      toast({
        title: "Endereço encontrado!",
        description: "Endereço preenchido automaticamente.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível buscar o endereço.",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
    }
  }, [form, toast]);

  // Handle client selection and autofill the form
  const handleClientSelect = useCallback(async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    setSelectedClientId(clientId);
    setClientSelectorOpen(false);
    
    // Parse birthdate from client
    const clientBirthdate = client.birthdate ? 
      (client.birthdate instanceof Date ? client.birthdate : new Date(client.birthdate)) 
      : undefined;
    
    // Autofill form with client data
    form.setValue('first_name', client.first_name || '');
    form.setValue('last_name', client.last_name || '');
    form.setValue('cpf', client.cpf || '');
    form.setValue('rg', client.rg || '');
    form.setValue('birthdate', clientBirthdate);
    form.setValue('civil_status', client.civil_status || undefined);
    form.setValue('spouse_name', client.spouse_name || '');
    form.setValue('nationality', client.nationality || '');
    form.setValue('gender', client.gender || undefined);
    form.setValue('phone', client.phone || '');
    form.setValue('email', client.email || '');
    form.setValue('profession', client.profession || '');
    form.setValue('address', client.address || '');
    form.setValue('city', client.city || '');
    form.setValue('state', client.state || '');
    form.setValue('postal_code', client.postal_code || '');
    
    // Update phone numbers state
    const primaryPhone = { label: 'Principal', number: client.phone || '' };
    setPhoneNumbers([primaryPhone]);
    
    // Fetch children/companions for this client
    try {
      const { auth } = await import('@/lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const response = await fetch(`/api/clients/${clientId}/children`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
        if (response.ok) {
          const childrenData = await response.json();
          if (childrenData && Array.isArray(childrenData) && childrenData.length > 0) {
            const mappedCompanions = childrenData.map((child: any) => ({
              name: child.name || '',
              birthdate: child.birthdate ? new Date(child.birthdate) : undefined,
              phone: child.phone || '',
              cpf: child.cpf || '',
              rg: child.rg || '',
              passport_number: child.passport_number || '',
              relationship: (child.relationship as RelationshipType) || 'outro',
            }));
            setCompanions(mappedCompanions);
            toast({
              title: "Acompanhantes carregados!",
              description: `${mappedCompanions.length} acompanhante(s) adicionado(s).`,
            });
          } else {
            // No companions, clear any existing
            setCompanions([]);
          }
        } else {
          console.warn('Failed to fetch children, status:', response.status);
        }
      }
    } catch (error) {
      console.warn('Could not fetch children for client:', error);
    }
    
    toast({
      title: "Dados preenchidos!",
      description: `Dados de ${client.first_name} ${client.last_name} preenchidos automaticamente.`,
    });
  }, [clients, form, toast]);

  // Clear client selection
  const handleClearClientSelection = useCallback(() => {
    setSelectedClientId(undefined);
    form.reset({
      first_name: "",
      last_name: "",
      cpf: "",
      rg: "",
      birthdate: undefined,
      civil_status: undefined,
      spouse_name: "",
      nationality: "",
      gender: undefined,
      phone: "",
      phone_numbers: [],
      email: "",
      profession: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      notes: "",
      interested_destinations: [],
    });
    setPhoneNumbers([{ label: 'Principal', number: '' }]);
    setSelectedDestinations([]);
    toast({
      title: "Seleção limpa",
      description: "Formulário limpo para novo cadastro.",
    });
  }, [form, toast]);

  // Get selected client name
  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const toggleDestination = (destinationName: string) => {
    setSelectedDestinations(prev => {
      const updated = prev.includes(destinationName)
        ? prev.filter(d => d !== destinationName)
        : [...prev, destinationName];
      form.setValue('interested_destinations', updated);
      return updated;
    });
  };

  const addCustomDestination = () => {
    if (customDestination.trim() && !selectedDestinations.includes(customDestination)) {
      const updated = [...selectedDestinations, customDestination];
      setSelectedDestinations(updated);
      form.setValue('interested_destinations', updated);
      setCustomDestination("");
    }
  };

  const removeDestination = (destinationName: string) => {
    const updated = selectedDestinations.filter(d => d !== destinationName);
    setSelectedDestinations(updated);
    form.setValue('interested_destinations', updated);
  };

  // Companion management functions
  const addCompanion = () => {
    const newCompanions = [...companions, {
      name: '',
      birthdate: undefined,
      phone: '',
      cpf: '',
      rg: '',
      passport_number: '',
      relationship: 'filho' as const,
    }];
    setCompanions(newCompanions);
  };

  const removeCompanion = (index: number) => {
    const newCompanions = companions.filter((_, i) => i !== index);
    setCompanions(newCompanions);
  };

  const updateCompanion = (index: number, field: string, value: any) => {
    const updated = companions.map((companion, i) => {
      if (i !== index) return companion;
      if (field === 'relationship') {
        return { ...companion, [field]: value as RelationshipType };
      }
      return { ...companion, [field]: value };
    });
    setCompanions(updated);
  };

  const handleSubmit = (data: InsertProspect) => {
    const formData = {
      ...data,
      phone: phoneNumbers[0]?.number || data.phone,
      phone_numbers: phoneNumbers.filter(p => p.number).map(p => ({
        label: p.label || 'Principal',
        number: p.number
      })),
      interested_destinations: selectedDestinations,
      companions: companions.filter(c => c.name.trim() !== ''), // Only include companions with names
      from_client_id: selectedClientId, // Store the reference to the original client
    };
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Client Selection Section - Only show in create mode */}
          {mode === 'create' && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-3xl p-6 shadow-sm border border-purple-100 dark:border-purple-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Preencher com Cliente Existente</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Selecione um cliente cadastrado para preencher automaticamente</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Popover open={clientSelectorOpen} onOpenChange={setClientSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSelectorOpen}
                      className="flex-1 justify-between rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      data-testid="button-select-client"
                    >
                      {selectedClient ? (
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-purple-500" />
                          {selectedClient.first_name} {selectedClient.last_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione um cliente cadastrado...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command
                      filter={(value, search) => {
                        // Custom filter: check if any word starts with the search term
                        const normalizedSearch = search.toLowerCase().trim();
                        const normalizedValue = value.toLowerCase();
                        // Check if value contains search term (substring match)
                        if (normalizedValue.includes(normalizedSearch)) return 1;
                        // Check if any word starts with search term
                        const words = normalizedValue.split(/\s+/);
                        for (const word of words) {
                          if (word.startsWith(normalizedSearch)) return 1;
                        }
                        return 0;
                      }}
                    >
                      <CommandInput placeholder="Buscar cliente por nome ou CPF..." />
                      <CommandList className="max-h-[400px] overflow-y-auto">
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {isLoadingClients ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.first_name} ${client.last_name} ${client.cpf}`}
                                onSelect={() => handleClientSelect(client.id)}
                                className="cursor-pointer"
                                data-testid={`select-client-${client.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.first_name} {client.last_name}</span>
                                  <span className="text-xs text-muted-foreground">{client.cpf} - {client.destination}</span>
                                </div>
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {selectedClient && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleClearClientSelection}
                    className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                    data-testid="button-clear-client-selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {selectedClient && (
                <div className="mt-4 flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl">
                    Cliente Selecionado
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Os dados serão preenchidos automaticamente
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Personal Information Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-3xl p-6 shadow-sm border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dados Pessoais</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Informações básicas do cliente interessado</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Nome *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome" 
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-first-name"
                        {...field}
                        onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Sobrenome *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Sobrenome"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-last-name"
                        {...field}
                        onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">CPF *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-cpf"
                        {...field}
                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">RG</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="RG"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-rg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Data de Nascimento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          type="date"
                          className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 pl-10"
                          data-testid="input-birthdate"
                          value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" data-testid="select-gender">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="civil_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Estado Civil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" data-testid="select-civil-status">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {civilStatus === "casado" && (
                <FormField
                  control={form.control}
                  name="spouse_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Nome do Cônjuge</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do cônjuge"
                          className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                          data-testid="input-spouse-name"
                          {...field}
                          onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Nacionalidade</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brasileiro(a)"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-nationality"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Profissão</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Profissão"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        data-testid="input-profession"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-3xl p-6 shadow-sm border border-green-100 dark:border-green-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Contato</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefones e email para contato</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefones</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhoneNumber}
                  className="rounded-xl"
                  data-testid="button-add-phone"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-3">
                    <Input
                      value={phone.label}
                      onChange={(e) => updatePhoneNumber(index, 'label', e.target.value)}
                      placeholder="Etiqueta (ex: Principal)"
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      data-testid={`input-phone-label-${index}`}
                    />
                  </div>
                  <div className="md:col-span-8">
                    <Input
                      value={phone.number}
                      onChange={(e) => updatePhoneNumber(index, 'number', formatBrazilianPhone(e.target.value))}
                      placeholder="+55 (11) 99999-9999"
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      data-testid={`input-phone-number-${index}`}
                    />
                  </div>
                  <div className="md:col-span-1">
                    {phoneNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhoneNumber(index)}
                        className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-phone-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="email@exemplo.com"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-3xl p-6 shadow-sm border border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Endereço</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Localização do cliente</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="00000-000"
                          className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                          data-testid="input-postal-code"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleCepChange(e.target.value);
                          }}
                          maxLength={9}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-purple-500" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-gray-700 dark:text-gray-300">Endereço</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Rua, número, complemento"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                        data-testid="input-address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Cidade</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Cidade"
                        className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                        data-testid="input-city"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" data-testid="select-state">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Interested Destinations Section */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-3xl p-6 shadow-sm border border-amber-100 dark:border-amber-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Destinos de Interesse</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Selecione ou digite os destinos que o cliente tem interesse</p>
              </div>
            </div>
            
            {/* Custom Destination Input */}
            <div className="mb-6 flex gap-2">
              <Input
                placeholder="Digite um destino customizado..."
                className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-amber-500"
                data-testid="input-custom-destination"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomDestination();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addCustomDestination}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-6"
                data-testid="button-add-custom-destination"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Predefined Destinations */}
            {isLoadingDestinations ? (
              <div className="flex items-center gap-2 text-gray-500 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando destinos...
              </div>
            ) : destinations && destinations.length > 0 ? (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Destinos Disponíveis</p>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((destination) => (
                    <Badge
                      key={destination.id}
                      variant={selectedDestinations.includes(destination.name) ? "default" : "outline"}
                      className={`cursor-pointer px-4 py-2 text-sm rounded-2xl transition-all ${
                        selectedDestinations.includes(destination.name)
                          ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500'
                          : 'bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                      }`}
                      onClick={() => toggleDestination(destination.name)}
                      data-testid={`badge-destination-${destination.id}`}
                    >
                      {destination.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Selected Destinations Display */}
            {selectedDestinations.length > 0 && (
              <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-3">
                  <strong>{selectedDestinations.length}</strong> destino(s) selecionado(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDestinations.map((destination) => (
                    <Badge
                      key={destination}
                      variant="secondary"
                      className="bg-amber-500 text-white px-3 py-1 text-xs rounded-full flex items-center gap-2 cursor-pointer hover:bg-amber-600"
                      onClick={() => removeDestination(destination)}
                      data-testid={`badge-selected-destination-${destination}`}
                    >
                      {destination}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Companions Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-3xl p-6 shadow-sm border border-green-100 dark:border-green-900">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Companhia</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pessoas que irão viajar junto</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCompanion}
                className="rounded-xl"
                data-testid="button-add-companion"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Pessoa
              </Button>
            </div>
            
            {companions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma pessoa adicionada. Clique em "Adicionar Pessoa" para incluir.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {companions.map((companion, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Pessoa {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompanion(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-companion-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label htmlFor={`companion-name-${index}`}>Nome *</Label>
                        <Input
                          id={`companion-name-${index}`}
                          value={companion.name}
                          onChange={(e) => updateCompanion(index, 'name', toTitleCase(e.target.value))}
                          placeholder="Nome completo"
                          className="rounded-xl"
                          data-testid={`input-companion-name-${index}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-birthdate-${index}`}>Data de Nascimento</Label>
                        <Input
                          id={`companion-birthdate-${index}`}
                          type="date"
                          value={companion.birthdate ? (companion.birthdate instanceof Date ? companion.birthdate.toISOString().split('T')[0] : companion.birthdate) : ''}
                          onChange={(e) => updateCompanion(index, 'birthdate', e.target.value ? new Date(e.target.value) : undefined)}
                          className="rounded-xl"
                          data-testid={`input-companion-birthdate-${index}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-phone-${index}`}>Telefone</Label>
                        <Input
                          id={`companion-phone-${index}`}
                          value={companion.phone || ''}
                          onChange={(e) => updateCompanion(index, 'phone', formatBrazilianPhone(e.target.value))}
                          placeholder="+55 (11) 99999-9999"
                          className="rounded-xl"
                          data-testid={`input-companion-phone-${index}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-relationship-${index}`}>Parentesco</Label>
                        <Select
                          value={companion.relationship || ''}
                          onValueChange={(value) => updateCompanion(index, 'relationship', value)}
                        >
                          <SelectTrigger className="rounded-xl" data-testid={`select-companion-relationship-${index}`}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="filho">Filho(a)</SelectItem>
                            <SelectItem value="cônjuge">Cônjuge</SelectItem>
                            <SelectItem value="pai">Pai</SelectItem>
                            <SelectItem value="mae">Mãe</SelectItem>
                            <SelectItem value="irmao">Irmão/Irmã</SelectItem>
                            <SelectItem value="neto">Neto(a)</SelectItem>
                            <SelectItem value="sogro">Sogro(a)</SelectItem>
                            <SelectItem value="noivo">Noivo(a)</SelectItem>
                            <SelectItem value="namorado">Namorado(a)</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                      <div>
                        <Label htmlFor={`companion-cpf-${index}`}>CPF</Label>
                        <Input
                          id={`companion-cpf-${index}`}
                          value={companion.cpf || ''}
                          onChange={(e) => updateCompanion(index, 'cpf', formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="rounded-xl"
                          data-testid={`input-companion-cpf-${index}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-rg-${index}`}>RG</Label>
                        <Input
                          id={`companion-rg-${index}`}
                          value={companion.rg || ''}
                          onChange={(e) => updateCompanion(index, 'rg', e.target.value)}
                          placeholder="RG"
                          className="rounded-xl"
                          data-testid={`input-companion-rg-${index}`}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`companion-passport-${index}`}>Passaporte</Label>
                        <Input
                          id={`companion-passport-${index}`}
                          value={companion.passport_number || ''}
                          onChange={(e) => updateCompanion(index, 'passport_number', e.target.value)}
                          placeholder="Passaporte"
                          className="rounded-xl"
                          data-testid={`input-companion-passport-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gray-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Observações</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Anotações adicionais sobre o cliente</p>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione observações, preferências ou informações importantes sobre o cliente..."
                      className="rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gray-500 min-h-[120px]"
                      data-testid="textarea-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={onCancel}
              className="rounded-xl px-6"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="rounded-xl px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
              data-testid="button-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                mode === 'create' ? "Cadastrar Cliente" : "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
