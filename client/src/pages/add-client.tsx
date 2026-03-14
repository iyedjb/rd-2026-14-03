import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClientForm } from "@/components/clients/client-form";
import { useCreateClient } from "@/hooks/use-clients";
import { useTutorial } from "@/contexts/TutorialContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Link, Check, ExternalLink, QrCode, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import QRCode from "qrcode";

export default function AddClient() {
  const [, setLocation] = useLocation();
  const { activeStep, completeTutorialStep } = useTutorial();
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);
  const createClient = useCreateClient();
  const { toast } = useToast();

  const [prefilledClient, setPrefilledClient] = useState<Client | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('prefilledClient');
    if (stored) {
      try {
        const client = JSON.parse(stored);
        
        // Convert ISO strings back to Date objects
        if (client.birthdate && typeof client.birthdate === 'string') {
          client.birthdate = new Date(client.birthdate);
        }
        
        // Convert children birthdates from ISO strings back to Date objects
        if (client.children && Array.isArray(client.children)) {
          client.children = client.children.map((child: any) => ({
            ...child,
            birthdate: child.birthdate && typeof child.birthdate === 'string' 
              ? new Date(child.birthdate)
              : child.birthdate
          }));
        }
        
        console.log('✅ Parsed prefilledClient from sessionStorage:', client);
        console.log('✅ Children in parsed client:', client.children);
        setPrefilledClient(client);
        sessionStorage.removeItem('prefilledClient');
      } catch (error) {
        console.error('Error parsing prefilled client:', error);
      }
    }
  }, []);

  const approvalLink = createdClient?.approval_token 
    ? `${window.location.origin}/approve/${createdClient.approval_token}`
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

  const handleSubmit = (data: any) => {
    createClient.mutate(data, {
      onSuccess: (client: Client) => {
        setCreatedClient(client);
        if (activeStep === 'add-client') {
          setTimeout(() => {
            completeTutorialStep('add-client');
          }, 500);
        }
      },
    });
  };

  const handleCancel = () => {
    setLocation("/clients");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(approvalLink);
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
          title: `Aprovação de Viagem - ${createdClient?.first_name} ${createdClient?.last_name}`,
          text: `Olá ${createdClient?.first_name}! Por favor, acesse o link abaixo para visualizar e aprovar os detalhes da sua viagem para ${createdClient?.destination}:`,
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

  const handleContinue = () => {
    setCreatedClient(null);
    setLocation("/clients");
  };

  return (
    <>
      <ClientForm
        client={prefilledClient || undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={createClient.isPending}
      />

      <Dialog open={!!createdClient} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Cliente criado com sucesso!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Link de Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Envie este link para <strong>{createdClient?.first_name} {createdClient?.last_name}</strong> para que ele possa visualizar e aprovar os detalhes da viagem:
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={approvalLink}
                    readOnly
                    className="font-mono text-sm flex-1"
                    data-testid="input-approval-link"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="flex-1 sm:flex-initial"
                      data-testid="button-copy-link"
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareLink}
                      className="flex-1 sm:flex-initial"
                      data-testid="button-share-link"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="flex-1 sm:flex-initial"
                      data-testid="button-toggle-qr"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
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
                        <li>• O link expira em 7 dias a partir da criação</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleContinue} data-testid="button-continue">
                Continuar para Lista de Clientes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
