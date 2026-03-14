import { useState, useEffect } from "react";
import { Plus, Users, MapPin, Calendar, Building2, Plane, Search as SearchIcon, Link as LinkIcon, Copy, Check, CheckCircle, AlertTriangle, AlertCircle, Share2, Mail, XCircle, Wrench, FileText } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientList, getClientDataQuality } from "@/components/clients/client-list";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { useDestinations } from "@/hooks/use-destinations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTutorial } from "@/contexts/TutorialContext";
import { TutorialHighlight } from "@/components/tutorial/TutorialHighlight";
import type { FilterOptions, Client } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Clients() {
  const [, setLocation] = useLocation();
  const { activeStep, completeTutorialStep } = useTutorial();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const isVadmin = userRole === 'vadmin';
  const [showClientTypeDialog, setShowClientTypeDialog] = useState(false);
  const [selectedClientType, setSelectedClientType] = useState<'agencia' | 'operadora' | null>(null);
  const [showOperatorDialog, setShowOperatorDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedInvType, setSelectedInvType] = useState<'agencia' | 'operadora' | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReportMonthDialog, setShowReportMonthDialog] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [clientToCancel, setClientToCancel] = useState<Client | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    page: 1,
    limit: 99999,
    sortBy: 'name',
  });

  const { clients, pagination, isLoading } = useClients(filters);
  const deleteClient = useDeleteClient();
  const { data: destinations } = useDestinations();

  const createInvitationLink = async () => {
    try {
      if (!user) {
        toast({ title: 'Erro', description: 'Você precisa estar logado', variant: 'destructive' });
        return;
      }
      
      const token = await user.getIdToken();
      const body: any = {
        client_type: selectedInvType,
        expires_in_days: 30,
      };
      if (selectedInvType === 'operadora') body.operator_name = selectedOperator;
      if (selectedDestination && selectedDestination !== '__none__') {
        body.destination = selectedDestination;
      }

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const fullLink = `${window.location.origin}/invite/${data.link_token}`;
      setInvitationLink(fullLink);
    } catch (error) {
      console.error('Error creating invitation link:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o link', variant: 'destructive' });
    }
  };

  const copyInvitationLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'Link copiado para a área de transferência' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (activeStep === 'view-clients') {
      const timer = setTimeout(() => {
        completeTutorialStep('view-clients');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeStep, completeTutorialStep]);

  const handleEdit = (client: Client) => {
    setLocation(`/clients/${client.id}/edit`);
  };

  const handleDelete = (clientId: string) => {
    deleteClient.mutate(clientId);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handleNewTrip = (client: Client) => {
    const personalInfoOnly = {
      ...client,
      destination: '',
      travel_price: undefined,
      duration: 1,
      travel_date: undefined,
      down_payment: undefined,
      down_payment_method: undefined,
      installments_count: undefined,
      installment_due_date: undefined,
      first_installment_due_date: undefined,
      payment_method: undefined,
      departure_location: '',
      return_location: '',
      travel_itinerary: '',
      inclusions: '',
      seat_number: undefined,
      quantity: 1,
    };
    sessionStorage.setItem('prefilledClient', JSON.stringify(personalInfoOnly));
    setLocation("/clients/new");
  };

  const cancelClientMutation = useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason: string }) => {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/clients/${clientId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to cancel client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cancelled-client-credits'] });
      toast({ title: 'Sucesso', description: 'Viagem cancelada e crédito gerado com sucesso' });
      setShowCancelDialog(false);
      setClientToCancel(null);
      setCancelReason("");
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível cancelar a viagem', variant: 'destructive' });
    },
  });

  const handleCancelClient = (client: Client) => {
    setClientToCancel(client);
    setShowCancelDialog(true);
  };

  const fixCompanionsMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/fix-missing-companions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fix companions');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ 
        title: 'Sucesso', 
        description: `${data.companionsCreated} acompanhantes criados, ${data.reservationsUpdated} reservas atualizadas`
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível corrigir os acompanhantes', variant: 'destructive' });
    },
  });

  const confirmCancel = () => {
    if (clientToCancel && cancelReason.trim()) {
      cancelClientMutation.mutate({ clientId: clientToCancel.id, reason: cancelReason });
    }
  };

  const generateMonthlyReport = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          month: reportMonth,
          year: reportYear
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Empty PDF generated');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `relatorio-mensal-${reportMonth}-${reportYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'Sucesso', description: 'Relatório gerado com sucesso' });
      setShowReportMonthDialog(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o relatório. Verifique se há clientes este mês.', variant: 'destructive' });
    }
  };

  const handleClientTypeSelection = (type: 'agencia' | 'operadora') => {
    setSelectedClientType(type);
    setShowClientTypeDialog(false);
    
    if (type === 'agencia') {
      sessionStorage.setItem('clientType', 'agencia');
      setLocation("/clients/new");
    } else {
      setShowOperatorDialog(true);
    }
  };

  const handleOperatorSelection = (operator: 'azul_viagens' | 'cvc' | 'rex_tour') => {
    sessionStorage.setItem('clientType', 'operadora');
    sessionStorage.setItem('operatorName', operator);
    setShowOperatorDialog(false);
    setLocation("/clients/new");
  };

  const totalClients = pagination.totalItems;
  const upcomingTrips = clients.filter(client => {
    if (!client.travel_date) return false;
    const travelDate = new Date(client.travel_date);
    const now = new Date();
    return travelDate > now;
  }).length;
  const uniqueDestinations = new Set(clients.map(c => c.destination)).size;

  // Calculate data quality statistics
  const completeClients = clients.filter(c => getClientDataQuality(c).status === 'complete').length;
  const incompleteClients = clients.filter(c => getClientDataQuality(c).status === 'incomplete').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Sticky Floating Action Buttons - Top Right */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-3">
        {/* Atalhos Button */}
        <button
          onClick={() => setShowShortcutsDialog(true)}
          data-testid="button-shortcuts-sticky"
          className="group relative flex items-center gap-2 neo-btn py-3 px-5 rounded-2xl transition-all duration-300 overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-8 h-8 neo-inset-deep rounded-xl text-primary">
            <span className="text-sm">⚡</span>
          </div>
          <span className="relative font-bold text-foreground text-sm">Atalhos</span>
        </button>

        {/* Novo Cliente Button */}
        <button
          onClick={() => setShowClientTypeDialog(true)}
          data-testid="button-new-client-sticky"
          className="group relative flex items-center gap-2 neo-btn text-primary py-3 px-5 rounded-2xl transition-all duration-300 overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-8 h-8 neo-inset-deep rounded-xl">
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          </div>
          <span className="relative font-bold text-sm text-foreground group-hover:text-primary transition-colors">Novo Cliente</span>
        </button>

        {/* Gerar Relatório Mensal Button */}
        <button
          onClick={() => setShowReportMonthDialog(true)}
          data-testid="button-monthly-report-sticky"
          className="group relative flex items-center gap-3 neo-btn text-foreground py-3.5 px-6 rounded-2xl transition-all duration-300 overflow-hidden"
        >
          <div className="relative flex items-center justify-center w-9 h-9 neo-inset-deep rounded-xl transition-all duration-300 text-primary">
            <FileText className="h-5 w-5 drop-shadow-sm" />
          </div>
          <div className="relative flex flex-col items-start">
            <span className="font-bold text-sm tracking-wide group-hover:text-primary transition-colors">Relatório</span>
            <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">Mensal em PDF</span>
          </div>
        </button>
      </div>
      {/* Removed Floating Bubbles to maintain clean Neumorphism aesthetic */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl relative z-10 pb-32">
        
        {/* Modern Header */}
        <header className="mb-10 animate-in fade-in duration-500">
          <div className="relative">
            {/* Neumorphic card header */}
            <div className="relative neo-extruded rounded-[32px] p-8 lg:p-10 overflow-hidden">
              <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative neo-inset-deep p-3 rounded-2xl text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-primary px-4 py-1.5 rounded-full neo-inset">
                      Gestão de Clientes
                    </span>
                  </div>
                  <h1 className="text-5xl lg:text-6xl font-black text-foreground tracking-tight mb-3">
                    Seus Clientes
                  </h1>
                  <p className="text-muted-foreground text-lg font-medium max-w-md">
                    Organize e acompanhe todos os seus clientes em um só lugar
                  </p>
                </div>
                
                {/* Stats Counter - Neumorphism Style */}
                <div className="flex items-center gap-4">
                  <div className="group relative">
                    <div className="relative neo-inset rounded-[32px] p-5 text-center min-w-[120px] overflow-hidden">
                      <div className="relative">
                        <div className="text-4xl font-black text-primary leading-none">
                          {totalClients}
                        </div>
                        <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Contratos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Section - Neumorphism Cards */}
        <section className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* Upcoming Trips Card */}
            <div className="group relative neo-extruded rounded-[32px] p-6 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Próximas</p>
                  <h3 className="text-4xl font-black text-foreground">{upcomingTrips}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">viagens</p>
                </div>
                <div className="relative neo-inset-deep text-primary h-12 w-12 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Active Destinations Card */}
            <div className="group relative neo-extruded rounded-[32px] p-6 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Destinos</p>
                  <h3 className="text-4xl font-black text-foreground">{uniqueDestinations}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">ativos</p>
                </div>
                <div className="relative neo-inset-deep text-primary h-12 w-12 rounded-xl flex items-center justify-center">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Complete Data Card */}
            <div className="group relative neo-extruded rounded-[32px] p-6 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Completo</p>
                  <h3 className="text-4xl font-black text-primary">{completeClients}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">com dados</p>
                </div>
                <div className="relative neo-inset-deep text-primary h-12 w-12 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Incomplete/Missing Data Card */}
            <div className="group relative neo-extruded rounded-[32px] p-6 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-destructive uppercase tracking-widest mb-2">Faltando</p>
                  <h3 className="text-4xl font-black text-destructive">{incompleteClients}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">incompletos</p>
                </div>
                <div className="relative neo-inset-deep text-destructive h-12 w-12 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section - Neumorphism Card */}
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="relative neo-extruded rounded-[32px] p-6 overflow-hidden">
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative neo-inset-deep text-primary h-10 w-10 rounded-xl flex items-center justify-center">
                  <SearchIcon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Buscar e Filtrar</h2>
              </div>
              <ClientFilters filters={filters} onFiltersChange={handleFiltersChange} />
            </div>
          </div>
        </section>

        {/* Client List Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <ClientList
            clients={clients}
            pagination={pagination}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={handlePageChange}
            onNewTrip={handleNewTrip}
            onCancel={handleCancelClient}
          />
        </section>
      </div>
      <Dialog open={showClientTypeDialog} onOpenChange={setShowClientTypeDialog}>
        <DialogContent className="max-w-xl p-0 neo-extruded border-none rounded-[32px] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Adicionar Cliente</DialogTitle>
            <DialogDescription>Escolha o tipo de cliente</DialogDescription>
          </DialogHeader>
          
          {/* Header */}
          <div className="relative p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative neo-inset-deep text-primary h-16 w-16 rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Adicionar Cliente</h2>
                <p className="text-sm text-muted-foreground font-medium">Escolha o tipo de cliente</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative px-8 pb-8 space-y-4">
            {/* Agência Option */}
            <button
              onClick={() => handleClientTypeSelection('agencia')}
              className="group relative w-full flex items-center gap-5 p-5 neo-extruded rounded-2xl transition-all duration-300 hover:scale-[1.02] text-left"
              data-testid="button-client-type-agencia"
            >
              <div className="relative neo-inset-deep text-primary h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-lg">Destinos da Agência</p>
                <p className="text-sm text-muted-foreground font-medium">Clientes diretos da agência</p>
              </div>
              <div className="neo-btn w-10 h-10 rounded-xl flex items-center justify-center text-primary border-none">
                <span className="text-xl group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>

            {/* Operadora Option */}
            <button
              onClick={() => handleClientTypeSelection('operadora')}
              className="group relative w-full flex items-center gap-5 p-5 neo-extruded rounded-2xl transition-all duration-300 hover:scale-[1.02] text-left"
              data-testid="button-client-type-operadora"
            >
              <div className="relative neo-inset-deep text-primary h-14 w-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plane className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-lg">Operadoras</p>
                <p className="text-sm text-muted-foreground font-medium">Clientes de operadoras</p>
              </div>
              <div className="neo-btn w-10 h-10 rounded-xl flex items-center justify-center text-primary border-none">
                <span className="text-xl group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Invitation Link Dialog */}
      {/* Invitation Link Dialog */}
      <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
        <DialogContent className="max-w-2xl neo-extruded border-none rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-primary" />
              Link de Cadastro
              <span className="neo-inset text-primary text-xs font-bold px-3 py-1 rounded-full">BETA</span>
            </DialogTitle>
            <DialogDescription>
              Gere um link para que seus clientes possam preencher seus próprios dados
            </DialogDescription>
          </DialogHeader>
          
          {!invitationLink ? (
            <div className="space-y-1 mt-1">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Tipo de Cliente
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedInvType('agencia')}
                      className={`p-4 rounded-2xl transition-all ${
                        selectedInvType === 'agencia'
                          ? 'neo-inset border-2 border-primary text-primary'
                          : 'neo-btn border-none text-muted-foreground'
                      }`}
                    >
                      <Building2 className={`h-6 w-6 mx-auto mb-2 ${selectedInvType === 'agencia' ? 'text-primary' : ''}`} />
                      <p className="text-sm font-medium">Agência</p>
                    </button>
                    <button
                      onClick={() => setSelectedInvType('operadora')}
                      className={`p-4 rounded-2xl transition-all ${
                        selectedInvType === 'operadora'
                          ? 'neo-inset border-2 border-primary text-primary'
                          : 'neo-btn border-none text-muted-foreground'
                      }`}
                    >
                      <Plane className={`h-6 w-6 mx-auto mb-2 ${selectedInvType === 'operadora' ? 'text-primary' : ''}`} />
                      <p className="text-sm font-medium">Operadora</p>
                    </button>
                  </div>
                </div>

                {selectedInvType === 'operadora' && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Operadora
                    </label>
                    <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                      <SelectTrigger className="w-full neo-inset border-none">
                        <SelectValue placeholder="Selecione a operadora" />
                      </SelectTrigger>
                      <SelectContent className="neo-extruded border-none rounded-xl">
                        <SelectItem value="azul_viagens">Azul Viagens</SelectItem>
                        <SelectItem value="cvc">CVC</SelectItem>
                        <SelectItem value="rex_tour">Rex Tour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Destino (Opcional)
                  </label>
                  <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                    <SelectTrigger className="w-full neo-inset border-none">
                      <SelectValue placeholder="Selecione um destino" />
                    </SelectTrigger>
                    <SelectContent className="neo-extruded border-none rounded-xl">
                      <SelectItem value="__none__">Sem destino específico</SelectItem>
                      {destinations?.map((dest) => (
                        <SelectItem key={dest.id} value={dest.name}>
                          {dest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={createInvitationLink}
                disabled={!selectedInvType || (selectedInvType === 'operadora' && !selectedOperator)}
                className="w-full neo-btn mt-6 font-bold text-primary"
                size="lg"
              >
                <LinkIcon className="h-5 w-5 mr-2" />
                Gerar Link de Cadastro
              </Button>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              <div className="neo-inset rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-foreground">Link gerado com sucesso!</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link com seu cliente para que ele possa preencher os dados dele.
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-semibold text-foreground">
                  Link de Cadastro
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="flex-1 px-4 py-3 neo-inset border-none rounded-xl font-mono text-sm text-muted-foreground"
                  />
                  <Button
                    onClick={copyInvitationLink}
                    size="lg"
                    className="neo-btn"
                  >
                    {linkCopied ? <Check className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5 text-primary" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setInvitationLink("");
                    setSelectedInvType(null);
                    setSelectedOperator("");
                    setSelectedDestination("");
                  }}
                  className="flex-1 neo-btn text-muted-foreground"
                >
                  Gerar Novo Link
                </Button>
                <Button
                  onClick={() => setShowInvitationDialog(false)}
                  className="flex-1 neo-btn font-bold text-primary"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Operator Selection Dialog */}
      <Dialog open={showOperatorDialog} onOpenChange={setShowOperatorDialog}>
        <DialogContent className="max-w-md neo-extruded border-none rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Selecione a Operadora</DialogTitle>
            <DialogDescription>
              Escolha qual operadora está relacionada a este cliente
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 mt-2 py-4">
            {[
              { id: 'azul_viagens', name: 'Azul Viagens' },
              { id: 'cvc', name: 'CVC' },
              { id: 'rex_tour', name: 'Rex Tour' }
            ].map((operator) => (
              <button
                key={operator.id}
                onClick={() => handleOperatorSelection(operator.id as 'azul_viagens' | 'cvc' | 'rex_tour')}
                className="group relative overflow-hidden rounded-2xl p-6 neo-btn transition-all duration-300 flex items-center gap-4 text-left"
                data-testid={`button-operator-${operator.id.split('_')[0]}`}
              >
                <div className={`h-14 w-14 neo-inset-deep text-primary rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                  <span className="font-bold text-lg">{operator.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{operator.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Operadora de turismo</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Shortcuts Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="max-w-md p-0 neo-extruded border-none rounded-[32px] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Atalhos Rápidos</DialogTitle>
            <DialogDescription>Acesso rápido aos links</DialogDescription>
          </DialogHeader>
          
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative neo-inset-deep text-primary h-14 w-14 rounded-2xl flex items-center justify-center">
                <span className="text-2xl text-primary">⚡</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Atalhos Rápidos</h2>
                <p className="text-sm text-muted-foreground font-medium">Acesso rápido aos links</p>
              </div>
            </div>
          </div>

            {/* Content */}
            <div className="relative px-6 pb-6 space-y-4">
              {/* Operadoras Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg neo-inset-deep flex items-center justify-center">
                    <span className="text-xs">🌍</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Operadoras</span>
                </div>
                
                <div className="space-y-2">
                  {/* Azul Viagens */}
                  <a
                    href="https://www.azulviagens.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-4 p-4 neo-btn rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative w-10 h-10 neo-inset-deep text-primary rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-sm">A</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">Azul Viagens</p>
                      <p className="text-xs text-muted-foreground font-medium">Site oficial</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl neo-inset flex items-center justify-center text-primary transition-colors">
                      <span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </a>

                  {/* CVC */}
                  <a
                    href="https://cvcagentes.cvc.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-4 p-4 neo-btn rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative w-10 h-10 neo-inset-deep text-primary rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-sm">C</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">CVC</p>
                      <p className="text-xs text-muted-foreground font-medium">Portal de agentes</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl neo-inset flex items-center justify-center text-primary transition-colors">
                      <span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </a>

                  {/* Rex Tour */}
                  <a
                    href="https://app.reservafacil.tur.br/v2/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-4 p-4 neo-btn rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative w-10 h-10 neo-inset-deep text-primary rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-sm">R</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">Rex Tour</p>
                      <p className="text-xs text-muted-foreground font-medium">Portal de vendas</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl neo-inset flex items-center justify-center text-primary transition-colors">
                      <span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Outros Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg neo-inset-deep flex items-center justify-center">
                    <span className="text-xs">📌</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Outros</span>
                </div>
                
                <div className="space-y-2">
                  {/* Link de Cadastro */}
                  <button
                    onClick={() => {
                      setShowShortcutsDialog(false);
                      setShowInvitationDialog(true);
                    }}
                    className="group relative w-full flex items-center gap-4 p-4 neo-btn rounded-2xl transition-all duration-300 text-left"
                  >
                    <div className="relative w-10 h-10 neo-inset-deep text-primary rounded-xl flex items-center justify-center shadow-lg">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">Link de Cadastro</p>
                      <p className="text-xs text-muted-foreground font-medium">Gerar links para clientes</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl neo-inset flex items-center justify-center text-primary transition-colors">
                      <span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </button>

                  {/* Canva */}
                  <a
                    href="https://www.canva.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-4 p-4 neo-btn rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative w-10 h-10 neo-inset-deep text-primary rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-sm">C</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">Canva</p>
                      <p className="text-xs text-muted-foreground font-medium">Ferramentas de design</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl neo-inset flex items-center justify-center text-primary transition-colors">
                      <span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>
      {/* Coming Soon Preview Dialog */}
      <Dialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
        <DialogContent className="max-w-2xl neo-extruded border-none rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold flex items-center gap-2">
              <div className="neo-inset-deep text-primary p-2 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              Link de Cadastro - Em Breve!
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Conheça os recursos incríveis que estarão disponíveis
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-2">
            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl neo-btn flex items-start gap-4">
                <div className="neo-inset-deep text-primary p-2 rounded-xl flex-shrink-0">
                  <Share2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">Links Personalizados</p>
                  <p className="text-sm text-muted-foreground">Gere links exclusivos e únicos para compartilhar com seus prospects</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl neo-btn flex items-start gap-4">
                <div className="neo-inset-deep text-primary p-2 rounded-xl flex-shrink-0">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">Sem Autenticação</p>
                  <p className="text-sm text-muted-foreground">Seus prospects preenchem o formulário sem precisar de login</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl neo-btn flex items-start gap-4">
                <div className="neo-inset-deep text-primary p-2 rounded-xl flex-shrink-0">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">Uso Único</p>
                  <p className="text-sm text-muted-foreground">Cada link pode ser usado apenas uma vez para segurança</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl neo-btn flex items-start gap-4">
                <div className="neo-inset-deep text-primary p-2 rounded-xl flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">Prospects Automáticos</p>
                  <p className="text-sm text-muted-foreground">Leads automaticamente registrados na página de orçamentos</p>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="neo-inset rounded-2xl p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">💡 Como funcionará:</span> Você gerará um link exclusivo, compartilha com seus prospects via email ou WhatsApp. Eles preenchem seus dados em uma página simples, sem precisar se autenticar. O cadastro deles aparece automaticamente em "Orçamento de Viagens" para você acompanhar.
              </p>
            </div>

            {/* CTA */}
            <div className="flex justify-end pt-4">
              <Button
                className="neo-btn font-bold text-primary px-8"
                onClick={() => setShowComingSoonDialog(false)}
              >
                Entendi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Client Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md neo-extruded border-none rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="neo-inset-deep text-destructive p-2 rounded-xl">
                <XCircle className="h-5 w-5" />
              </div>
              Cancelar Viagem
            </DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Um crédito será gerado automaticamente válido por 90 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-foreground">Cliente</Label>
              <div className="neo-inset rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">{clientToCancel?.first_name} {clientToCancel?.last_name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" className="font-bold text-foreground">Motivo do Cancelamento *</Label>
              <Textarea
                id="cancel-reason"
                className="neo-inset border-none rounded-xl"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                rows={3}
                data-testid="textarea-cancel-reason"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button className="neo-btn text-muted-foreground font-bold" onClick={() => setShowCancelDialog(false)}>
              Voltar
            </Button>
            <Button 
              onClick={confirmCancel}
              disabled={!cancelReason.trim() || cancelClientMutation.isPending}
              className="neo-btn text-destructive font-bold"
              data-testid="button-confirm-cancel"
            >
              {cancelClientMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Month Selection Dialog */}
      <Dialog open={showReportMonthDialog} onOpenChange={setShowReportMonthDialog}>
        <DialogContent className="max-w-md p-0 neo-extruded border-none rounded-[32px] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Gerar Relatório Mensal</DialogTitle>
            <DialogDescription>Selecione o período do relatório</DialogDescription>
          </DialogHeader>
          
          {/* Header with icon */}
          <div className="relative p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative neo-inset-deep text-primary h-16 w-16 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">
                  Relatório Mensal
                </h2>
                <p className="text-sm text-muted-foreground font-medium">Selecione o período desejado</p>
              </div>
            </div>
          </div>

          {/* Month/Year Selection */}
          <div className="relative px-8 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Mês
                </Label>
                <Select value={reportMonth.toString()} onValueChange={(val) => setReportMonth(parseInt(val))}>
                  <SelectTrigger className="w-full neo-inset border-none rounded-xl h-12 font-medium">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent className="neo-extruded border-none rounded-xl">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="font-medium hover:neo-inset">
                        {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Ano
                </Label>
                <Select value={reportYear.toString()} onValueChange={(val) => setReportYear(parseInt(val))}>
                  <SelectTrigger className="w-full neo-inset border-none rounded-xl h-12 font-medium">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="neo-extruded border-none rounded-xl">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={year.toString()} className="font-medium hover:neo-inset">
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Card */}
            <div className="p-4 neo-inset rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 neo-inset-deep text-primary rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Relatório selecionado</p>
                <p className="font-bold text-foreground">
                  {new Date(2000, reportMonth - 1).toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + new Date(2000, reportMonth - 1).toLocaleString('pt-BR', { month: 'long' }).slice(1)} de {reportYear}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative px-8 pb-8">
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowReportMonthDialog(false)}
                className="flex-1 neo-btn font-bold h-12 text-muted-foreground"
                data-testid="button-cancel-report"
              >
                Cancelar
              </Button>
              <Button 
                onClick={generateMonthlyReport}
                className="flex-1 neo-btn font-bold h-12 text-primary"
                data-testid="button-generate-pdf"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
