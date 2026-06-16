import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { generateTravelContract } from "@/lib/pdf-generator";
import type { Client } from "@shared/schema";

interface ApprovalData {
  client: Client;
  valid: boolean;
  expired: boolean;
  already_approved: boolean;
}

export default function PdfDownload() {
  const { token } = useParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { data: approvalData, isLoading, error } = useQuery<ApprovalData>({
    queryKey: ["api/approve", token],
    queryFn: async () => {
      const response = await fetch(`/api/approve/${token}`);
      if (!response.ok) {
        throw new Error('Token de aprovação inválido ou expirado');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const handleGeneratePdf = async () => {
    if (!approvalData?.client) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Get the full client with children if possible, though approvalData should have what we need
      const clientWithChildren = {
        ...approvalData.client,
        children: (approvalData.client as any).children || []
      };
      await generateTravelContract(clientWithChildren);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setGenerationError('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate PDF on load if client is approved
  useEffect(() => {
    if (approvalData?.client && approvalData.already_approved && !hasGenerated && !isGenerating) {
      handleGeneratePdf();
    }
  }, [approvalData, hasGenerated, isGenerating]);

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

  // Allow access if client exists and is already approved, regardless of valid/expired status
  // This handles the case where user comes here after seat selection
  if (error || !approvalData || !approvalData.client || (!approvalData.already_approved && !approvalData.valid)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl shadow-2xl border-2 border-green-200 dark:border-green-800">
          <CardContent className="p-12">
            <div className="text-center">
              <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6 animate-bounce" />
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Obrigado por Escolher a Roda Bem Turismo!
              </h1>
              
              <div className="space-y-4 mb-8">
                <p className="text-xl text-gray-700 dark:text-gray-300 font-medium">
                  Thanks for choosing us as your company 😊
                </p>
                
                <p className="text-2xl text-green-600 dark:text-green-400 font-semibold italic">
                  Your comfort is our priority!
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Seus assentos foram reservados com sucesso! ✨
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Este link expirou. Entre em contato conosco se precisar de uma nova cópia do contrato.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client = approvalData.client;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="text-center">
            {hasGenerated ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Contrato Gerado com Sucesso!
                </h1>
                <p className="text-muted-foreground mb-6">
                  O download do seu contrato foi iniciado automaticamente.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  <strong>{client.first_name} {client.last_name}</strong><br />
                  Destino: <strong>{client.destination}</strong>
                </p>
                <Button 
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  variant="outline"
                  data-testid="button-regenerate-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Novamente
                </Button>
              </>
            ) : (
              <>
                <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {isGenerating ? 'Gerando Contrato...' : 'Contrato de Viagem'}
                </h1>
                <p className="text-muted-foreground mb-6">
                  {isGenerating 
                    ? 'Aguarde enquanto preparamos seu contrato...' 
                    : 'Clique no botão abaixo para gerar e baixar seu contrato de viagem.'
                  }
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  <strong>{client.first_name} {client.last_name}</strong><br />
                  Destino: <strong>{client.destination}</strong>
                </p>
                
                {generationError && (
                  <Alert className="mb-6">
                    <AlertDescription className="text-red-600">
                      {generationError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleGeneratePdf}
                  disabled={isGenerating}
                  size="lg"
                  data-testid="button-generate-pdf"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Gerar e Baixar Contrato
                    </>
                  )}
                </Button>
              </>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground">
                Você pode fechar esta janela após o download.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}