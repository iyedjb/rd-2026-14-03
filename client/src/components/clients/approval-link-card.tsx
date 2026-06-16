import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link, Check, ExternalLink, QrCode, Share2, RefreshCw, Eye, EyeOff, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import type { Client } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApprovalLinkCardProps {
  client: Client;
  onRegenerateLink?: () => void;
  isRegenerating?: boolean;
}

export function ApprovalLinkCard({ client, onRegenerateLink, isRegenerating }: ApprovalLinkCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);
  const { toast } = useToast();

  const approvalLink = client.approval_token 
    ? `${window.location.origin}/approve/${client.approval_token}`
    : '';

  useEffect(() => {
    if (approvalLink) {
      QRCode.toDataURL(approvalLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [approvalLink]);

  const handleCopyLink = async () => {
    try {
      // Try modern clipboard API first (requires HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(approvalLink);
      } else {
        // Fallback for HTTP: use textarea + execCommand
        const textArea = document.createElement('textarea');
        textArea.value = approvalLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!success) {
          throw new Error('execCommand failed');
        }
      }
      setLinkCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link de aprovação foi copiado para a área de transferência.",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Aprovação de Viagem - ${client.first_name} ${client.last_name}`,
          text: `Olá ${client.first_name}! Por favor, acesse o link abaixo para visualizar e aprovar os detalhes da sua viagem para ${client.destination}:`,
          url: approvalLink,
        });
        toast({
          title: "Link compartilhado!",
          description: "O link foi compartilhado com sucesso.",
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const isExpired = client.approval_expires_at && new Date(client.approval_expires_at) < new Date();
  const linkOpenedAt = (client as any).link_opened_at;
  const hasOpenedLink = !!linkOpenedAt;

  const formatLinkOpenedDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Link className="h-5 w-5" />
          Link de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link Open Status */}
        <div className={`p-3 rounded-lg border ${hasOpenedLink ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
          <div className="flex items-center gap-3">
            {hasOpenedLink ? (
              <>
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Cliente visualizou o link
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatLinkOpenedDate(linkOpenedAt)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <EyeOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Cliente ainda não abriu o link
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Aguardando visualização...
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {isExpired ? (
            <span className="text-destructive font-medium">
              Link expirado! Gere um novo link para enviar ao cliente.
            </span>
          ) : (
            <>
              Envie este link para <strong>{client.first_name} {client.last_name}</strong> para que ele possa visualizar e aprovar os detalhes da viagem.
            </>
          )}
        </p>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={approvalLink}
              readOnly
              className="font-mono text-sm break-all"
              data-testid="input-approval-link"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyLink}
              className="flex-shrink-0"
              data-testid="button-copy-link"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  <span className="text-xs">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  <span className="text-xs">Copiar</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleShareLink}
              className="w-full"
              data-testid="button-share-link"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowQrCode(!showQrCode)}
              className="w-full"
              data-testid="button-toggle-qr"
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            {onRegenerateLink && (
              <Button
                variant="outline"
                onClick={onRegenerateLink}
                disabled={isRegenerating}
                className="w-full col-span-2 sm:col-span-1"
                data-testid="button-regenerate-link"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Gerando...' : 'Gerar Novo'}
              </Button>
            )}
          </div>
        </div>

        {showQrCode && qrCodeUrl && (
          <div className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center space-y-2">
              <img 
                src={qrCodeUrl} 
                alt="QR Code do Link de Aprovação" 
                className="mx-auto"
                data-testid="qr-code-image"
              />
              <p className="text-xs text-muted-foreground">
                Escaneie com a câmera do celular
              </p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Como funciona:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• O cliente acessará seus dados de viagem através do link</li>
                <li>• Ele poderá visualizar todos os detalhes e condições</li>
                <li>• Ao aprovar, receberá automaticamente o PDF do contrato</li>
                <li>• O link expira em 72 horas a partir da criação</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


