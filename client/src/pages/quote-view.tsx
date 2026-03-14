import { useState } from "react";
import { useQuote, useUpdateQuoteStatus } from "@/hooks/use-prospects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { formatDate } from "@/lib/validation";

interface QuoteViewProps {
  params: {
    token: string;
  };
}

export default function QuoteView({ params }: QuoteViewProps) {
  const { data: prospect, isLoading } = useQuote(params.token);
  const updateQuoteStatus = useUpdateQuoteStatus();
  const [hasInteracted, setHasInteracted] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, className: "bg-gray-100 text-gray-800", text: "Pendente" },
      viewed: { icon: Eye, className: "bg-blue-100 text-blue-800", text: "Visualizada" },
      accepted: { icon: CheckCircle, className: "bg-green-100 text-green-800", text: "Aceita" },
      rejected: { icon: XCircle, className: "bg-red-100 text-red-800", text: "Rejeitada" },
      expired: { icon: XCircle, className: "bg-orange-100 text-orange-800", text: "Expirada" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const handleStatusUpdate = (status: 'accepted' | 'rejected') => {
    if (!prospect || hasInteracted) return;
    
    setHasInteracted(true);
    updateQuoteStatus.mutate({ token: params.token, status });
  };

  const isExpired = prospect && new Date(prospect.quote_expires_at) < new Date();
  const canInteract = prospect && !hasInteracted && prospect.quote_status !== 'expired' && !isExpired;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-2">Cotação não encontrada</h2>
            <p className="text-muted-foreground">
              A cotação que você está procurando não existe ou pode ter expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Cotação de Viagem</CardTitle>
            <p className="text-muted-foreground">
              Olá {prospect.first_name} {prospect.last_name}, aqui está sua cotação personalizada
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status and Expiration */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground">Status: </span>
                {getStatusBadge(prospect.quote_status)}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Válida até:</p>
                <p className="font-medium">
                  {formatDate(prospect.quote_expires_at)}
                  {isExpired && <span className="text-destructive ml-2">(Expirada)</span>}
                </p>
              </div>
            </div>

            <Separator />

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Detalhes da Viagem</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Destino:</span>
                    <p className="font-medium capitalize">{prospect.destination}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Duração:</span>
                    <p className="font-medium">{prospect.duration} dias</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Número de pessoas:</span>
                    <p className="font-medium">{prospect.quantity} pessoa{prospect.quantity > 1 ? 's' : ''}</p>
                  </div>
                  {prospect.travel_date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Data da viagem:</span>
                      <p className="font-medium">{formatDate(prospect.travel_date)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Informações de Contato</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Nome:</span>
                    <p className="font-medium">{prospect.first_name} {prospect.last_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{prospect.phone}</p>
                  </div>
                  {prospect.email && (
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <p className="font-medium">{prospect.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Quote Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Detalhes da Cotação</h3>
              
              <div className="bg-primary/5 p-6 rounded-lg text-center mb-4">
                <p className="text-sm text-muted-foreground mb-2">Valor Total</p>
                <p className="text-4xl font-bold text-primary">{formatPrice(prospect.quote_price)}</p>
              </div>

              {prospect.quote_description && (
                <div>
                  <h4 className="font-medium mb-2">O que está incluído:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{prospect.quote_description}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            {canInteract ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Gostou da nossa cotação? Confirme sua decisão abaixo:
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleStatusUpdate('accepted')}
                    disabled={updateQuoteStatus.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-accept-quote"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aceitar Cotação
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updateQuoteStatus.isPending}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    data-testid="button-reject-quote"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar Cotação
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {isExpired && (
                  <p className="text-destructive">
                    Esta cotação expirou. Entre em contato conosco para uma nova cotação.
                  </p>
                )}
                {prospect.quote_status === 'accepted' && (
                  <p className="text-green-600 font-medium">
                    ✅ Cotação aceita! Entraremos em contato em breve.
                  </p>
                )}
                {prospect.quote_status === 'rejected' && (
                  <p className="text-red-600 font-medium">
                    ❌ Cotação rejeitada. Obrigado pelo seu tempo.
                  </p>
                )}
                {hasInteracted && updateQuoteStatus.isPending && (
                  <p className="text-blue-600">Atualizando status...</p>
                )}
              </div>
            )}

            <Separator />

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Dúvidas? Entre em contato conosco através do telefone ou email informado na cotação.
              </p>
              <p className="mt-2">
                Esta cotação foi gerada automaticamente pelo sistema de gestão de viagens.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}