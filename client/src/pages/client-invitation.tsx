import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { GuestRegistrationForm } from "@/components/clients/guest-registration-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InvitationLink, PublicInvitationSubmission } from "@shared/schema";

export default function ClientInvitation() {
  const { linkId } = useParams<{ linkId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitInvitation = useMutation({
    mutationFn: async (data: PublicInvitationSubmission) => {
      const response = await fetch(`/api/invitations/${linkId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit registration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar cadastro',
        description: error.message || 'Por favor, tente novamente ou entre em contato com o suporte.',
        variant: 'destructive',
      });
    },
  });

  const { data: link, isLoading, error } = useQuery<InvitationLink>({
    queryKey: [`/api/invitations/${linkId}`],
    enabled: !!linkId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !link) {
    const errorMessage = error && 'message' in error && typeof error.message === 'string' 
      ? error.message 
      : 'Este link de cadastro não é válido ou já expirou.';
    
    const isUsedLink = errorMessage.includes('already used') || errorMessage.includes('já foi usado');
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md border-red-200 dark:border-red-900">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isUsedLink ? 'Link Já Utilizado' : 'Link Inválido'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isUsedLink 
                ? 'Este link de cadastro já foi usado e não pode ser utilizado novamente. Cada link é válido para apenas um cadastro.'
                : 'Este link de cadastro não é válido ou já expirou. Entre em contato com seu gerente.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md border-green-200 dark:border-green-900">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Interesse Registrado!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Obrigado! Seu interesse foi registrado com sucesso. Nossa equipe entrará em contato em breve para apresentar uma proposta personalizada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Convite Exclusivo</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Complete Seu Cadastro</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Preencha o formulário abaixo para registrar seus dados de viagem
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <GuestRegistrationForm
              onSubmit={(data) => {
                submitInvitation.mutate(data);
              }}
              isLoading={submitInvitation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
