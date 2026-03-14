import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Save, ArrowLeft, FileText, Plane, Check, ChevronsUpDown, Users, Loader2, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { insertClientSchema, baseInsertClientSchema, insertChildSchema, type Destination, type CancelledClientCredit } from "@shared/schema";

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
};
import { generateTravelContract } from "@/lib/pdf-generator";
import { generateTravelAuthorizationDoc } from "@/lib/doc-generator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Client, ClientWithChildren, Child } from "@/types";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { Clock, CheckCircle2, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn, toTitleCase, dateToLocalDateString, parseLocalDate } from "@/lib/utils";

const formSchema = baseInsertClientSchema.extend({
  cpf: z.string().min(1, "CPF é obrigatório"),
  travel_price: z.coerce.number().positive("Preço da viagem deve ser maior que zero").optional(),
  travel_level: z.enum(["ouro", "prata", "bronze"]).optional(),
  installment_due_date: z.union([z.string(), z.date()]).transform(val => 
    val instanceof Date ? dateToLocalDateString(val) : (val || '')
  ).optional(),
  first_installment_due_date: z.union([z.string(), z.date()]).transform(val => 
    val instanceof Date ? dateToLocalDateString(val) : (val || '')
  ).optional(),
  is_brinde: z.boolean().optional(),
  brinde_value: z.number().nonnegative().optional(),
}).refine(
  (data) => {
    // For agency clients, destination is required
    if (data.client_type === 'agencia' && !data.destination) {
      return false;
    }
    // For operator clients, destination and operator_name are required
    if (data.client_type === 'operadora' && (!data.destination || !data.operator_name)) {
      return false;
    }
    // For brinde payment, travel_price is required
    if (data.payment_method === 'brinde' && (!data.travel_price || data.travel_price <= 0)) {
      return false;
    }
    return true;
  },
  (data) => {
    if (data.client_type === 'agencia' && !data.destination) {
      return {
        message: "Destino é obrigatório para clientes da agência",
        path: ["destination"],
      };
    }
    if (data.client_type === 'operadora' && !data.operator_name) {
      return {
        message: "Operadora é obrigatória para clientes de operadora",
        path: ["operator_name"],
      };
    }
    if (data.client_type === 'operadora' && !data.destination) {
      return {
        message: "Destino é obrigatório para clientes de operadora",
        path: ["destination"],
      };
    }
    if (data.payment_method === 'brinde' && (!data.travel_price || data.travel_price <= 0)) {
      return {
        message: "Preço da viagem é obrigatório para pagamento tipo Brinde",
        path: ["travel_price"],
      };
    }
    return {
      message: "Dados inválidos",
      path: [],
    };
  }
);

type FormData = z.infer<typeof formSchema> & {
  children: (Omit<Child, 'id' | 'client_id'> & { birthdate?: Date })[];
};

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PhoneNumber {
  label: string;
  number: string;
}

