import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle, Bus, FileText, DollarSign, UserCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/validation";

export default function SystemHealth() {
  const { data: clientsData, isLoading: loadingClients } = useQuery<any>({ queryKey: ["/api/clients"] });
  const { data: parcelas, isLoading: loadingParcelas } = useQuery<any[]>({ queryKey: ["/api/parcelas"] });

  const clients = clientsData?.clients || [];
  const isLoading = loadingClients || loadingParcelas;

  if (isLoading) {
    return <div className="p-8 text-center">Carregando verificação do sistema...</div>;
  }

  // 1. Pagamentos e Recebimentos (Parcelas atrasadas ou pendentes)
  const pendingParcelas = parcelas?.filter(p => !p.is_paid) || [];
  const overdueParcelas = pendingParcelas.filter(p => new Date(p.due_date) < new Date());

  // 2. Contratos não assinados (Approval links pendentes)
  const pendingApprovals = clients.filter((c: any) => c.approval_status === 'pending');

  // 3. Poltronas não escolhidas
  const missingSeats = clients.filter((c: any) => !c.seat_number && c.client_type === 'agencia');

  // 4. Contratos por dados (Data Quality)
  const incompleteData = clients.filter((c: any) => {
    return !c.cpf || !c.birthdate || !c.phone;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Rastreamento de Verificação</h1>
          </div>
          <Badge variant="outline" className="px-4 py-1 text-sm font-bold uppercase tracking-widest bg-white dark:bg-slate-900">
            Status Geral
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Payments Card */}
          <Card className="border-l-4 border-l-red-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter">
                <DollarSign className="h-4 w-4 text-red-500" />
                Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{overdueParcelas.length}</div>
              <p className="text-xs text-muted-foreground">Parcelas atrasadas</p>
            </CardContent>
          </Card>

          {/* Contracts Card */}
          <Card className="border-l-4 border-l-amber-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter">
                <FileText className="h-4 w-4 text-amber-500" />
                Contratos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{pendingApprovals.length}</div>
              <p className="text-xs text-muted-foreground">Aguardando assinatura</p>
            </CardContent>
          </Card>

          {/* Seats Card */}
          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter">
                <Bus className="h-4 w-4 text-blue-500" />
                Poltronas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{missingSeats.length}</div>
              <p className="text-xs text-muted-foreground">Sem assento definido</p>
            </CardContent>
          </Card>

          {/* Data Quality Card */}
          <Card className="border-l-4 border-l-purple-500 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter">
                <UserCheck className="h-4 w-4 text-purple-500" />
                Qualidade de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{incompleteData.length}</div>
              <p className="text-xs text-muted-foreground">Clientes com dados incompletos</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Detailed Pending List */}
          <Card className="rounded-[2rem] shadow-xl border-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black">Pendências Críticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
              {overdueParcelas.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{p.client_name}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">Parcela {p.installment_number} atrasada desde {formatDate(p.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-600">{formatCurrency(p.amount)}</p>
                  </div>
                </div>
              ))}
              {pendingApprovals.slice(0, 10).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Contrato pendente de assinatura</p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 text-amber-700">Pendente</Badge>
                </div>
              ))}
              {missingSeats.length === 0 && overdueParcelas.length === 0 && pendingApprovals.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma pendência crítica encontrada!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Checklist */}
          <Card className="rounded-[2rem] shadow-xl border-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black">Checklist de Verificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Financeiro</h3>
                <div className="flex items-center gap-3">
                  <div className={`h-2 flex-1 rounded-full ${overdueParcelas.length > 0 ? 'bg-red-200' : 'bg-emerald-200'}`}>
                    <div 
                      className={`h-full rounded-full ${overdueParcelas.length > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(0, 100 - (overdueParcelas.length * 5))}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold">{overdueParcelas.length === 0 ? 'LIMPO' : `${overdueParcelas.length} Pend.`}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Contratos</h3>
                <div className="flex items-center gap-3">
                  <div className={`h-2 flex-1 rounded-full ${pendingApprovals.length > 0 ? 'bg-amber-200' : 'bg-emerald-200'}`}>
                    <div 
                      className={`h-full rounded-full ${pendingApprovals.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(0, 100 - (pendingApprovals.length * 5))}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold">{pendingApprovals.length === 0 ? 'OK' : `${pendingApprovals.length} Pend.`}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Operacional (Poltronas)</h3>
                <div className="flex items-center gap-3">
                  <div className={`h-2 flex-1 rounded-full ${missingSeats.length > 0 ? 'bg-blue-200' : 'bg-emerald-200'}`}>
                    <div 
                      className={`h-full rounded-full ${missingSeats.length > 0 ? 'bg-blue-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(0, 100 - (missingSeats.length * 5))}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold">{missingSeats.length === 0 ? 'COMPLETO' : `${missingSeats.length} Faltando`}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Relatório de Qualidade</p>
                    <p className="text-sm text-slate-500">Verifique clientes com dados incompletos para evitar problemas nos embarques.</p>
                  </div>
                </div>
                <Link href="/client-data-quality-report">
                  <Button className="w-full mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Ver Qualidade de Dados
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
