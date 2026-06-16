import { useRoute, useLocation } from "wouter";
import { ClientForm } from "@/components/clients/client-form";
import { useUpdateClient, useRegenerateApprovalLink, useClient } from "@/hooks/use-clients";
import { ApprovalLinkCard } from "@/components/clients/approval-link-card";
import { SeatEditor } from "@/components/clients/seat-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/validation";

export default function EditClient() {
  const [, params] = useRoute("/clients/:id/edit");
  const [, setLocation] = useLocation();
  const updateClient = useUpdateClient();
  const regenerateLink = useRegenerateApprovalLink();
  
  const clientId = params?.id || '';
  
  // Fetch the client data with children for editing
  const { data: client, isLoading: isLoadingClient, error } = useClient(clientId);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Erro</h2>
          <p className="text-muted-foreground">Cliente não encontrado.</p>
          <button 
            onClick={() => setLocation("/clients")}
            className="mt-4 text-primary hover:underline"
          >
            Voltar para lista de clientes
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingClient) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: any) => {
    if (!clientId) return;
    
    updateClient.mutate({ id: clientId, data }, {
      onSuccess: () => {
        setLocation("/clients");
      },
    });
  };

  const handleCancel = () => {
    setLocation("/clients");
  };

  const handleRegenerateLink = () => {
    if (clientId) {
      regenerateLink.mutate(clientId);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {client && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Data de Criação</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {client.created_at ? formatDate(client.created_at) : 'Não informado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Criado por</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {(client as any).created_by_name || (client as any).created_by_email || 'Sistema'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {client && (
        <ApprovalLinkCard 
          client={client} 
          onRegenerateLink={handleRegenerateLink}
          isRegenerating={regenerateLink.isPending}
        />
      )}
      {client && 'children' in client && (
        <SeatEditor 
          client={client}
          children={(client as any).children || []}
        />
      )}
      <ClientForm
        client={client}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateClient.isPending}
      />
    </div>
  );
}