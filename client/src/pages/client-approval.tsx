import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, MapPin, Users, Phone, Mail, FileText, CheckCircle, XCircle, Clock, Download, Eye, Armchair } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

interface ApprovalData {
  client: Client & { children?: Array<any> };
  valid: boolean;
  expired: boolean;
  already_approved: boolean;
}

export default function ClientApproval() {
  const { token } = useParams();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: approvalData, isLoading, error } = useQuery<ApprovalData>({
    queryKey: ["api/approve", token],
    queryFn: async () => {
      const response = await fetch(`/api/approve/${token}`);
      if (!response.ok) {
        throw new Error('Link de aprovação inválido ou expirado');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const response = await apiRequest('POST', `/api/approve/${token}`, {
        accepted: true,
        terms_accepted: termsAccepted,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Check if seat selection is available
      if (data.seat_selection_url) {
        toast({
          title: "Aprovação confirmada!",
          description: "Agora você será redirecionado para selecionar seu assento no ônibus.",
        });
        
        setTimeout(() => {
          window.location.href = data.seat_selection_url;
        }, 1500);
      } else if (data.pdf_url) {
        // No seat selection needed, go directly to PDF
        toast({
          title: "Aprovação confirmada!",
          description: "Redirecionando para o download do contrato...",
        });
        
        setTimeout(() => {
          window.location.href = data.pdf_url;
        }, 1500);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na aprovação",
        description: error.message || "Ocorreu um erro ao processar sua aprovação. Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleApproval = () => {
    if (!termsAccepted) {
      toast({
        title: "Termos não aceitos",
        description: "Por favor, aceite os termos e condições para continuar.",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando informações...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !approvalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Link Inválido
              </h1>
              <p className="text-muted-foreground mb-4">
                Este link de aprovação é inválido ou pode ter expirado.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com a agência de viagens para obter um novo link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check already_approved FIRST - approved clients have unlimited access
  if (approvalData.already_approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-2xl mx-2 sm:mx-auto">
          <CardContent className="p-4 sm:p-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Viagem Aprovada!
              </h1>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                Sua viagem já foi aprovada. Você pode acessar as opções abaixo:
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => window.location.href = `/seat-selection/${token}`}
                  className="w-full py-4 text-base"
                  data-testid="button-go-seat-selection"
                >
                  <Armchair className="h-5 w-5 mr-2" />
                  Selecionar Assento
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `/pdf/${token}`}
                  className="w-full py-4 text-base"
                  data-testid="button-go-pdf"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Baixar Contrato PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For non-approved clients, check if link has expired
  if (!approvalData.valid || approvalData.expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-2xl mx-2 sm:mx-auto">
          <CardContent className="p-4 sm:p-8">
            <div className="text-center">
              <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-orange-500 mx-auto mb-4" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Link Expirado
              </h1>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Este link de aprovação expirou e não é mais válido.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Entre em contato com a agência de viagens para obter um novo link de aprovação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client = approvalData.client;

  // Calculate total price including companions
  const calculateTotalPrice = () => {
    const basePrice = Number(client.travel_price ?? 0);
    const companionsTotal = (client.children || []).reduce((sum, child) => {
      return sum + Number(child.price ?? 0);
    }, 0);
    return basePrice + companionsTotal;
  };

  const totalPrice = calculateTotalPrice();

  // Format date safely without timezone issues
  const formatDateSafely = (dateInput: string | Date): string => {
    if (!dateInput) return 'Não informado';
    
    if (typeof dateInput === 'string') {
      // For ISO date strings (YYYY-MM-DD), split and format directly
      const parts = dateInput.split('T')[0].split('-'); // Handle both YYYY-MM-DD and ISO datetime
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    
    // Fallback for Date objects
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString('pt-BR');
    }
    
    return 'Não informado';
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string | undefined): string => {
    if (!method) return 'Não definido';
    
    const methods: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'crediario_agencia': 'Crediário da Agência',
      'credito_banco': 'Cartão de Crédito (Banco)',
      'boleto': 'Boleto Bancário'
    };
    
    return methods[method] || method;
  };

  const ContractPreview = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold">CONTRATO</h3>
        <p className="text-lg">De Prestação de Serviços de Turismo</p>
      </div>

      <Separator />

      {/* Contracting Party */}
      <div className="space-y-3">
        <h4 className="font-semibold text-green-700 bg-green-50 dark:bg-green-900/20 p-2 rounded">CONTRATANTE</h4>
        <div className="text-sm leading-relaxed">
          <p>
            <strong>{client.first_name} {client.last_name}</strong>, brasileiro(a), 
            {client.civil_status ? ` ${client.civil_status}` : ' estado civil não informado'}, 
            {client.profession ? ` ${client.profession}` : ' profissão não informada'}, 
            {client.birthdate ? ` nascido(a) em ${formatDateSafely(client.birthdate)}` : ''}, 
            portador do RG de n.º {client.rg || '(...)'}, 
            inscrito no CPF sob o n.º {client.cpf || '(...)'}, 
            telefone {client.phone || 'não informado'}, 
            e-mail {client.email || 'não informado'}, 
            residente e domiciliado à {client.address || '(endereço)'}, 
            {client.city || '(cidade)'}, {client.state || '(estado)'}, 
            CEP n.º {client.postal_code || '(...)'}.
          </p>
        </div>
      </div>

      {/* Service Provider */}
      <div className="space-y-3">
        <h4 className="font-semibold text-green-700 bg-green-50 dark:bg-green-900/20 p-2 rounded">CONTRATADA</h4>
        <div className="text-sm leading-relaxed">
          <p>
            <strong>RODA BEM TURISMO</strong>, pessoa jurídica de direito privado, 
            sediada à Rua Visconde de Caeté, n.º 44, no bairro Centro, 
            no município de Esmeraldas – MG, CEP n.º 35740-000, 
            inscrita no CNPJ sob o n.º 27.643.750/0019-0, 
            nesse ato representada por seu diretor Daniel de Paiva Rezende Oliveira.
          </p>
        </div>
      </div>

      {/* Travel Details */}
      <div className="space-y-3">
        <h4 className="font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">DETALHES DA VIAGEM</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><strong>Destino:</strong> {client.destination || 'Não informado'}</div>
          <div><strong>Data:</strong> {client.travel_date ? formatDateSafely(client.travel_date) : 'Não informada'}</div>
          <div><strong>Duração:</strong> {client.duration ? `${client.duration} dias` : 'Não informada'}</div>
          <div><strong>Preço Base (Cliente):</strong> {client.travel_price ? `R$ ${Number(client.travel_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}</div>
          {client.children && client.children.length > 0 && (
            <div><strong>Companhia ({client.children.length}):</strong> R$ {client.children.reduce((sum, child) => sum + Number(child.price ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          )}
          <div className="md:col-span-2"><strong>Preço Total:</strong> <span className="text-green-700 font-bold">R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>
        {client.inclusions && (
          <div className="text-sm">
            <strong>Incluso:</strong> {client.inclusions}
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="space-y-3">
        <h4 className="font-semibold text-purple-700 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">INFORMAÇÕES DE PAGAMENTO</h4>
        <div className="text-sm space-y-2">
          <div><strong>Forma de pagamento:</strong> {getPaymentMethodLabel(client.payment_method)}</div>
          {client.down_payment && client.down_payment > 0 && (
            <div><strong>Entrada:</strong> R$ {client.down_payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          )}
          {client.installments_count && client.installments_count > 0 && (
            <div><strong>Número de parcelas:</strong> {client.installments_count}</div>
          )}
          {client.installments_count && client.installments_count > 0 && client.down_payment !== undefined && (
            <div>
              <strong>Valor das parcelas:</strong> R$ {
                ((totalPrice - (client.down_payment || 0)) / client.installments_count)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
              }
            </div>
          )}
        </div>
      </div>

      {/* Companions */}
      {client.children && client.children.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-orange-700 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">ACOMPANHANTES</h4>
          <div className="space-y-4">
            {client.children.map((child, index) => (
              <div key={index} className="border rounded p-3 text-sm space-y-1">
                <div><strong>Nome:</strong> {child.name}</div>
                {child.birthdate && <div><strong>Data de nascimento:</strong> {formatDateSafely(child.birthdate)}</div>}
                {child.rg && <div><strong>RG:</strong> {child.rg}</div>}
                {child.cpf && <div><strong>CPF:</strong> {child.cpf}</div>}
                {child.phone && <div><strong>Telefone:</strong> {child.phone}</div>}
                {child.price !== undefined && child.price !== null && (
                  <div><strong>Preço:</strong> R$ {Number(child.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Terms */}
      <div className="space-y-3">
        <h4 className="font-semibold text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded">PRINCIPAIS TERMOS</h4>
        <div className="text-xs space-y-2">
          <p>• O Contratante poderá utilizar o pacote de viagem SOMENTE após a quitação de todas as parcelas pactuadas.</p>
          <p>• O atraso no pagamento sujeitará o contratante ao pagamento de multa de 2% sobre o valor da parcela, acrescido de juros moratórios de 1% por mês.</p>
          <p>• Em caso de atraso superior a 30 dias, ficará caracterizada a inadimplência contratual, dando motivo à rescisão do contrato.</p>
          <p>• O valor não inclui gorjetas, ingressos em pontos turísticos, taxas extras e despesas de caráter pessoal.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <Card className="mx-1 sm:mx-0">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Aprovação de Viagem
            </CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">
              Revise os detalhes da sua viagem e confirme sua aprovação
            </p>
          </CardHeader>
        </Card>

        {/* Client Information */}
        <Card className="mx-1 sm:mx-0">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-lg font-semibold" data-testid="text-client-name">
                  {client.first_name} {client.last_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="text-lg" data-testid="text-client-cpf">{client.cpf}</p>
              </div>
              {client.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span data-testid="text-client-email">{client.email}</span>
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span data-testid="text-client-phone">{client.phone}</span>
                </p>
              </div>
            </div>
            
            {client.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1" />
                  <span data-testid="text-client-address">{client.address}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Travel Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Detalhes da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.travel_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data da Viagem</label>
                <p className="text-lg" data-testid="text-travel-date">
                  {new Date(client.travel_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            
            {client.destination && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Destino</label>
                <p className="text-lg font-semibold" data-testid="text-destination">{client.destination}</p>
              </div>
            )}
            
            {client.duration && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duração</label>
                <Badge variant="secondary" data-testid="badge-duration">{client.duration} dias</Badge>
              </div>
            )}
            
            {client.inclusions && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Inclusions</label>
                <p className="text-sm" data-testid="text-inclusions">{client.inclusions}</p>
              </div>
            )}
            
            <div className="space-y-2">
              {client.travel_price && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preço Base (Cliente)</label>
                  <p className="text-base" data-testid="text-base-price">
                    R$ {Number(client.travel_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              
              {client.children && client.children.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Companhia ({client.children.length})</label>
                  <p className="text-base" data-testid="text-companions-price">
                    R$ {client.children.reduce((sum, child) => sum + Number(child.price ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-muted-foreground">Preço Total</label>
                <p className="text-2xl font-bold text-green-600" data-testid="text-travel-price">
                  R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Termos e Condições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Ao aprovar esta viagem, você confirma que:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Revisou e aprovou todos os detalhes apresentados</li>
                    <li>Concorda com os termos e condições da agência</li>
                    <li>Autoriza o processamento do pagamento conforme acordado</li>
                    <li>Entende as políticas de cancelamento e alteração</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                data-testid="checkbox-terms"
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Eu li, entendi e aceito todos os termos e condições desta viagem
              </label>
            </div>

            <Separator />

            <div className="flex justify-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-6 py-3"
                    data-testid="button-preview-contract"
                  >
                    <Eye className="h-5 w-5 mr-2" />
                    Ver Prévia do Contrato
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Prévia do Contrato de Viagem</DialogTitle>
                  </DialogHeader>
                  <ContractPreview />
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleApproval}
                disabled={!termsAccepted || isSubmitting}
                className="px-8 py-3 text-lg"
                data-testid="button-approve"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Aprovar Viagem
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
