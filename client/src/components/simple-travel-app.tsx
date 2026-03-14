import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Users, Plane, MapPin, DollarSign, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg?: string;
  destination: string;
  travel_date: string;
  duration: number;
  travelers_count: number;
  price: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  status: 'confirmed' | 'pending' | 'departed' | 'cancelled';
  created_at: string;
}

interface Departure {
  id: string;
  client_name: string;
  destination: string;
  departure_date: string;
  travelers_count: number;
  status: 'scheduled' | 'confirmed' | 'departed' | 'cancelled';
}

export function SimpleTravelApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [clientForm, setClientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cpf: '',
    rg: '',
    destination: '',
    travel_date: '',
    duration: 7,
    travelers_count: 1,
    price: 0,
    payment_status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Comprehensive destinations with pricing (in BRL)
  const destinations = {
    // Europe
    'Paris, França': 8500,
    'Londres, Reino Unido': 9200,
    'Roma, Itália': 7800,
    'Barcelona, Espanha': 7200,
    'Amsterdam, Holanda': 8000,
    'Lisboa, Portugal': 6500,
    'Berlim, Alemanha': 7500,
    'Viena, Áustria': 7800,
    'Praga, República Tcheca': 6800,
    'Dublin, Irlanda': 8500,
    'Zurique, Suíça': 12000,
    'Estocolmo, Suécia': 9500,
    'Helsinque, Finlândia': 9000,
    'Moscou, Rússia': 8800,
    
    // Americas
    'Nova York, EUA': 10500,
    'Los Angeles, EUA': 11200,
    'Miami, EUA': 9500,
    'Las Vegas, EUA': 9800,
    'Toronto, Canadá': 9000,
    'Vancouver, Canadá': 9500,
    'Buenos Aires, Argentina': 3500,
    'Santiago, Chile': 4200,
    'Lima, Peru': 3800,
    'Bogotá, Colômbia': 3200,
    'Cidade do México, México': 6500,
    'Cancún, México': 7200,
    
    // Asia
    'Tóquio, Japão': 13500,
    'Seul, Coreia do Sul': 12800,
    'Pequim, China': 11500,
    'Xangai, China': 11200,
    'Bangkok, Tailândia': 9500,
    'Singapura': 10800,
    'Dubai, Emirados Árabes': 8500,
    'Mumbai, Índia': 8200,
    'Nova Déli, Índia': 8000,
    'Manila, Filipinas': 10200,
    
    // Oceania
    'Sydney, Austrália': 15500,
    'Melbourne, Austrália': 15200,
    'Auckland, Nova Zelândia': 16800,
    
    // Africa
    'Cidade do Cabo, África do Sul': 9500,
    'Cairo, Egito': 7800,
    'Marrakech, Marrocos': 7200,
    'Nairobi, Quênia': 9800,
    
    // Nacional
    'Fernando de Noronha, PE': 4500,
    'Gramado, RS': 2800,
    'Campos do Jordão, SP': 2200,
    'Bonito, MS': 3200,
    'Jericoacoara, CE': 3800,
    'Porto de Galinhas, PE': 3500,
    'Búzios, RJ': 2500,
    'Florianópolis, SC': 2800,
    'Salvador, BA': 2200,
    'Foz do Iguaçu, PR': 2500,
    'Manaus, AM': 4200,
    'Lençóis Maranhenses, MA': 4800,
  };

  // Auto-calculate price when destination changes
  const updatePrice = (destination: string) => {
    const basePrice = destinations[destination as keyof typeof destinations] || 0;
    const totalPrice = basePrice * clientForm.travelers_count;
    setClientForm(prev => ({ ...prev, price: totalPrice }));
  };

  // Load sample data
  useEffect(() => {
    const sampleClients: Client[] = [
      {
        id: '1',
        first_name: 'Maria',
        last_name: 'Silva',
        email: 'maria@email.com',
        phone: '(11) 99999-9999',
        cpf: '123.456.789-00',
        rg: 'MG-12.345.678',
        destination: 'Paris, França',
        travel_date: '2025-03-15',
        duration: 10,
        travelers_count: 2,
        price: 17000,
        payment_status: 'partial',
        status: 'confirmed',
        created_at: '2025-01-15',
      },
      {
        id: '2',
        first_name: 'João',
        last_name: 'Santos',
        email: 'joao@email.com',
        phone: '(21) 88888-8888',
        cpf: '987.654.321-00',
        destination: 'Londres, Reino Unido',
        travel_date: '2025-04-10',
        duration: 7,
        travelers_count: 1,
        price: 9200,
        payment_status: 'pending',
        status: 'pending',
        created_at: '2025-01-20',
      },
      {
        id: '3',
        first_name: 'Ana',
        last_name: 'Costa',
        email: 'ana.costa@email.com',
        phone: '(31) 77777-7777',
        cpf: '456.789.123-00',
        rg: 'SP-98.765.432',
        destination: 'Tóquio, Japão',
        travel_date: '2025-05-20',
        duration: 14,
        travelers_count: 3,
        price: 40500,
        payment_status: 'paid',
        status: 'confirmed',
        created_at: '2025-01-25',
      },
    ];
    
    const sampleDepartures: Departure[] = [
      {
        id: '1',
        client_name: 'Maria Silva',
        destination: 'Paris',
        departure_date: '2025-03-15',
        travelers_count: 2,
        status: 'confirmed',
      },
      {
        id: '2',
        client_name: 'João Santos',
        destination: 'Londres',
        departure_date: '2025-04-10',
        travelers_count: 1,
        status: 'scheduled',
      },
    ];

    setClients(sampleClients);
    setDepartures(sampleDepartures);
  }, []);

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    return cleanCPF.length === 11;
  };

  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatRG = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue.length <= 9) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleSubmitClient = () => {
    if (!clientForm.first_name || !clientForm.last_name || !clientForm.cpf) {
      toast({
        title: "Erro",
        description: "Nome, sobrenome e CPF são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!validateCPF(clientForm.cpf)) {
      toast({
        title: "Erro",
        description: "CPF deve conter 11 dígitos",
        variant: "destructive",
      });
      return;
    }

    const clientData = {
      ...clientForm,
      id: isEditing ? editingId! : Date.now().toString(),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    if (isEditing) {
      setClients(prev => prev.map(c => c.id === editingId ? clientData : c));
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações foram salvas.",
      });
    } else {
      setClients(prev => [...prev, clientData]);
      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema.",
      });
    }

    // Reset form
    setClientForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      cpf: '',
      rg: '',
      destination: '',
      travel_date: '',
      duration: 7,
      travelers_count: 1,
      price: 0,
      payment_status: 'pending',
    });
    setIsEditing(false);
    setEditingId(null);
    setActiveTab('clients');
  };

  const handleEditClient = (client: Client) => {
    setClientForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      cpf: client.cpf,
      rg: client.rg || '',
      destination: client.destination,
      travel_date: client.travel_date,
      duration: client.duration,
      travelers_count: client.travelers_count,
      price: client.price,
      payment_status: client.payment_status,
    });
    setIsEditing(true);
    setEditingId(client.id);
    setActiveTab('add-client');
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      setClients(prev => prev.filter(c => c.id !== id));
      setDepartures(prev => prev.filter(d => d.client_name !== clients.find(c => c.id === id)?.first_name + ' ' + clients.find(c => c.id === id)?.last_name));
      toast({
        title: "Cliente excluído",
        description: "O cliente foi removido do sistema.",
      });
    }
  };

  const handleGenerateContract = () => {
    if (!clientForm.first_name || !clientForm.last_name) {
      toast({
        title: "Dados incompletos",
        description: "Preencha pelo menos o nome do cliente.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('CONTRATO DE VIAGEM', 105, 30, { align: 'center' });
    doc.text('RODA BEM TURISMO', 105, 40, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('DADOS DO CLIENTE:', 20, 60);
    doc.text(`Nome: ${clientForm.first_name} ${clientForm.last_name}`, 20, 70);
    doc.text(`Email: ${clientForm.email}`, 20, 80);
    doc.text(`Telefone: ${clientForm.phone}`, 20, 90);
    doc.text(`Destino: ${clientForm.destination}`, 20, 100);
    doc.text(`Data da Viagem: ${clientForm.travel_date}`, 20, 110);
    
    doc.text('TERMOS E CONDIÇÕES:', 20, 130);
    doc.text('1. Este contrato garante a reserva da viagem conforme especificado.', 20, 140);
    doc.text('2. O pagamento deve ser realizado conforme cronograma acordado.', 20, 150);
    doc.text('3. Alterações estão sujeitas a taxas conforme política da empresa.', 20, 160);
    
    doc.text('Data do contrato: ' + new Date().toLocaleDateString('pt-BR'), 20, 180);
    doc.text('Assinatura: _________________________', 20, 200);
    
    doc.save(`contrato_${clientForm.first_name}_${clientForm.last_name}.pdf`);
    
    toast({
      title: "Contrato gerado!",
      description: "O PDF foi baixado automaticamente.",
    });
  };

  const handleGenerateReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('RELATÓRIO MENSAL', 105, 30, { align: 'center' });
    doc.text('RODA BEM TURISMO', 105, 40, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('ESTATÍSTICAS:', 20, 60);
    doc.text(`Total de Clientes: ${clients.length}`, 20, 70);
    doc.text(`Embarques Pendentes: ${departures.filter(d => d.status !== 'departed').length}`, 20, 80);
    doc.text(`Receita Estimada: R$ ${(clients.length * 3500).toLocaleString()}`, 20, 90);
    
    doc.text('LISTA DE CLIENTES:', 20, 110);
    clients.forEach((client, index) => {
      const y = 120 + (index * 10);
      if (y < 280) {
        doc.text(`${index + 1}. ${client.first_name} ${client.last_name} - ${client.destination}`, 20, y);
      }
    });
    
    doc.save(`relatorio_mensal_${new Date().toISOString().slice(0, 7)}.pdf`);
    
    toast({
      title: "Relatório gerado!",
      description: "O PDF foi baixado automaticamente.",
    });
  };

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cpf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'departed':
        return <Badge className="bg-blue-100 text-blue-800">Embarcado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-800">Parcial</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = [
    {
      title: "Total de Clientes",
      value: clients.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Embarques Pendentes",
      value: departures.filter(d => d.status !== 'departed').length,
      icon: Plane,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Destinos Ativos",
      value: new Set(clients.map(c => c.destination)).size,
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Receita Total",
      value: `R$ ${clients.reduce((sum, client) => sum + client.price, 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Roda Bem Turismo</h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-md ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                data-testid="nav-dashboard"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-4 py-2 rounded-md ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                data-testid="nav-clients"
              >
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('departures')}
                className={`px-4 py-2 rounded-md ${activeTab === 'departures' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                data-testid="nav-departures"
              >
                Embarques
              </button>
              <button
                onClick={() => setActiveTab('add-client')}
                className={`px-4 py-2 rounded-md ${activeTab === 'add-client' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                data-testid="nav-add-client"
              >
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-1">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-1">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600">Visão geral dos dados de clientes e viagens</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} data-testid={`stat-card-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-full`}>
                        <stat.icon className={`${stat.color} h-6 w-6`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => setActiveTab('add-client')}
                    className="w-full"
                    data-testid="quick-add-client"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Cliente
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleGenerateReport}
                    className="w-full"
                    data-testid="quick-generate-report"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clientes Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clients.slice(0, 3).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{client.first_name} {client.last_name}</p>
                          <p className="text-sm text-gray-600">{client.destination}</p>
                        </div>
                        {getStatusBadge(client.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Clients */}
        {activeTab === 'clients' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Gestão de Clientes</h2>
                <p className="text-gray-600">Gerencie todos os seus clientes de viagem</p>
              </div>
              <Button onClick={() => setActiveTab('add-client')} data-testid="button-new-client">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome ou destino..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="search-clients"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Cliente</th>
                        <th className="text-left py-3 px-4">CPF</th>
                        <th className="text-left py-3 px-4">Contato</th>
                        <th className="text-left py-3 px-4">Destino</th>
                        <th className="text-left py-3 px-4">Preço</th>
                        <th className="text-left py-3 px-4">Pagamento</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="border-b hover:bg-gray-50" data-testid={`client-row-${client.id}`}>
                          <td className="py-3 px-4">
                            <div className="font-medium">{client.first_name} {client.last_name}</div>
                            <div className="text-sm text-gray-500">{client.travelers_count} viajante{client.travelers_count > 1 ? 's' : ''} • {client.duration} dias</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-mono">{client.cpf}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">{client.phone}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{client.destination}</div>
                            <div className="text-sm text-gray-500">{client.travel_date}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-green-600">R$ {client.price.toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-4">{getPaymentBadge(client.payment_status)}</td>
                          <td className="py-3 px-4">{getStatusBadge(client.status)}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClient(client)}
                                data-testid={`edit-client-${client.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClient(client.id)}
                                data-testid={`delete-client-${client.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add/Edit Client */}
        {activeTab === 'add-client' && (
          <div className="space-y-1">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <p className="text-gray-600">
                {isEditing ? 'Edite as informações do cliente' : 'Cadastre um novo cliente no sistema'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nome *</Label>
                    <Input
                      id="first_name"
                      value={clientForm.first_name}
                      onChange={(e) => setClientForm(prev => ({...prev, first_name: e.target.value}))}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Sobrenome *</Label>
                    <Input
                      id="last_name"
                      value={clientForm.last_name}
                      onChange={(e) => setClientForm(prev => ({...prev, last_name: e.target.value}))}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm(prev => ({...prev, email: e.target.value}))}
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm(prev => ({...prev, phone: e.target.value}))}
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={clientForm.cpf}
                      onChange={(e) => setClientForm(prev => ({...prev, cpf: formatCPF(e.target.value)}))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      data-testid="input-cpf"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rg">RG (opcional)</Label>
                    <Input
                      id="rg"
                      value={clientForm.rg}
                      onChange={(e) => setClientForm(prev => ({...prev, rg: e.target.value}))}
                      placeholder="12.345.678-9"
                      data-testid="input-rg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="destination">Destino *</Label>
                    <Select 
                      value={clientForm.destination} 
                      onValueChange={(value) => {
                        setClientForm(prev => ({...prev, destination: value}));
                        updatePrice(value);
                      }}
                    >
                      <SelectTrigger data-testid="select-destination">
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="px-2 py-2 text-sm font-semibold text-gray-500">Europa</div>
                        {Object.entries(destinations).filter(([dest]) => dest.includes('França') || dest.includes('Reino Unido') || dest.includes('Itália') || dest.includes('Espanha') || dest.includes('Holanda') || dest.includes('Portugal') || dest.includes('Alemanha') || dest.includes('Áustria') || dest.includes('República Tcheca') || dest.includes('Irlanda') || dest.includes('Suíça') || dest.includes('Suécia') || dest.includes('Finlândia') || dest.includes('Rússia')).map(([dest, price]) => (
                          <SelectItem key={dest} value={dest}>{dest} - R$ {price.toLocaleString()}</SelectItem>
                        ))}
                        <div className="px-2 py-2 text-sm font-semibold text-gray-500">Américas</div>
                        {Object.entries(destinations).filter(([dest]) => dest.includes('EUA') || dest.includes('Canadá') || dest.includes('Argentina') || dest.includes('Chile') || dest.includes('Peru') || dest.includes('Colômbia') || dest.includes('México')).map(([dest, price]) => (
                          <SelectItem key={dest} value={dest}>{dest} - R$ {price.toLocaleString()}</SelectItem>
                        ))}
                        <div className="px-2 py-2 text-sm font-semibold text-gray-500">Ásia</div>
                        {Object.entries(destinations).filter(([dest]) => dest.includes('Japão') || dest.includes('Coreia') || dest.includes('China') || dest.includes('Tailândia') || dest.includes('Singapura') || dest.includes('Emirados') || dest.includes('Índia') || dest.includes('Filipinas')).map(([dest, price]) => (
                          <SelectItem key={dest} value={dest}>{dest} - R$ {price.toLocaleString()}</SelectItem>
                        ))}
                        <div className="px-2 py-2 text-sm font-semibold text-gray-500">Oceania & África</div>
                        {Object.entries(destinations).filter(([dest]) => dest.includes('Austrália') || dest.includes('Nova Zelândia') || dest.includes('África') || dest.includes('Egito') || dest.includes('Marrocos') || dest.includes('Quênia')).map(([dest, price]) => (
                          <SelectItem key={dest} value={dest}>{dest} - R$ {price.toLocaleString()}</SelectItem>
                        ))}
                        <div className="px-2 py-2 text-sm font-semibold text-gray-500">Nacional</div>
                        {Object.entries(destinations).filter(([dest]) => dest.includes('PE') || dest.includes('RS') || dest.includes('SP') || dest.includes('MS') || dest.includes('CE') || dest.includes('RJ') || dest.includes('SC') || dest.includes('BA') || dest.includes('PR') || dest.includes('AM') || dest.includes('MA')).map(([dest, price]) => (
                          <SelectItem key={dest} value={dest}>{dest} - R$ {price.toLocaleString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="travel_date">Data da Viagem</Label>
                    <Input
                      id="travel_date"
                      type="date"
                      value={clientForm.travel_date}
                      onChange={(e) => setClientForm(prev => ({...prev, travel_date: e.target.value}))}
                      data-testid="input-travel-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="duration">Duração (dias)</Label>
                    <Select 
                      value={clientForm.duration.toString()} 
                      onValueChange={(value) => setClientForm(prev => ({...prev, duration: parseInt(value)}))}
                    >
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 dias</SelectItem>
                        <SelectItem value="5">5 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="10">10 dias</SelectItem>
                        <SelectItem value="14">14 dias</SelectItem>
                        <SelectItem value="21">21 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="travelers_count">Viajantes</Label>
                    <Select 
                      value={clientForm.travelers_count.toString()} 
                      onValueChange={(value) => {
                        const newCount = parseInt(value);
                        setClientForm(prev => ({...prev, travelers_count: newCount}));
                        if (clientForm.destination) updatePrice(clientForm.destination);
                      }}
                    >
                      <SelectTrigger data-testid="select-travelers">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} pessoa{num > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_status">Status do Pagamento</Label>
                    <Select 
                      value={clientForm.payment_status} 
                      onValueChange={(value) => setClientForm(prev => ({...prev, payment_status: value as any}))}
                    >
                      <SelectTrigger data-testid="select-payment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {clientForm.price > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-800">
                      Preço Total: R$ {clientForm.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">
                      {clientForm.travelers_count} viajante{clientForm.travelers_count > 1 ? 's' : ''} × R$ {(clientForm.price / clientForm.travelers_count).toLocaleString()} por pessoa
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
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
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveTab('clients');
                        setIsEditing(false);
                        setEditingId(null);
                        setClientForm({
                          first_name: '',
                          last_name: '',
                          email: '',
                          phone: '',
                          cpf: '',
                          rg: '',
                          destination: '',
                          travel_date: '',
                          duration: 7,
                          travelers_count: 1,
                          price: 0,
                          payment_status: 'pending',
                        });
                      }}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmitClient}
                      data-testid="button-save-client"
                    >
                      {isEditing ? 'Atualizar' : 'Salvar'} Cliente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Departures */}
        {activeTab === 'departures' && (
          <div className="space-y-1">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Gestão de Embarques</h2>
              <p className="text-gray-600">Gerencie todos os embarques e partidas</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Embarques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Cliente</th>
                        <th className="text-left py-3 px-4">Destino</th>
                        <th className="text-left py-3 px-4">Data Embarque</th>
                        <th className="text-left py-3 px-4">Viajantes</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departures.map((departure) => (
                        <tr key={departure.id} className="border-b hover:bg-gray-50" data-testid={`departure-row-${departure.id}`}>
                          <td className="py-3 px-4 font-medium">{departure.client_name}</td>
                          <td className="py-3 px-4">{departure.destination}</td>
                          <td className="py-3 px-4">{departure.departure_date}</td>
                          <td className="py-3 px-4">{departure.travelers_count} pessoa{departure.travelers_count !== 1 ? 's' : ''}</td>
                          <td className="py-3 px-4">{getStatusBadge(departure.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relatórios</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleGenerateReport}
                  data-testid="button-generate-monthly-report"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Gerar Relatório Mensal
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}