export function ClientForm({ client, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const [children, setChildren] = useState<(Omit<Child, 'id' | 'client_id'> & { birthdate?: Date })[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([{ label: 'Principal', number: '' }]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [discountApprovalStatus, setDiscountApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [approvedByVadmin, setApprovedByVadmin] = useState<string | null>(null);
  const [maxDiscountAllowed, setMaxDiscountAllowed] = useState<number | null>(null);
  
  // Track previous destination to detect actual changes (vs initial load)
  const prevDestinationRef = useRef<string | null>(null);
  const prevClientRef = useRef<Client | undefined>(client);
  
  // Track which client we've loaded children for (to avoid reloading on every render)
  const loadedClientIdRef = useRef<string | null>(null);
  
  // Track which client we've already reset the form for (to avoid resetting on query refetch)
  const formResetClientIdRef = useRef<string | null>(null);
  
  // Referral autocomplete state
  const [referralSearchTerm, setReferralSearchTerm] = useState('');
  const [referralOpen, setReferralOpen] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<Client | null>(null);
  
  // Credit selector state
  const [creditSelectorOpen, setCreditSelectorOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CancelledClientCredit | null>(null);
  
  // CEP lookup state
  const [cepLoading, setCepLoading] = useState(false);
  
  // Down payment splits state
  const [downPaymentSplits, setDownPaymentSplits] = useState<Array<{ method: string; amount: number }>>([]);
  
  // Fetch active destinations for new clients
  const { data: activeDestinations = [], isLoading: activeDestinationsLoading } = useQuery<Destination[]>({
    queryKey: ['/api/destinations/active'],
    staleTime: 0, // Always fetch fresh data to show latest prices
  });
  
  // Fetch all destinations (including archived) - always fetch to ensure client destinations appear
  const { data: allDestinations = [], isLoading: allDestinationsLoading } = useQuery<Destination[]>({
    queryKey: ['/api/destinations'],
    staleTime: 0,
  });
  
  // When editing: use all destinations to show archived ones
  // When creating: use active destinations only
  // Also include client's destination even if not found in list
  const baseDestinations = client ? allDestinations : activeDestinations;
  const destinationsLoading = client ? allDestinationsLoading : activeDestinationsLoading;
  
  // Ensure client's destination is always in the list (even if missing from database)
  const destinations = useMemo(() => {
    if (!client?.destination || baseDestinations.length === 0) return baseDestinations;
    
    const clientDestExists = baseDestinations.some(d => d.name === client.destination);
    if (clientDestExists) return baseDestinations;
    
    // Add a placeholder for the client's destination if not found
    const placeholderDest = {
      id: `placeholder_${client.destination}`,
      name: client.destination,
      country: '(Destino não encontrado)',
      price: 0,
      is_active: false,
      has_levels: false,
      is_black_friday: false,
      created_at: new Date(),
      updated_at: new Date(),
    } as Destination;
    return [...baseDestinations, placeholderDest];
  }, [baseDestinations, client?.destination]);

  // Fetch destination capacities to check for sold-out destinations
  type CapacityData = { availableSeats: number; isSoldOut: boolean; totalPassengers: number; totalSeats: number };
  const { data: capacities } = useQuery<Record<string, CapacityData>>({
    queryKey: ['/api/destinations/capacities'],
  });

  // Fetch available credits for "Crédito de Viagens Anteriores" payment method
  const { data: availableCredits = [], isLoading: creditsLoading } = useQuery<CancelledClientCredit[]>({
    queryKey: ['/api/cancelled-client-credits/active'],
  });

  // Check if selected destination is sold out
  const getDestinationCapacity = (destinationName: string) => {
    if (!capacities || !destinations) return null;
    const destination = destinations.find(d => d.name === destinationName);
    if (!destination) return null;
    return capacities[destination.id] || null;
  };

  // Search for potential referrer clients
  const { data: searchedClients = [], isError: searchError } = useQuery<Client[]>({
    queryKey: ['/api/clients/search', referralSearchTerm],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/clients/search/${encodeURIComponent(referralSearchTerm)}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: referralSearchTerm.length >= 2,
  });

  // Initialize form first (before any useEffects that depend on it)
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
      birthdate: undefined,
      cpf: '',
      rg: '',
      civil_status: undefined,
      spouse_name: '',
      nationality: '',
      gender: undefined,
      phone: '',
      email: '',
      profession: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      client_preferences: '',
      referred_by: undefined,
      destination: '',
      quantity: 1,
      duration: 1,
      departure_location: '',
      return_location: '',
      inclusions: '',
      travel_price: undefined,
      travel_level: undefined,
      down_payment: undefined,
      down_payment_method: undefined,
      first_payment_discount_type: 'none',
      first_payment_discount_value: undefined,
      first_payment_discount_currency: 'percentage',
      installments_count: undefined,
      installment_due_date: undefined,
      first_installment_due_date: undefined,
      payment_method: undefined,
      avista_payment_type: undefined,
      contract_type: 'normal',
      client_type: 'agencia',
      operator_name: undefined,
      children: [],
    },
  });

  // Persistence for children when editing
  useEffect(() => {
    if (client && children.length > 0) {
      localStorage.setItem(`companion_data_${client.id}`, JSON.stringify(children));
    }
  }, [children, client]);

  // Helper to parse date string to UTC Date (avoids timezone shift)
  const parseToUTCDate = (dateValue: string | Date | undefined): Date | undefined => {
    if (!dateValue) return undefined;
    if (dateValue instanceof Date) {
      // Already a Date, recreate as UTC to ensure consistency
      return new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate()));
    }
    // Parse string - handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    const dateStr = String(dateValue).split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(Date.UTC(year, month, day));
      }
    }
    return undefined;
  };

  useEffect(() => {
    if (client) {
      const saved = localStorage.getItem(`companion_data_${client.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map(c => ({
              ...c,
              birthdate: parseToUTCDate(c.birthdate)
            }));
            setChildren(mapped);
            form.setValue('children', mapped);
            
            // Auto-clear after 5 minutes if not submitted
            const timer = setTimeout(() => {
              localStorage.removeItem(`companion_data_${client.id}`);
            }, 5 * 60 * 1000);
            
            return () => clearTimeout(timer);
          }
        } catch (e) {
          console.error("Failed to parse saved companion data", e);
        }
      }
    }
  }, [client, form]);

  // Load client type and operator from sessionStorage
  useEffect(() => {
    if (!client) {
      const clientType = sessionStorage.getItem('clientType') as 'agencia' | 'operadora' | null;
      const operatorName = sessionStorage.getItem('operatorName') as 'azul_viagens' | 'cvc' | 'rex_tour' | null;
      
      if (clientType) {
        form.setValue('client_type', clientType);
        sessionStorage.removeItem('clientType');
      }
      
      if (operatorName) {
        form.setValue('operator_name', operatorName);
        sessionStorage.removeItem('operatorName');
      }
    }
  }, [client, form]);

  // Load children and phone numbers when editing a client
  useEffect(() => {
    // Only run this when the client object itself changes (not every render)
    if (client && client.id !== loadedClientIdRef.current) {
      console.log('📦 ClientForm useEffect - Initial loading children/phone for client:', client.id);
      loadedClientIdRef.current = client.id;
      
      if ('children' in client && Array.isArray((client as any).children)) {
        const clientChildren = (client as any).children;
        const mappedChildren = clientChildren.map((child: Child) => ({
          name: child.name,
          birthdate: parseToUTCDate(child.birthdate),
          phone: child.phone,
          rg: child.rg,
          cpf: child.cpf,
          passport_number: child.passport_number,
          relationship: child.relationship as any,
          price: child.price,
        }));
        console.log(`📦 Setting ${mappedChildren.length} children from client data`);
        setChildren(mappedChildren);
        form.setValue('children', mappedChildren);
      }
      
      // Load phone numbers
      const clientPhoneNumbers = (client as any).phone_numbers;
      if (clientPhoneNumbers && Array.isArray(clientPhoneNumbers) && clientPhoneNumbers.length > 0) {
        setPhoneNumbers(clientPhoneNumbers);
        if (clientPhoneNumbers[0]?.number) {
          form.setValue('phone', clientPhoneNumbers[0].number, { shouldValidate: true });
        }
      } else if (client.phone) {
        setPhoneNumbers([{ label: 'Principal', number: client.phone }]);
        form.setValue('phone', client.phone, { shouldValidate: true });
      }
    }
  }, [client, form]);

  // Reset form when client data is FIRST loaded (not on every query refetch)
  useEffect(() => {
    // Only reset the form once per client to prevent losing user edits on query refetch
    if (client && client.id !== formResetClientIdRef.current) {
      console.log('📦 ClientForm: Resetting form with client data:', client.id);
      formResetClientIdRef.current = client.id;
      
      // Ensure date fields are Date objects using UTC to avoid timezone shift
      const birthdate = parseToUTCDate(client.birthdate);

      const referredBy = (client as any).referred_by || undefined;

      form.reset({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        birthdate: birthdate,
        cpf: client.cpf || '',
        rg: client.rg || '',
        civil_status: client.civil_status,
        spouse_name: (client as any).spouse_name || '',
        nationality: client.nationality || '',
        gender: client.gender,
        phone: client.phone || '',
        email: client.email || '',
        profession: client.profession || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        postal_code: client.postal_code || '',
        client_preferences: (client as any).client_preferences || '',
        referred_by: referredBy,
        destination: client.destination || '',
        quantity: client.quantity || 1,
        duration: client.duration || 1,
        departure_location: client.departure_location || '',
        return_location: client.return_location || '',
        inclusions: client.inclusions || '',
        travel_price: client.travel_price || undefined,
        travel_level: (client as any).travel_level || undefined,
        down_payment: client.down_payment || undefined,
        down_payment_method: client.down_payment_method,
        first_payment_discount_type: (client as any).first_payment_discount_type || 'none',
        first_payment_discount_value: (client as any).first_payment_discount_value || undefined,
        first_payment_discount_currency: (client as any).first_payment_discount_currency || 'percentage',
        installments_count: client.installments_count || undefined,
        installment_due_date: client.installment_due_date || '',
        first_installment_due_date: client.first_installment_due_date || '',
        payment_method: client.payment_method,
        avista_payment_type: (client as any).avista_payment_type,
        contract_type: client.contract_type || 'normal',
        client_type: (client as any).client_type || 'agencia',
        operator_name: (client as any).operator_name,
        children: [],
      });
      
      // Force destination value if it's not set after reset
      if (client.destination) {
        form.setValue('destination', client.destination);
      }

      // If there's a referredBy value but no selectedReferrer yet, the query will handle it
      // But we need to ensure the form field is set
      if (!referredBy) {
        setSelectedReferrer(null);
      }
    }
  }, [client, form]);
  
  // Re-set destination after destinations finish loading (fixes timing issue)
  useEffect(() => {
    if (client?.destination && destinations.length > 0 && !destinationsLoading) {
      const currentValue = form.getValues('destination');
      if (!currentValue || currentValue !== client.destination) {
        form.setValue('destination', client.destination, { shouldValidate: false });
      }
    }
  }, [client, destinations, destinationsLoading, form]);

  // Watch payment method to conditionally show installment fields
  const paymentMethod = form.watch("payment_method");
  // Show installment fields when:
  // 1. Payment method is not "avista" (cash/immediate payment), OR
  // 2. Editing an existing client that has payment data saved (down_payment, installments, etc.)
  const hasExistingPaymentData = client && (
    client.down_payment !== undefined && client.down_payment !== null ||
    client.down_payment_method !== undefined && client.down_payment_method !== null ||
    client.installments_count !== undefined && client.installments_count !== null ||
    client.installment_due_date !== undefined && client.installment_due_date !== null && client.installment_due_date !== '' ||
    client.first_installment_due_date !== undefined && client.first_installment_due_date !== null && client.first_installment_due_date !== ''
  );
  const showInstallmentFields = paymentMethod !== "avista" || hasExistingPaymentData;
  
  // Watch civil_status to conditionally show spouse_name field
  const civilStatus = form.watch("civil_status");
  
  // Watch down_payment_method to clear credit selection when switching away from "credito_viagens_anteriores"
  const downPaymentMethod = form.watch("down_payment_method");
  useEffect(() => {
    if (downPaymentMethod !== "credito_viagens_anteriores") {
      // Clear credit selection when switching to a different payment method
      if (selectedCredit) {
        setSelectedCredit(null);
        form.setValue("used_credit_id" as any, undefined);
      }
    }
  }, [downPaymentMethod, selectedCredit, form]);
  
  // Initialize selectedCredit from client.used_credit_id when editing and credits are loaded
  useEffect(() => {
    if (client && (client as any).used_credit_id && availableCredits.length > 0 && !selectedCredit) {
      const creditFromClient = availableCredits.find(c => c.id === (client as any).used_credit_id);
      if (creditFromClient) {
        setSelectedCredit(creditFromClient);
      }
    }
  }, [client, availableCredits, selectedCredit]);
  
  // Watch discount type to show custom discount field
  const discountType = form.watch("first_payment_discount_type");
  const discountCurrency = form.watch("first_payment_discount_currency");
  
  // Watch client_type to conditionally show destination dropdown or text input
  const clientType = form.watch("client_type");
  const operatorName = form.watch("operator_name");

  // Watch fields for installment calculation
  const travelPrice = form.watch("travel_price");
  const downPayment = form.watch("down_payment");
  const installmentsCount = form.watch("installments_count");
  const firstPaymentDiscountType = form.watch("first_payment_discount_type");
  const firstPaymentDiscountValue = form.watch("first_payment_discount_value");
  
  // Watch destination selection to auto-populate price
  const selectedDestinationName = form.watch("destination");
  const selectedTravelLevel = form.watch("travel_level");
  
  // Get selected destination object for level checking
  const selectedDestination = selectedDestinationName && destinations.length > 0 
    ? destinations.find(d => d.name === selectedDestinationName) 
    : null;
  
  // Auto-populate travel_price and duration when destination is selected or changed
  useEffect(() => {
    if (selectedDestinationName && destinations.length > 0) {
      const destination = destinations.find(d => d.name === selectedDestinationName);
      if (destination) {
        console.log('📦 Destination found:', destination.name, 'Client type:', clientType);
        // Check if destination actually changed (not initial load)
        const destinationChanged = prevDestinationRef.current !== null && 
                                   prevDestinationRef.current !== selectedDestinationName;
        const clientChanged = prevClientRef.current !== client;
        const isNewTrip = client && !client.destination; // Existing client but starting a "Nova Viagem"
        const isNewClient = !client;
        
        // Update refs for next comparison
        const isInitialLoad = prevDestinationRef.current === null;
        prevDestinationRef.current = selectedDestinationName;
        prevClientRef.current = client;

        // Diagnostic logs
        if (isInitialLoad) {
          console.log('📦 Initial load of destination field. Value:', selectedDestinationName);
        }
        
        // Only run auto-population logic for new clients, new trips for existing clients, OR when destination actually changed
        // BUT: Always ensure duration is set on initial load if it's missing
        const shouldPopulate = isNewClient || isNewTrip || destinationChanged;
        const missingDuration = isInitialLoad && !form.getValues("duration");

        if (shouldPopulate || missingDuration) {
          // Always clear travel_level when switching destinations to avoid stale values
          form.setValue("travel_level", undefined);
          
          // If destination has levels, don't auto-set price (user must select level first)
          if (destination.has_levels) {
            form.setValue("travel_price", undefined);
          } else {
            // Auto-populate price - prefer Black Friday price if available and valid
            let priceToUse = destination.price;
            
            if (destination.is_black_friday && destination.black_friday_price) {
              const now = new Date();
              const blackFridayStart = destination.black_friday_start ? new Date(destination.black_friday_start) : null;
              const blackFridayEnd = destination.black_friday_end ? new Date(destination.black_friday_end) : null;
              
              // Use Black Friday price if current date is within the Black Friday period (or no dates are set)
              const isWithinBlackFridayPeriod = (!blackFridayStart || now >= blackFridayStart) && (!blackFridayEnd || now <= blackFridayEnd);
              if (isWithinBlackFridayPeriod) {
                priceToUse = destination.black_friday_price;
              }
            }
            
            if (priceToUse) {
              form.setValue("travel_price", priceToUse);
            }
          }
          
          // Auto-populate duration from destination dates
          if (destination.periodo_viagem_inicio && destination.periodo_viagem_fim) {
            const start = new Date(destination.periodo_viagem_inicio);
            const end = new Date(destination.periodo_viagem_fim);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            form.setValue("duration", diffDays);
          }
        }
      }
    }
  }, [selectedDestinationName, destinations, form, client]);

  // Auto-set travel_price when travel_level is selected for destinations with levels
  // Works for both new clients and when editing existing clients
  useEffect(() => {
    if (selectedTravelLevel && selectedDestination?.has_levels) {
      let priceToUse: number | undefined;
      
      switch (selectedTravelLevel) {
        case 'ouro':
          priceToUse = selectedDestination.ouro_price;
          break;
        case 'prata':
          priceToUse = selectedDestination.prata_price;
          break;
        case 'bronze':
          priceToUse = selectedDestination.bronze_price;
          break;
      }
      
      if (priceToUse !== undefined) {
        form.setValue("travel_price", priceToUse);
      }
    }
  }, [selectedTravelLevel, selectedDestination, form]);

  // Load approval info from client when editing
  useEffect(() => {
    if (client && (client as any).discount_approved_by_vadmin_name) {
      setDiscountApprovalStatus('approved');
      setApprovedByVadmin((client as any).discount_approved_by_vadmin_name);
    }
  }, [client]);

  // Load referrer info when editing client with referred_by
  const { data: referrerClient } = useQuery<Client>({
    queryKey: ['/api/clients', (client as any)?.referred_by],
    enabled: !!client && !!(client as any)?.referred_by,
  });

  useEffect(() => {
    if (referrerClient) {
      setSelectedReferrer(referrerClient);
      form.setValue('referred_by', referrerClient.id);
    }
  }, [referrerClient, form]);

  // Function to fetch address from CEP using ViaCEP API
  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return;
    }

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive",
        });
        setCepLoading(false);
        return;
      }

      // Auto-fill the fields
      form.setValue('address', `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`);
      form.setValue('city', data.localidade);
      form.setValue('state', data.uf);
      form.setValue('postal_code', cleanCep);

      toast({
        title: "Sucesso!",
        description: "Endereço preenchido automaticamente.",
      });
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o endereço. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
    }
  }, [form, toast]);

  // Listen for WebSocket approval decisions
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'discount_approval_decision' && message.data) {
        const approval = message.data;
        if (approval.status === 'approved') {
          setDiscountApprovalStatus('approved');
          setApprovedByVadmin(approval.approved_by_vadmin_name);
          setMaxDiscountAllowed(approval.max_discount_percentage_allowed);
          toast({
            title: "Desconto Aprovado",
            description: `Desconto personalizado aprovado por ${approval.approved_by_vadmin_name}`,
          });
        } else if (approval.status === 'rejected') {
          setDiscountApprovalStatus('rejected');
          toast({
            title: "Desconto Rejeitado",
            description: approval.rejection_reason || "Desconto personalizado rejeitado",
            variant: "destructive",
          });
          form.setValue("first_payment_discount_type", "none");
        }
      }
    });

    return unsubscribe;
  }, [subscribe, toast, form]);

  // Calculate total price including children
  const calculateTotalPrice = () => {
    const basePrice = travelPrice || 0;
    const childrenTotal = children.reduce((sum, child) => sum + (child.price || 0), 0);
    return basePrice + childrenTotal;
  };

  // Calculate final price with discount (for À vista payments)
  const calculateFinalPriceWithDiscount = () => {
    const totalPrice = calculateTotalPrice();
    
    // Get discount value and type
    let discountAmount = 0;
    if (firstPaymentDiscountType === '3') {
      discountAmount = totalPrice * (3 / 100);
    } else if (firstPaymentDiscountType === '5') {
      discountAmount = totalPrice * (5 / 100);
    } else if (firstPaymentDiscountType === 'custom' && firstPaymentDiscountValue) {
      if (discountCurrency === 'fixed') {
        discountAmount = firstPaymentDiscountValue; // Fixed amount
      } else {
        discountAmount = totalPrice * (firstPaymentDiscountValue / 100); // Percentage
      }
    }
    
    return totalPrice - discountAmount;
  };

  // Calculate installment amount
  const calculateInstallmentAmount = () => {
    const totalPrice = calculateTotalPrice();
    if (!totalPrice || !installmentsCount || installmentsCount <= 0) {
      return 'A definir';
    }
    
    // Step 1: Calculate discount amount based on TOTAL price
    let discountAmount = 0;
    if (firstPaymentDiscountType === '3') {
      discountAmount = totalPrice * (3 / 100);
    } else if (firstPaymentDiscountType === '5') {
      discountAmount = totalPrice * (5 / 100);
    } else if (firstPaymentDiscountType === 'custom' && firstPaymentDiscountValue) {
      if (discountCurrency === 'fixed') {
        discountAmount = firstPaymentDiscountValue; // Fixed amount
      } else {
        discountAmount = totalPrice * (firstPaymentDiscountValue / 100); // Percentage
      }
    }
    
    // Step 2: Apply discount to total FIRST
    const discountedTotal = totalPrice - discountAmount;
    
    // Step 3: Then subtract down payment from discounted total
    const remainingAmount = Math.max(0, discountedTotal - (downPayment || 0));
    
    // Step 4: Divide by installments
    if (installmentsCount === 1) {
      // Only one installment - remaining amount after discount and down payment
      return `R$ ${remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
      // Multiple installments - all equal since discount is already applied
      const regularInstallment = remainingAmount / installmentsCount;
      
      return `R$ ${regularInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
  };

  // Save all form data including installment fields regardless of payment method
  const handleFormSubmit = async (data: FormData) => {
    console.log('🔵 Form submit handler called!');
    console.log('🔵 Form errors:', form.formState.errors);
    
    // Use the first phone number as the primary phone for backward compatibility
    const primaryPhone = phoneNumbers[0]?.number || '';
    
    // Debug: Log the form data to see what's being captured
    console.log('Form submission data:', {
      profession: data.profession,
      departure_location: data.departure_location,
      return_location: data.return_location,
      first_installment_due_date: data.first_installment_due_date,
      installment_due_date: data.installment_due_date,
      birthdate: data.birthdate,
      phone_numbers: phoneNumbers
    });
    
    // Handle brinde (gift) payment method
    const isBrinde = data.payment_method === 'brinde';
    const brindeValue = isBrinde ? (data.travel_price || 0) : undefined;
    
    try {
      await onSubmit({ 
        ...data, 
        phone: primaryPhone,
        phone_numbers: phoneNumbers as any,
        down_payment_splits: downPaymentSplits as any,
        is_brinde: isBrinde,
        brinde_value: brindeValue,
        children 
      } as any);

      // Clear persistence on successful submission
      if (client) {
        localStorage.removeItem(`companion_data_${client.id}`);
      }
    } catch (error) {
      console.error("Submission failed", error);
    }
  };
  
  // Add click handler to show validation errors to user
  const handleSaveClick = async () => {
    console.log('🔴 Save button clicked!');
    console.log('🔴 Form is valid:', form.formState.isValid);
    console.log('🔴 Form errors:', form.formState.errors);
    console.log('🔴 Form values:', form.getValues());
    
    // Trigger validation and get errors
    const isValid = await form.trigger();
    if (!isValid) {
      const errors = form.formState.errors;
      const errorMessages: string[] = [];
      
      // Collect all field errors
      Object.entries(errors).forEach(([field, error]) => {
        if (error && typeof error === 'object') {
          if ('message' in error && error.message) {
            const fieldNames: Record<string, string> = {
              first_name: 'Nome',
              last_name: 'Sobrenome',
              cpf: 'CPF',
              phone: 'Telefone',
              email: 'E-mail',
              destination: 'Destino',
              travel_price: 'Preço da Viagem',
              payment_method: 'Método de Pagamento',
              birthdate: 'Data de Nascimento',
              operator_name: 'Operadora',
            };
            const fieldLabel = fieldNames[field] || field;
            errorMessages.push(`${fieldLabel}: ${error.message}`);
          }
        }
      });
      
      // Check for root-level errors (from refine)
      if (errors.root?.message) {
        errorMessages.push(errors.root.message as string);
      }
      
      if (errorMessages.length > 0) {
        toast({
          title: "Por favor, corrija os erros no formulário",
          description: errorMessages.join('\n'),
          variant: "destructive",
        });
      } else {
        // If no specific errors found, show generic message
        toast({
          title: "Formulário incompleto",
          description: "Por favor, preencha todos os campos obrigatórios corretamente.",
          variant: "destructive",
        });
      }
    }
  };

  const addChild = () => {
    const currentPrice = form.getValues("travel_price") || 0;
    const newChildren = [...children, {
      name: '',
      birthdate: new Date(),
      phone: '',
      rg: '',
      cpf: '',
      passport_number: '',
      relationship: 'filho' as const,
      price: currentPrice,
    }];
    setChildren(newChildren);
    form.setValue('children', newChildren);
  };

  const removeChild = (index: number) => {
    const newChildren = children.filter((_, i) => i !== index);
    setChildren(newChildren);
    form.setValue('children', newChildren);
  };

  const updateChild = (index: number, field: keyof Omit<Child, 'id' | 'client_id'>, value: any) => {
    const updated = children.map((child, i) => 
      i === index ? { ...child, [field]: value } : child
    );
    setChildren(updated);
    form.setValue('children', updated);
  };

  // Phone number management
  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, { label: `Telefone ${phoneNumbers.length + 1}`, number: '' }]);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index: number, field: 'label' | 'number', value: string) => {
    const updated = phoneNumbers.map((phone, i) => 
      i === index ? { ...phone, [field]: value } : phone
    );
    setPhoneNumbers(updated);
    
    // Sync the first phone number to the legacy phone field for validation
    if (index === 0 && field === 'number') {
      form.setValue('phone', value, { shouldValidate: true });
    }
  };

  // Format phone number to Brazilian format: +55 (XX) XXXXX-XXXX or +55 (XX) XXXX-XXXX
  const formatBrazilianPhone = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    
    // Apply Brazilian phone format
    if (numbers.length <= 2) {
      return `+${numbers}`;
    } else if (numbers.length <= 4) {
      return `+${numbers.slice(0, 2)} (${numbers.slice(2)})`;
    } else if (numbers.length <= 9) {
      return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    } else {
      // Mobile: +55 (XX) XXXXX-XXXX or Landline: +55 (XX) XXXX-XXXX
      const areaCode = numbers.slice(2, 4);
      const firstPart = numbers.slice(4, numbers.length === 13 ? 9 : 8);
      const secondPart = numbers.slice(numbers.length === 13 ? 9 : 8, numbers.length === 13 ? 13 : 12);
      return `+${numbers.slice(0, 2)} (${areaCode}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
    }
  };


  const handleGenerateContract = async () => {
    const formData = form.getValues();
    if (!formData.first_name || !formData.last_name) {
      toast({
        title: "Dados incompletos",
        description: "Preencha pelo menos o nome do cliente para gerar o contrato.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a mock client object for contract generation
      const clientForContract: ClientWithChildren = {
        id: 'new-client',
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name_search: `${formData.first_name} ${formData.last_name}`.toLowerCase(),
        email: formData.email,
        phone: phoneNumbers[0]?.number || formData.phone,
        phone_numbers: phoneNumbers as any,
        cpf: formData.cpf,
        destination: formData.destination,
        travel_date: undefined,
        birthdate: formData.birthdate,
        rg: formData.rg || '',
        civil_status: formData.civil_status,
        nationality: formData.nationality,
        gender: formData.gender,
        profession: formData.profession,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        client_preferences: (formData as any).client_preferences,
        spouse_name: (formData as any).spouse_name,
        quantity: formData.quantity,
        duration: formData.duration,
        departure_location: formData.departure_location,
        return_location: formData.return_location,
        travel_itinerary: '',
        inclusions: formData.inclusions,
        travel_price: formData.travel_price,
        down_payment: formData.down_payment,
        down_payment_method: formData.down_payment_method,
        installments_count: formData.installments_count,
        installment_due_date: formData.installment_due_date,
        first_installment_due_date: formData.first_installment_due_date,
        payment_method: formData.payment_method,
        contract_type: formData.contract_type,
        client_type: formData.client_type || 'agencia',
        operator_name: formData.operator_name,
        approval_status: 'pending',
        is_cancelled: false,
        is_brinde: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        children: children.map((child, index) => ({
          ...child,
          id: `temp-child-${index}`,
          client_id: 'new-client'
        }))
      };

      await generateTravelContract(clientForContract, user?.email || undefined);
      
      toast({
        title: "Contrato gerado com sucesso!",
        description: "O arquivo PDF do contrato foi baixado automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar contrato",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const brazilianStates = [
    { value: "AC", label: "Acre" },
    { value: "AL", label: "Alagoas" },
    { value: "AP", label: "Amapá" },
    { value: "AM", label: "Amazonas" },
    { value: "BA", label: "Bahia" },
    { value: "CE", label: "Ceará" },
    { value: "DF", label: "Distrito Federal" },
    { value: "ES", label: "Espírito Santo" },
    { value: "GO", label: "Goiás" },
    { value: "MA", label: "Maranhão" },
    { value: "MT", label: "Mato Grosso" },
    { value: "MS", label: "Mato Grosso do Sul" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PA", label: "Pará" },
    { value: "PB", label: "Paraíba" },
    { value: "PR", label: "Paraná" },
    { value: "PE", label: "Pernambuco" },
    { value: "PI", label: "Piauí" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "RN", label: "Rio Grande do Norte" },
    { value: "RS", label: "Rio Grande do Sul" },
    { value: "RO", label: "Rondônia" },
    { value: "RR", label: "Roraima" },
    { value: "SC", label: "Santa Catarina" },
    { value: "SP", label: "São Paulo" },
    { value: "SE", label: "Sergipe" },
    { value: "TO", label: "Tocantins" },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <p className="text-muted-foreground">
            {client ? 'Edite as informações do cliente' : 'Cadastre um novo cliente no sistema'}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-1">
          {/* Referral Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Indicação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="referred_by"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Alguém indicou este cliente?</FormLabel>
                    <Popover open={referralOpen} onOpenChange={setReferralOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={referralOpen}
                            className={cn(
                              "w-full justify-between",
                              !selectedReferrer && "text-muted-foreground"
                            )}
                            data-testid="button-select-referrer"
                          >
                            {selectedReferrer
                              ? `${selectedReferrer.first_name} ${selectedReferrer.last_name}`
                              : "Selecione um cliente..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar cliente..."
                            value={referralSearchTerm}
                            onValueChange={setReferralSearchTerm}
                          />
                          <CommandEmpty>
                            {referralSearchTerm.length < 2
                              ? "Digite pelo menos 2 caracteres para buscar..."
                              : "Nenhum cliente encontrado."}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchedClients
                              .filter(client => client && client.id && client.first_name && client.last_name)
                              .map((searchClient) => (
                              <CommandItem
                                key={searchClient.id}
                                value={`${searchClient.first_name ?? ''} ${searchClient.last_name ?? ''}`}
                                onSelect={() => {
                                  setSelectedReferrer(searchClient);
                                  field.onChange(searchClient.id);
                                  setReferralOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedReferrer?.id === searchClient.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {searchClient.first_name} {searchClient.last_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedReferrer && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">
                          Cliente selecionado: <strong>{selectedReferrer.first_name} {selectedReferrer.last_name}</strong>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReferrer(null);
                            field.onChange(undefined);
                          }}
                          data-testid="button-clear-referrer"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Personal Information & Contact - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">👤</span>
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Nome" 
                          data-testid="input-first-name"
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
                      <FormLabel>Sobrenome *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Sobrenome" 
                          data-testid="input-last-name"
                          onChange={(e) => field.onChange(toTitleCase(e.target.value))}
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
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD/MM/AAAA"
                          value={field.value instanceof Date 
                            ? `${String(field.value.getUTCDate()).padStart(2, '0')}/${String(field.value.getUTCMonth() + 1).padStart(2, '0')}/${field.value.getUTCFullYear()}`
                            : (typeof field.value === 'string' ? field.value : '')}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 8) val = val.slice(0, 8);
                            
                            // Format as DD/MM/YYYY
                            let formatted = val;
                            if (val.length > 2) formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                            if (val.length > 4) formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                            
                            // Update display value immediately
                            field.onChange(formatted);

                            // If we have a full date, update the actual date object using UTC
                            if (val.length === 8) {
                              const day = parseInt(val.slice(0, 2));
                              const month = parseInt(val.slice(2, 4));
                              const year = parseInt(val.slice(4, 8));
                              
                              // Validate date components
                              if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                                const date = new Date(Date.UTC(year, month - 1, day));
                                if (!isNaN(date.getTime())) {
                                  field.onChange(date);
                                }
                              }
                            }
                          }}
                          data-testid="input-birthdate"
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
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value || ""}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={14}
                          placeholder="000.000.000-00"
                          data-testid="input-cpf"
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
                      <FormLabel>RG</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00.000.000-0" data-testid="input-rg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="civil_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-civil-status">
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
                        <FormLabel>Casado(a) com</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Nome do cônjuge" 
                            data-testid="input-spouse-name"
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
                      <FormLabel>Nacionalidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brasileiro" data-testid="input-nationality" />
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
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
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
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Médico, Engenheiro, etc." data-testid="input-profession" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            </Card>

            {/* Contact & Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">📞</span>
                  Contato & Localização
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Phone Numbers Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Telefones</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneNumber}
                      data-testid="button-add-phone"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Telefone
                    </Button>
                  </div>
                  
                  {phoneNumbers.map((phone, index) => (
                    <div key={index} className="space-y-1">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                        <div className="md:col-span-3">
                          <Label className="text-sm">Nome/Etiqueta</Label>
                          <Input
                            value={phone.label}
                            onChange={(e) => updatePhoneNumber(index, 'label', e.target.value)}
                            placeholder="Ex: Principal, Trabalho"
                            data-testid={`input-phone-label-${index}`}
                          />
                        </div>
                        <div className="md:col-span-8">
                          <Label className="text-sm">Número {index === 0 && <span className="text-destructive">*</span>}</Label>
                          <Input
                            value={phone.number}
                            onChange={(e) => {
                              const formatted = formatBrazilianPhone(e.target.value);
                              updatePhoneNumber(index, 'number', formatted);
                            }}
                            placeholder="+55 (11) 99999-9999"
                            data-testid={`input-phone-number-${index}`}
                            className={index === 0 && form.formState.errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          {phoneNumbers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePhoneNumber(index)}
                              data-testid={`button-remove-phone-${index}`}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {index === 0 && form.formState.errors.phone && (
                        <p className="text-sm font-medium text-destructive ml-0 md:ml-[calc(25%+0.5rem)]">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Endereço completo" data-testid="input-address" />
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
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cidade" data-testid="input-city" />
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
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
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
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        CEP
                        {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00000-000" 
                          data-testid="input-postal-code"
                          disabled={cepLoading}
                          onBlur={(e) => {
                            field.onBlur();
                            handleCepChange(e.target.value);
                          }}
                          onChange={(e) => {
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Digite e deixe em branco para buscar automaticamente</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_preferences"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Preferências & Observações do Cliente</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Ex: Não gosta de assentos do meio, é alérgico a frutos do mar, prefere lugares perto da janela, necessidades especiais, etc." 
                          rows={4}
                          data-testid="textarea-client-preferences" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Travel Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plane className="mr-2 h-5 w-5" />
                Detalhes da Viagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Destino {clientType === 'agencia' && '*'}
                        {clientType === 'operadora' && operatorName && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({operatorName === 'azul_viagens' ? 'Azul Viagens' : operatorName === 'cvc' ? 'CVC' : 'Rex Tour'})
                          </span>
                        )}
                      </FormLabel>
                      {clientType === 'agencia' ? (
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={destinationsLoading}>
                          <FormControl>
                            <SelectTrigger data-testid="select-destination">
                              <SelectValue placeholder={destinationsLoading ? "Carregando destinos..." : "Selecione um destino"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {destinations.length === 0 && !destinationsLoading && (
                              <SelectItem value="no-destinations" disabled>
                                Nenhum destino disponível
                              </SelectItem>
                            )}
                            {destinations.map((destination) => {
                              const capacity = capacities?.[destination.id];
                              const soldOut = capacity?.isSoldOut;
                              const isArchived = destination.periodo_viagem_fim 
                                ? new Date(destination.periodo_viagem_fim) < new Date() 
                                : false;
                              return (
                                <SelectItem 
                                  key={destination.id} 
                                  value={destination.name}
                                  data-testid={`option-destination-${destination.id}`}
                                  className={cn(
                                    soldOut && "text-red-500",
                                    isArchived && "text-muted-foreground"
                                  )}
                                >
                                  {destination.name}, {destination.country}
                                  {soldOut && " (ESGOTADO)"}
                                  {isArchived && !soldOut && " (Arquivado)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Digite o destino manualmente" 
                            data-testid="input-destination-manual" 
                          />
                        </FormControl>
                      )}
                      {field.value && clientType === 'agencia' && getDestinationCapacity(field.value)?.isSoldOut && (
                        <Alert variant="destructive" className="mt-2" data-testid="alert-destination-sold-out">
                          <AlertDescription className="text-sm">
                            <strong>Atenção:</strong> Este destino está esgotado. Não há mais lugares disponíveis.
                            Você ainda pode cadastrar o cliente, mas ele ficará em lista de espera.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (dias) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          placeholder="7"
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departure_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Embarque</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Aeroporto de Guarulhos"
                          data-testid="input-departure-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="return_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Retorno</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Aeroporto de Guarulhos"
                          data-testid="input-return-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Level Selection - Only show when destination has levels */}
                {selectedDestination?.has_levels && (
                  <FormField
                    control={form.control}
                    name="travel_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          Nível de Preço
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-travel-level" className="border-amber-300 dark:border-amber-600">
                              <SelectValue placeholder="Selecione o nível" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedDestination.ouro_price !== undefined && selectedDestination.ouro_price !== null && (
                              <SelectItem value="ouro">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-amber-500" />
                                  <span className="font-medium text-amber-600">Ouro</span>
                                  <span className="text-muted-foreground">
                                    - R$ {selectedDestination.ouro_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </SelectItem>
                            )}
                            {selectedDestination.prata_price !== undefined && selectedDestination.prata_price !== null && (
                              <SelectItem value="prata">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-500">Prata</span>
                                  <span className="text-muted-foreground">
                                    - R$ {selectedDestination.prata_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </SelectItem>
                            )}
                            {selectedDestination.bronze_price !== undefined && selectedDestination.bronze_price !== null && (
                              <SelectItem value="bronze">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-orange-600" />
                                  <span className="font-medium text-orange-700">Bronze</span>
                                  <span className="text-muted-foreground">
                                    - R$ {selectedDestination.bronze_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="travel_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço da Viagem (R$)</FormLabel>
                      <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  placeholder=""
                                  data-testid="input-travel-price"
                                />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {children.length > 0 && (
                  <div className="col-span-full">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Preço Base (Cliente):</span>
                        <span className="text-sm" data-testid="text-base-price">
                          R$ {(travelPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Companhia ({children.length}):</span>
                        <span className="text-sm" data-testid="text-children-total">
                          R$ {children.reduce((sum, child) => sum + (child.price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-base font-bold">Preço Total:</span>
                        <span className="text-base font-bold text-primary" data-testid="text-total-price">
                          R$ {calculateTotalPrice().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="avista">À Vista</SelectItem>
                          <SelectItem value="crediario_agencia">Crediário da Agência</SelectItem>
                          <SelectItem value="credito_banco">Crédito do Banco</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="credito_viagens_interiores">Crédito de Viagens Interiores</SelectItem>
                          <SelectItem value="brinde">Brinde (Viagem Grátis)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Info message when Brinde is selected */}
                {paymentMethod === 'brinde' && (
                  <div className="col-span-full">
                    <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800" data-testid="alert-brinde-info">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800 dark:text-purple-200">
                        <strong>Viagem Brinde:</strong> O valor do cliente (R$ {(travelPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) será registrado como saída no Caixa. 
                        {children.length > 0 && (
                          <span> Os acompanhantes ({children.length}) continuam pagando normalmente: R$ {children.reduce((sum, child) => sum + (child.price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Sub-type selection when À Vista is selected */}
                {paymentMethod === 'avista' && (
                  <FormField
                    control={form.control}
                    name="avista_payment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Pagamento À Vista</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-avista-payment-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Discount fields - always visible */}
                <FormField
                  control={form.control}
                  name="first_payment_discount_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue placeholder="Selecione o desconto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem desconto</SelectItem>
                          <SelectItem value="3">3%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency selector for custom discount */}
                {discountType === 'custom' && (
                  <FormField
                    control={form.control}
                    name="first_payment_discount_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Desconto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'percentage'}>
                          <FormControl>
                            <SelectTrigger data-testid="select-discount-currency">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {discountType === 'custom' && (
                  <>
                    {approvedByVadmin && (
                      <div className="col-span-full">
                        <Alert className="bg-green-50 border-green-200" data-testid="alert-discount-approved">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Desconto personalizado aprovado por <strong>{approvedByVadmin}</strong>
                            {maxDiscountAllowed && ` - Limite máximo: ${maxDiscountAllowed}%`}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    {discountApprovalStatus === 'pending' && (
                      <div className="col-span-full">
                        <Alert className="bg-amber-50 border-amber-200" data-testid="alert-approval-pending">
                          <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                          <AlertDescription className="text-amber-800">
                            Aguardando aprovação do vadmin para desconto personalizado...
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="first_payment_discount_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto Personalizado {discountCurrency === 'fixed' ? '(R$)' : '(%)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={discountCurrency === 'fixed' ? undefined : (maxDiscountAllowed || 100)}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder={discountCurrency === 'fixed' ? '100.00' : '10'}
                              data-testid="input-custom-discount"
                              disabled={discountApprovalStatus === 'pending'}
                            />
                          </FormControl>
                          {maxDiscountAllowed && discountCurrency !== 'fixed' && (
                            <p className="text-xs text-muted-foreground">
                              Desconto máximo aprovado: {maxDiscountAllowed}%
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Show final price with discount for À vista payments */}
                {paymentMethod === 'avista' && (firstPaymentDiscountType && firstPaymentDiscountType !== 'none') && (
                  <div className="col-span-full">
                    <div className="rounded-lg border border-border bg-primary/5 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-medium">Preço Original:</span>
                        <span className="text-base line-through text-muted-foreground" data-testid="text-original-price">
                          R$ {calculateTotalPrice().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                        <span className="text-lg font-bold">Preço Final com Desconto:</span>
                        <span className="text-lg font-bold text-green-600" data-testid="text-final-price-with-discount">
                          R$ {calculateFinalPriceWithDiscount().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Installment fields - only show for credit payment methods */}
                {showInstallmentFields && (
                  <>
                    <FormField
                      control={form.control}
                      name="down_payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entrada (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder=""
                              data-testid="input-down-payment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="col-span-full space-y-4">
                      <div className="text-sm font-semibold">Forma de Pagamento da Entrada</div>
                      
                      {/* Single payment method option */}
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Método único (opcional)</label>
                        <FormField
                          control={form.control}
                          name="down_payment_method"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-down-payment-method">
                                    <SelectValue placeholder="Selecione um método" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="credito">Crédito</SelectItem>
                                  <SelectItem value="debito">Débito</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                  <SelectItem value="link">Link</SelectItem>
                                  <SelectItem value="credito_viagens_anteriores">Crédito de Viagens Anteriores</SelectItem>
                                </SelectContent>
                              </Select>
                              {form.watch("down_payment_method") === "credito_viagens_anteriores" && (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    ℹ️ Selecione o cliente com crédito disponível. Este valor não será adicionado ao saldo a receber.
                                  </p>
                                  <Popover open={creditSelectorOpen} onOpenChange={setCreditSelectorOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                        data-testid="button-select-credit"
                                      >
                                        {selectedCredit 
                                          ? `${selectedCredit.client_name} - R$ ${selectedCredit.credit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                          : "Selecione um crédito disponível..."
                                        }
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Buscar cliente com crédito..." />
                                        <CommandEmpty>
                                          {creditsLoading ? "Carregando..." : "Nenhum crédito disponível"}
                                        </CommandEmpty>
                                        <CommandGroup heading="Créditos Disponíveis">
                                          {availableCredits.map((credit) => (
                                            <CommandItem
                                              key={credit.id}
                                              value={`${credit.client_name}-${credit.id}`}
                                              onSelect={() => {
                                                setSelectedCredit(credit);
                                                form.setValue("down_payment", credit.credit_amount);
                                                form.setValue("used_credit_id" as any, credit.id);
                                                setCreditSelectorOpen(false);
                                              }}
                                              className="cursor-pointer"
                                              data-testid={`credit-option-${credit.id}`}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  selectedCredit?.id === credit.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div className="flex flex-col flex-1">
                                                <span className="font-medium">{credit.client_name}</span>
                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                  <span className="text-green-600 font-semibold">
                                                    R$ {credit.credit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                  </span>
                                                  {credit.destination && (
                                                    <span>• Viagem: {credit.destination}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {selectedCredit && (
                                    <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-3">
                                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Crédito selecionado: R$ {selectedCredit.credit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </p>
                                      <p className="text-xs text-green-600 dark:text-green-400">
                                        Cliente: {selectedCredit.client_name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Split payment option */}
                      <div className="space-y-3 border-t pt-4">
                        <label className="text-xs text-muted-foreground">Ou dividir em múltiplos métodos</label>
                        {downPaymentSplits.map((split, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <Select value={split.method} onValueChange={(method) => {
                              const updated = [...downPaymentSplits];
                              updated[index].method = method;
                              setDownPaymentSplits(updated);
                            }}>
                              <SelectTrigger className="w-full" data-testid={`select-split-method-${index}`}>
                                <SelectValue placeholder="Método" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="credito">Crédito</SelectItem>
                                <SelectItem value="debito">Débito</SelectItem>
                                <SelectItem value="boleto">Boleto</SelectItem>
                                <SelectItem value="link">Link</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              value={split.amount || ''}
                              onChange={(e) => {
                                const updated = [...downPaymentSplits];
                                updated[index].amount = e.target.value ? parseFloat(e.target.value) : 0;
                                setDownPaymentSplits(updated);
                              }}
                              placeholder="Valor"
                              className="w-32"
                              data-testid={`input-split-amount-${index}`}
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setDownPaymentSplits(downPaymentSplits.filter((_, i) => i !== index));
                              }}
                              data-testid={`button-remove-split-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setDownPaymentSplits([...downPaymentSplits, { method: '', amount: 0 }]);
                          }}
                          data-testid="button-add-split"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Adicionar Método
                        </Button>
                        {downPaymentSplits.length > 0 && (
                          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-200">
                              Total dividido: R$ {downPaymentSplits.reduce((sum, split) => sum + split.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Entrada informada acima: R$ {(form.watch("down_payment") || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="installments_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="24"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder=""
                              data-testid="input-installments-count"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Display calculated installment amount */}
                    <div className="space-y-2">
                      <Label>Valor de Cada Parcela</Label>
                      <div className="flex items-center px-3 py-2 bg-muted rounded-md">
                        <span className="text-sm font-medium" data-testid="text-installment-amount">
                          {calculateInstallmentAmount()}
                        </span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="installment_due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vencimento das Parcelas</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="DD/MM/AAAA ou Descrição"
                              value={field.value || ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                // Only apply mask if it looks like a date (starts with numbers)
                                if (/^\d/.test(raw)) {
                                  let val = raw.replace(/\D/g, "");
                                  if (val.length > 8) val = val.slice(0, 8);
                                  
                                  let formatted = val;
                                  if (val.length > 2) formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                                  if (val.length > 4) formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                                  
                                  field.onChange(formatted);
                                } else {
                                  field.onChange(raw);
                                }
                              }}
                              data-testid="input-installment-due-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_installment_due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vencimento da Primeira Parcela</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="DD/MM/AAAA ou Descrição"
                              value={field.value || ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                // Only apply mask if it looks like a date (starts with numbers)
                                if (/^\d/.test(raw)) {
                                  let val = raw.replace(/\D/g, "");
                                  if (val.length > 8) val = val.slice(0, 8);
                                  
                                  let formatted = val;
                                  if (val.length > 2) formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                                  if (val.length > 4) formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                                  
                                  field.onChange(formatted);
                                } else {
                                  field.onChange(raw);
                                }
                              }}
                              data-testid="input-first-installment-due-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contract-type">
                            <SelectValue placeholder="Selecione o tipo de contrato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bate_volta">Bate e Volta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inclusions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Inclusões</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Hotel, passagens aéreas, café da manhã..." data-testid="input-inclusions" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Company */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2">👥</span>
                  Companhia
                </span>
                <Button type="button" variant="secondary" onClick={addChild} data-testid="button-add-child">
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar Pessoa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {children.map((child, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Pessoa {index + 1}</h4>
                        {(() => {
                          const birthdate = child.birthdate;
                          const relationship = child.relationship;
                          const name = child.name;
                          
                          let birthDateObj: Date | null = null;
                          if (birthdate instanceof Date) {
                            birthDateObj = birthdate;
                          } else if (typeof birthdate === "string" && (birthdate as string).length === 10 && (birthdate as string).includes("/")) {
                            // Handle string date from input mask DD/MM/YYYY
                            const [day, month, year] = (birthdate as string).split("/").map(Number);
                            if (day && month && year) {
                              // Use Date.UTC to avoid timezone issues when checking age
                              birthDateObj = new Date(Date.UTC(year, month - 1, day));
                            }
                          }

                          if (!birthDateObj || isNaN(birthDateObj.getTime()) || !relationship) return null;
                          
                          const today = new Date();
                          // Calculate age in years
                          let age = today.getUTCFullYear() - birthDateObj.getUTCFullYear();
                          const m = today.getUTCMonth() - birthDateObj.getUTCMonth();
                          if (m < 0 || (m === 0 && today.getUTCDate() < birthDateObj.getUTCDate())) {
                              age--;
                          }
                          
                          const validRelationships = ["neto", "neta", "irmao", "irma", "outro"];
                          
                          if (age < 5 && validRelationships.includes(relationship)) {
                            return (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => generateTravelAuthorizationDoc({
                                  parentName: `${form.getValues('first_name')} ${form.getValues('last_name')}`,
                                  parentRg: form.getValues('rg') || '',
                                  parentCpf: form.getValues('cpf'),
                                  parentAddress: form.getValues('address') || '',
                                  parentAddressNumber: '',
                                  parentNeighborhood: '',
                                  parentCity: form.getValues('city') || '',
                                  minorName: name || '',
                                  relationship: relationship,
                                  minorBirthdate: birthDateObj.toLocaleDateString('pt-BR'),
                                  destination: form.getValues('destination') || '',
                                  companionName: `${form.getValues('first_name')} ${form.getValues('last_name')}`,
                                  companionRg: form.getValues('rg') || '',
                                })}
                              >
                                <Download className="h-3 w-3" />
                                Autorização
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                        className="text-destructive hover:text-destructive/80"
                        data-testid={`button-remove-child-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Informações Básicas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor={`child-name-${index}`}>Nome *</Label>
                          <Input
                            id={`child-name-${index}`}
                            value={child.name}
                            onChange={(e) => updateChild(index, 'name', toTitleCase(e.target.value))}
                            placeholder="Nome completo"
                            data-testid={`input-child-name-${index}`}
                          />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`child-birthdate-${index}`}>Data de Nascimento *</Label>
                            {(() => {
                              const birthdate = child.birthdate;
                              const relationship = child.relationship;
                              const name = child.name;
                              
                              let birthDateObj: Date | null = null;
                              if (birthdate instanceof Date) {
                                birthDateObj = birthdate;
                              } else if (typeof birthdate === "string" && (birthdate as string).length === 10 && (birthdate as string).includes("/")) {
                                const [day, month, year] = (birthdate as string).split("/").map(Number);
                                if (day && month && year) {
                                  birthDateObj = new Date(Date.UTC(year, month - 1, day));
                                }
                              }

                              if (!birthDateObj || isNaN(birthDateObj.getTime()) || !relationship) return null;
                              
                              const today = new Date();
                              let age = today.getUTCFullYear() - birthDateObj.getUTCFullYear();
                              const m = today.getUTCMonth() - birthDateObj.getUTCMonth();
                              if (m < 0 || (m === 0 && today.getUTCDate() < birthDateObj.getUTCDate())) {
                                  age--;
                              }
                              
                              const validRelationships = ["neto", "neta", "irmao", "irma", "outro"];
                              
                              if (age < 5 && validRelationships.includes(relationship)) {
                                return (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                                    onClick={() => generateTravelAuthorizationDoc({
                                      parentName: `${form.getValues('first_name')} ${form.getValues('last_name')}`,
                                      parentRg: form.getValues('rg') || '',
                                      parentCpf: form.getValues('cpf'),
                                      parentAddress: form.getValues('address') || '',
                                      parentAddressNumber: '',
                                      parentNeighborhood: '',
                                      parentCity: form.getValues('city') || '',
                                      minorName: name || '',
                                      relationship: relationship,
                                      minorBirthdate: birthDateObj.toLocaleDateString('pt-BR'),
                                      destination: form.getValues('destination') || '',
                                      companionName: `${form.getValues('first_name')} ${form.getValues('last_name')}`,
                                      companionRg: form.getValues('rg') || '',
                                    })}
                                  >
                                    <Download className="h-3 w-3" />
                                    Baixar Autorização
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <FormControl>
                            <Input
                              id={`child-birthdate-${index}`}
                              placeholder="DD/MM/AAAA"
                              value={child.birthdate instanceof Date 
                                ? `${String(child.birthdate.getUTCDate()).padStart(2, '0')}/${String(child.birthdate.getUTCMonth() + 1).padStart(2, '0')}/${child.birthdate.getUTCFullYear()}`
                                : (typeof child.birthdate === 'string' ? child.birthdate : '')}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 8) val = val.slice(0, 8);
                                
                                // Format as DD/MM/YYYY
                                let formatted = val;
                                if (val.length > 2) formatted = `${val.slice(0, 2)}/${val.slice(2)}`;
                                if (val.length > 4) formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                                
                                // Update display value immediately for the input mask effect
                                updateChild(index, 'birthdate', formatted);

                                // If we have a full date, update the actual date object using UTC
                                if (val.length === 8) {
                                  const day = parseInt(val.slice(0, 2));
                                  const month = parseInt(val.slice(2, 4));
                                  const year = parseInt(val.slice(4, 8));
                                  
                                  // Validate date components
                                  if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                                    const date = new Date(Date.UTC(year, month - 1, day));
                                    if (!isNaN(date.getTime())) {
                                      updateChild(index, 'birthdate', date);
                                    }
                                  }
                                }
                              }}
                              data-testid={`input-child-birthdate-${index}`}
                            />
                          </FormControl>
                        </div>
                        
                        <div>
                          <Label htmlFor={`child-phone-${index}`}>Telefone</Label>
                          <Input
                            id={`child-phone-${index}`}
                            value={child.phone || ''}
                            onChange={(e) => updateChild(index, 'phone', e.target.value)}
                            placeholder="+1 (000) 000-0000"
                            data-testid={`input-child-phone-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`child-relationship-${index}`}>Parentesco *</Label>
                          <Select
                            value={child.relationship}
                            onValueChange={(value) => updateChild(index, 'relationship', value)}
                          >
                            <SelectTrigger data-testid={`select-child-relationship-${index}`}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="filho">Filho</SelectItem>
                              <SelectItem value="filha">Filha</SelectItem>
                              <SelectItem value="pai">Pai</SelectItem>
                              <SelectItem value="mae">Mãe</SelectItem>
                              <SelectItem value="sogro">Sogro</SelectItem>
                              <SelectItem value="sogra">Sogra</SelectItem>
                              <SelectItem value="enteado">Enteado</SelectItem>
                              <SelectItem value="enteada">Enteada</SelectItem>
                              <SelectItem value="neto">Neto</SelectItem>
                              <SelectItem value="neta">Neta</SelectItem>
                              <SelectItem value="cônjuge">Cônjuge</SelectItem>
                              <SelectItem value="noivo">Noivo(a)</SelectItem>
                              <SelectItem value="namorado">Namorado(a)</SelectItem>
                              <SelectItem value="irmao">Irmão</SelectItem>
                              <SelectItem value="irma">Irmã</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Documentos e Preço */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor={`child-cpf-${index}`}>CPF</Label>
                          <Input
                            id={`child-cpf-${index}`}
                            value={child.cpf || ''}
                            onChange={(e) => updateChild(index, 'cpf', formatCPF(e.target.value))}
                            placeholder="000.000.000-00"
                            data-testid={`input-child-cpf-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`child-rg-${index}`}>RG</Label>
                          <Input
                            id={`child-rg-${index}`}
                            value={child.rg || ''}
                            onChange={(e) => updateChild(index, 'rg', e.target.value)}
                            placeholder="RG do acompanhante"
                            data-testid={`input-child-rg-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`child-passport-${index}`}>Passaporte</Label>
                          <Input
                            id={`child-passport-${index}`}
                            value={child.passport_number || ''}
                            onChange={(e) => updateChild(index, 'passport_number', e.target.value)}
                            placeholder="Passaporte"
                            data-testid={`input-child-passport-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`child-price-${index}`}>Preço (R$)</Label>
                          <Input
                            id={`child-price-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={child.price || ''}
                            onChange={(e) => updateChild(index, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            data-testid={`input-child-price-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {children.length === 0 && (
                  <p className="text-muted-foreground text-center py-2">
                    Nenhuma pessoa adicionada. Clique em "Adicionar Pessoa" para incluir.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleGenerateContract}
              data-testid="button-generate-contract"
            >
              <FileText className="mr-2 h-4 w-4" />
              Gerar Contrato
            </Button>
            
            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save-client" onClick={handleSaveClick}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Salvando...' : 'Salvar Cliente'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
