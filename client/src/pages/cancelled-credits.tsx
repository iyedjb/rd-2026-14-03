import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  XCircle,
  FileText,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedMoney } from "@/components/ui/protected-money";
import { auth } from "@/lib/firebase";
import type { CancelledClientCredit } from "@shared/schema";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function CancelledCredits() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "used">("all");
  const [validityFilter, setValidityFilter] = useState<"all" | "30" | "60" | "90">("all");
  const [usagePeriodFilter, setUsagePeriodFilter] = useState<"all" | "this-month" | "last-month" | "this-year">("all");

  const generatePDF = (credit: CancelledClientCredit) => {
    const doc = new jsPDF();
    const daysLeft = differenceInDays(new Date(credit.expires_at), new Date());
    const isUsed = credit.is_used;
    const primaryColor = isUsed ? [37, 99, 235] : [16, 185, 129];
    const secondaryColor = [71, 85, 105];

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(isUsed ? "RECIBO DE USO" : "VOUCHER DE CRÉDITO", 20, 23);

    // Content
    let currentY = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(credit.client_name, 20, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`Contato: ${credit.client_phone || '---'} | Email: ${credit.client_email || '---'}`, 20, currentY + 7);

    currentY += 25;
    
    // Info Grid
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DESTINO", 20, currentY);
    doc.text("CANCELADO EM", 110, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(credit.destination || "Não informado", 20, currentY + 6);
    doc.text(format(new Date(credit.cancelled_at), "dd/MM/yyyy", { locale: ptBR }), 110, currentY + 6);

    currentY += 20;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(isUsed ? "DATA DE USO" : "VALIDADE", 20, currentY);
    doc.text("STATUS", 110, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(isUsed && credit.used_at ? format(new Date(credit.used_at), "dd/MM/yyyy", { locale: ptBR }) : format(new Date(credit.expires_at), "dd/MM/yyyy", { locale: ptBR }), 20, currentY + 6);
    doc.text(isUsed ? "UTILIZADO" : `${daysLeft} dias restantes`, 110, currentY + 6);

    // Value
    currentY += 35;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, currentY, 170, 25, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 20, currentY + 25);

    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(isUsed ? "VALOR UTILIZADO" : "VALOR DISPONÍVEL", 25, currentY + 8);
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`R$ ${credit.credit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, currentY + 18);

    // Footer
    const footerY = 280;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("RODA BEM TURISMO - CNPJ: 52.887.899/0001-39", 105, footerY, { align: "center" });
    doc.text("Documento digital de conferência de crédito.", 105, footerY + 5, { align: "center" });

    doc.save(`${isUsed ? 'recibo' : 'voucher'}_${credit.client_name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const { data: credits, isLoading } = useQuery({
    queryKey: ["/api/cancelled-client-credits"],
    queryFn: async (): Promise<CancelledClientCredit[]> => {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch("/api/cancelled-client-credits", {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = await response.json();
      return data.map((credit: any) => ({
        ...credit,
        cancelled_at: new Date(credit.cancelled_at),
        expires_at: new Date(credit.expires_at),
        original_travel_date: credit.original_travel_date ? new Date(credit.original_travel_date) : undefined,
        used_at: credit.used_at ? new Date(credit.used_at) : undefined,
        created_at: new Date(credit.created_at),
        updated_at: new Date(credit.updated_at),
      }));
    },
  });

  const filteredCredits = useMemo(() => {
    if (!credits) return [];
    
    let filtered = credits;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.client_name.toLowerCase().includes(search) ||
          c.destination?.toLowerCase().includes(search) ||
          c.client_phone?.toLowerCase().includes(search)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        if (statusFilter === "active") return !c.is_expired && !c.is_used;
        if (statusFilter === "expired") return c.is_expired;
        if (statusFilter === "used") return c.is_used;
        return true;
      });
    }

    if (validityFilter !== "all") {
      const days = parseInt(validityFilter);
      filtered = filtered.filter((c) => {
        const daysLeft = differenceInDays(new Date(c.expires_at), new Date());
        return daysLeft <= days && daysLeft >= 0 && !c.is_used;
      });
    }

    if (usagePeriodFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((c) => {
        if (!c.is_used || !c.used_at) return false;
        const usedDate = new Date(c.used_at);
        if (usagePeriodFilter === "this-month") {
          return usedDate.getMonth() === now.getMonth() && usedDate.getFullYear() === now.getFullYear();
        }
        if (usagePeriodFilter === "last-month") {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return usedDate.getMonth() === lastMonth && usedDate.getFullYear() === year;
        }
        if (usagePeriodFilter === "this-year") {
          return usedDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    
    return filtered.sort((a, b) => 
      new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime()
    );
  }, [credits, searchTerm, statusFilter, validityFilter, usagePeriodFilter]);

  const stats = useMemo(() => {
    if (!credits) return { total: 0, active: 0, expired: 0, used: 0, activeAmount: 0, expiredAmount: 0 };
    
    const active = credits.filter((c) => !c.is_expired && !c.is_used);
    const expired = credits.filter((c) => c.is_expired);
    const used = credits.filter((c) => c.is_used);
    
    return {
      total: credits.length,
      active: active.length,
      expired: expired.length,
      used: used.length,
      activeAmount: active.reduce((sum, c) => sum + c.credit_amount, 0),
      expiredAmount: expired.reduce((sum, c) => sum + c.credit_amount, 0),
    };
  }, [credits]);

  const getStatusBadge = (credit: CancelledClientCredit) => {
    if (credit.is_used) {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Utilizado
        </Badge>
      );
    }
    if (credit.is_expired) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    const daysLeft = differenceInDays(new Date(credit.expires_at), new Date());
    if (daysLeft <= 7) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expira em {daysLeft} dias
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
        <Clock className="w-3 h-3 mr-1" />
        Válido ({daysLeft} dias)
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Créditos de Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os créditos de viagens canceladas
            </p>
          </div>
          <Badge variant="outline" className="self-start md:self-auto px-4 py-2 text-sm">
            <CreditCard className="w-4 h-4 mr-2" />
            Válido por 90 dias
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Créditos</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <CreditCard className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 border-emerald-200/50 dark:border-emerald-700/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Créditos Ativos</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    <ProtectedMoney amount={stats.activeAmount} />
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 border-red-200/50 dark:border-red-700/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Créditos Expirados</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    <ProtectedMoney amount={stats.expiredAmount} />
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200/50 dark:border-blue-700/50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Créditos Utilizados</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.used}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, destino ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-credits"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="used">Utilizados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={validityFilter} onValueChange={(v: any) => setValidityFilter(v)}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-validity-filter">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Validade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Validade</SelectItem>
                  <SelectItem value="30">Expira em 30 dias</SelectItem>
                  <SelectItem value="60">Expira em 60 dias</SelectItem>
                  <SelectItem value="90">Expira em 90 dias</SelectItem>
                </SelectContent>
              </Select>

              <Select value={usagePeriodFilter} onValueChange={(v: any) => setUsagePeriodFilter(v)}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-usage-filter">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Uso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer período de uso</SelectItem>
                  <SelectItem value="this-month">Utilizados este mês</SelectItem>
                  <SelectItem value="last-month">Utilizados mês passado</SelectItem>
                  <SelectItem value="this-year">Utilizados este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Credits List */}
        <div className="space-y-4">
          {filteredCredits.length === 0 ? (
            <Card className="border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <CardContent className="p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhum crédito encontrado</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Os créditos de viagens canceladas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCredits.map((credit) => (
              <Card 
                key={credit.id} 
                className={`border-slate-200/50 dark:border-slate-700/50 shadow-lg transition-all hover:shadow-xl ${
                  credit.is_expired 
                    ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/50' 
                    : credit.is_used 
                      ? 'bg-blue-50/30 dark:bg-blue-950/20' 
                      : 'bg-white dark:bg-slate-900'
                }`}
                data-testid={`credit-card-${credit.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Client Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-xl">
                            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                              {credit.client_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              {credit.client_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {credit.client_phone}
                                </span>
                              )}
                              {credit.client_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {credit.client_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(credit)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generatePDF(credit)}
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                          title="Gerar PDF"
                          data-testid={`button-pdf-${credit.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {credit.destination && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4 text-indigo-500" />
                            <span>{credit.destination}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-amber-500" />
                          <span>Cancelado: {format(new Date(credit.cancelled_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-red-500" />
                          <span>Expira: {format(new Date(credit.expires_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        {credit.cancellation_reason && (
                          <div className="col-span-2 md:col-span-4 text-muted-foreground italic">
                            Motivo: {credit.cancellation_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credit Amount */}
                    <div className="lg:text-right lg:min-w-[180px]">
                      <p className="text-sm text-muted-foreground mb-1">Valor do Crédito</p>
                      <p className={`text-2xl font-bold ${
                        credit.is_expired 
                          ? 'text-red-500 line-through' 
                          : credit.is_used 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <ProtectedMoney amount={credit.credit_amount} />
                      </p>
                      {credit.is_used && credit.used_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Usado em {format(new Date(credit.used_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
