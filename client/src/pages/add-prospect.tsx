import { useState } from "react";
import { useLocation } from "wouter";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { useCreateProspect } from "@/hooks/use-prospects";
import { useTutorial } from "@/contexts/TutorialContext";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, UserPlus, ArrowRight } from "lucide-react";
import type { InsertProspect, Prospect } from "@/types";

export default function AddProspect() {
  const [, setLocation] = useLocation();
  const { activeStep, completeTutorialStep } = useTutorial();
  const [createdProspect, setCreatedProspect] = useState<Prospect | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const createProspect = useCreateProspect();

  const handleSubmit = (data: InsertProspect) => {
    createProspect.mutate(data, {
      onSuccess: (prospect: Prospect) => {
        setCreatedProspect(prospect);
        setShowSuccessDialog(true);
        if (activeStep === 'add-prospect') {
          setTimeout(() => {
            completeTutorialStep('add-prospect');
          }, 500);
        }
      },
    });
  };

  const handleCancel = () => {
    setLocation("/prospects");
  };

  const handleCloseDialog = () => {
    setShowSuccessDialog(false);
    setLocation("/prospects");
  };

  const handleConvertToClient = () => {
    if (createdProspect) {
      sessionStorage.setItem('prefilledClient', JSON.stringify({
        first_name: createdProspect.first_name,
        last_name: createdProspect.last_name,
        cpf: createdProspect.cpf,
        rg: createdProspect.rg,
        birthdate: createdProspect.birthdate,
        civil_status: createdProspect.civil_status,
        spouse_name: createdProspect.spouse_name,
        nationality: createdProspect.nationality,
        gender: createdProspect.gender,
        phone: createdProspect.phone,
        phone_numbers: createdProspect.phone_numbers,
        email: createdProspect.email,
        profession: createdProspect.profession,
        address: createdProspect.address,
        city: createdProspect.city,
        state: createdProspect.state,
        postal_code: createdProspect.postal_code,
      }));
      setShowSuccessDialog(false);
      setLocation("/clients/new");
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Novo Cadastro
          </h2>
          <p className="text-muted-foreground">
            Cadastre um novo cliente interessado
          </p>
        </div>

        <ProspectForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createProspect.isPending}
        />
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              Cadastro Realizado!
            </DialogTitle>
            <DialogDescription>
              O cliente interessado foi cadastrado com sucesso no sistema.
            </DialogDescription>
          </DialogHeader>

          {createdProspect && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  {createdProspect.first_name} {createdProspect.last_name}
                </h3>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p>CPF: {createdProspect.cpf}</p>
                  <p>Telefone: {createdProspect.phone}</p>
                  {createdProspect.interested_destinations && createdProspect.interested_destinations.length > 0 && (
                    <p>Interesse: {createdProspect.interested_destinations.join(', ')}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  onClick={handleConvertToClient}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  data-testid="button-convert-to-client"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Contrato (Converter em Cliente)
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleCloseDialog} 
                  className="w-full rounded-xl"
                  data-testid="button-close-dialog"
                >
                  Finalizar e Voltar à Lista
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
