import { useLocation } from "wouter";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { useProspect, useUpdateProspect } from "@/hooks/use-prospects";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { UpdateProspect } from "@/types";

interface EditProspectProps {
  params: {
    id: string;
  };
}

export default function EditProspect({ params }: EditProspectProps) {
  const [, setLocation] = useLocation();
  const { data: prospect, isLoading: isLoadingProspect } = useProspect(params.id);
  const updateProspect = useUpdateProspect();

  const handleSubmit = (data: UpdateProspect) => {
    updateProspect.mutate(
      { id: params.id, data },
      {
        onSuccess: () => {
          setLocation("/prospects");
        },
      }
    );
  };

  const handleCancel = () => {
    setLocation("/prospects");
  };

  if (isLoadingProspect) {
    return (
      <div className="p-6 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Prospecto não encontrado</h2>
          <p className="text-muted-foreground mt-2">
            O prospecto que você está tentando editar não foi encontrado.
          </p>
          <button
            onClick={() => setLocation("/prospects")}
            className="mt-4 text-primary hover:underline"
          >
            Voltar para Envio de Propostas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Editar Prospecto</h2>
        <p className="text-muted-foreground">
          Atualize as informações do prospecto {prospect.first_name} {prospect.last_name}
        </p>
      </div>

      <ProspectForm
        mode="edit"
        initialData={prospect}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateProspect.isPending}
      />
    </div>
  );
}