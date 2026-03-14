import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Bell, Check, X } from 'lucide-react';

interface DiscountApprovalRequest {
  id: string;
  client_name: string;
  client_destination: string;
  amount_client_will_pay: number;
  requested_discount_percentage: number;
  admin_name: string;
  admin_email: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function DiscountApprovalNotification() {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<DiscountApprovalRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<DiscountApprovalRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Only show for vadmins
  if ((user as any)?.role !== 'vadmin') {
    return null;
  }

  // Fetch pending approvals on mount
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const response = await apiRequest('GET', '/api/discount-approvals/pending');
        const pending = await response.json();
        if (Array.isArray(pending) && pending.length > 0) {
          setPendingRequests(pending);
          setCurrentRequest(pending[0]);
          setMaxDiscountPercentage(pending[0].requested_discount_percentage.toString());
          setIsDialogOpen(true);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      }
    };

    fetchPendingApprovals();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'discount_approval_request') {
        const request = message.data as DiscountApprovalRequest;
        setPendingRequests(prev => [...prev, request]);
        setCurrentRequest(request);
        setIsDialogOpen(true);
        setMaxDiscountPercentage(request.requested_discount_percentage.toString());

        toast({
          title: "Nova Solicitação de Desconto",
          description: `${request.admin_name} solicitou desconto personalizado para ${request.client_name}`,
        });
      }
    });

    return unsubscribe;
  }, [subscribe, toast]);

  const handleApprove = async () => {
    if (!currentRequest || !maxDiscountPercentage) return;

    const maxPercentage = parseFloat(maxDiscountPercentage);
    if (isNaN(maxPercentage) || maxPercentage < 0 || maxPercentage > 100) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma porcentagem válida entre 0 e 100",
        variant: "destructive",
      });
      return;
    }

    if (maxPercentage < currentRequest.requested_discount_percentage) {
      toast({
        title: "Atenção",
        description: "O desconto máximo não pode ser menor que o solicitado",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await apiRequest('PATCH', `/api/discount-approvals/${currentRequest.id}/approve`, {
        max_discount_percentage_allowed: maxPercentage,
      });

      toast({
        title: "Aprovado",
        description: `Desconto aprovado para ${currentRequest.client_name}`,
      });

      setPendingRequests(prev => prev.filter(r => r.id !== currentRequest.id));
      setIsDialogOpen(false);
      setCurrentRequest(null);
      setShowApproveForm(false);
      setMaxDiscountPercentage('');
      queryClient.invalidateQueries({ queryKey: ['/api/discount-approvals/pending'] });
    } catch (error) {
      console.error('Error approving discount:', error);
      toast({
        title: "Erro",
        description: "Falha ao aprovar desconto",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!currentRequest) return;

    setIsProcessing(true);
    try {
      await apiRequest('PATCH', `/api/discount-approvals/${currentRequest.id}/reject`, {
        reason: rejectionReason || 'Desconto não aprovado',
      });

      toast({
        title: "Rejeitado",
        description: `Solicitação de desconto rejeitada para ${currentRequest.client_name}`,
      });

      setPendingRequests(prev => prev.filter(r => r.id !== currentRequest.id));
      setIsDialogOpen(false);
      setCurrentRequest(null);
      setShowRejectForm(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/discount-approvals/pending'] });
    } catch (error) {
      console.error('Error rejecting discount:', error);
      toast({
        title: "Erro",
        description: "Falha ao rejeitar desconto",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (pendingRequests.length > 1) {
      const nextRequest = pendingRequests.find(r => r.id !== currentRequest?.id);
      if (nextRequest) {
        setCurrentRequest(nextRequest);
        setMaxDiscountPercentage(nextRequest.requested_discount_percentage.toString());
        setShowApproveForm(false);
        setShowRejectForm(false);
        return;
      }
    }
    
    setIsDialogOpen(false);
    setCurrentRequest(null);
    setShowApproveForm(false);
    setShowRejectForm(false);
    setMaxDiscountPercentage('');
    setRejectionReason('');
  };

  if (!currentRequest) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-discount-approval">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            <DialogTitle data-testid="text-dialog-title">Solicitação de Desconto Personalizado</DialogTitle>
          </div>
          <DialogDescription data-testid="text-dialog-description">
            {pendingRequests.length > 1 && (
              <span className="text-sm text-muted-foreground">
                {pendingRequests.length} solicitações pendentes
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" data-testid="container-request-details">
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Admin:</span> {currentRequest.admin_name}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Cliente:</span> {currentRequest.client_name}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Destino:</span> {currentRequest.client_destination}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Valor a Pagar:</span>{' '}
              R$ {currentRequest.amount_client_will_pay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Desconto Solicitado:</span> {currentRequest.requested_discount_percentage}%
            </p>
          </div>

          {showApproveForm && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="max-discount" data-testid="label-max-discount">
                  Limite Máximo de Desconto (%)
                </Label>
                <Input
                  id="max-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={maxDiscountPercentage}
                  onChange={(e) => setMaxDiscountPercentage(e.target.value)}
                  placeholder="Ex: 10"
                  disabled={isProcessing}
                  data-testid="input-max-discount"
                />
                <p className="text-xs text-muted-foreground">
                  O admin não poderá aplicar desconto maior que este valor
                </p>
              </div>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" data-testid="label-rejection-reason">
                  Motivo da Rejeição (Opcional)
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Desconto muito alto para este destino"
                  disabled={isProcessing}
                  data-testid="textarea-rejection-reason"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showApproveForm && !showRejectForm && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                data-testid="button-show-reject"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button
                onClick={() => setShowApproveForm(true)}
                disabled={isProcessing}
                data-testid="button-show-approve"
              >
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}

          {showApproveForm && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveForm(false);
                  setMaxDiscountPercentage(currentRequest.requested_discount_percentage.toString());
                }}
                disabled={isProcessing}
                data-testid="button-cancel-approve"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing || !maxDiscountPercentage}
                data-testid="button-confirm-approve"
              >
                {isProcessing ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
            </>
          )}

          {showRejectForm && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
                disabled={isProcessing}
                data-testid="button-cancel-reject"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
                data-testid="button-confirm-reject"
              >
                {isProcessing ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
