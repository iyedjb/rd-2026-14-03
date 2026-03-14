import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Coffee, LogOut, LogIn, Download, Calendar, User, History, QrCode, XCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useTodayTimeRecord,
  useTimeRecords,
  useClockIn,
  useStartBreak,
  useEndBreak,
  useStartLunch,
  useEndLunch,
  useTimeRecordsByUser,
} from "@/hooks/use-time-records";
import { useGenerateClockOutQR } from "@/hooks/use-facial-verification";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { generateTimeRecordReport, type TimeRecordReportData } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "--:--";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: ptBR });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function ControleDePonto() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { data: todayRecord, isLoading: loadingToday } = useTodayTimeRecord();
  const { data: allRecords, isLoading: loadingAll } = useTimeRecords();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const clockIn = useClockIn();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const startLunch = useStartLunch();
  const endLunch = useEndLunch();
  const generateQR = useGenerateClockOutQR();

  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [selectedUserForReport, setSelectedUserForReport] = useState<string>("all");
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string>("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qr_code: string; verification_url: string; expires_at: Date; token: string } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"qr" | "verified" | "failed">("qr");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data: userHistoryRecords, isLoading: loadingUserHistory } = useTimeRecordsByUser(selectedUserForHistory);

  // Listen for logout signal from WebSocket
  useEffect(() => {
    if (!user) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.error("Failed to get Firebase token");
          return;
        }

        const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "logout_required") {
              toast({
                title: "Saída Registrada",
                description: "Sua saída foi verificada com sucesso. Desconectando...",
              });
              setTimeout(() => {
                logout();
              }, 1500);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, logout, toast]);

  const isClockedIn = todayRecord && !todayRecord.clock_out;
  const isOnBreak = todayRecord && todayRecord.break_start && !todayRecord.break_end;
  const isOnLunch = todayRecord && todayRecord.lunch_start && !todayRecord.lunch_end;
  const canStartBreak = isClockedIn && !todayRecord?.break_start && !isOnLunch;
  const canEndBreak = isOnBreak;
  const canStartLunch = isClockedIn && !todayRecord?.lunch_start && !isOnBreak;
  const canEndLunch = isOnLunch;
  const canClockOut = isClockedIn && !isOnBreak && !isOnLunch;

  // Update break timer
  useEffect(() => {
    if (!isOnBreak && !isOnLunch) {
      setBreakTimeRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const startTime = isOnBreak ? todayRecord.break_start : todayRecord.lunch_start;
      if (!startTime) return;
      
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      const totalSeconds = isOnBreak ? 900 : 3600; // 15 min or 60 min
      const remaining = Math.max(0, totalSeconds - elapsed);
      setBreakTimeRemaining(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, isOnLunch, todayRecord?.break_start, todayRecord?.lunch_start]);

  const formatBreakTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClockIn = () => {
    clockIn.mutate();
  };

  const handleStartBreak = () => {
    startBreak.mutate();
  };

  const handleEndBreak = () => {
    endBreak.mutate();
  };

  const handleStartLunch = () => {
    startLunch.mutate();
  };

  const handleEndLunch = () => {
    endLunch.mutate();
  };

  const handleClockOut = async () => {
    try {
      const result = await generateQR.mutateAsync();
      
      if (!result.qr_code) {
        throw new Error("QR code não foi gerado");
      }
      
      setVerificationStatus("qr");
      setQrCodeData({
        qr_code: result.qr_code,
        verification_url: result.verification_url,
        expires_at: result.expires_at,
        token: result.verification_token,
      });
      setQrDialogOpen(true);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  // Poll for verification status
  useEffect(() => {
    if (!qrDialogOpen || !qrCodeData?.token || verificationStatus !== "qr") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/facial-verification/session/${qrCodeData.token}`);
        const session = await response.json();
        
        if (session.status === "verified") {
          setVerificationStatus("verified");
          clearInterval(pollInterval);
        } else if (session.status === "failed") {
          setVerificationStatus("failed");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling verification status:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [qrDialogOpen, qrCodeData?.token, verificationStatus]);

  const handleGeneratePDF = async () => {
    let records = allRecords || [];

    if (reportType === "daily") {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, "0")}-${selectedDay.toString().padStart(2, "0")}`;
      records = records.filter(r => String(r.date) === dateStr);
    } else if (reportType === "monthly") {
      const prefix = `${selectedYear}-${selectedMonth.toString().padStart(2, "0")}`;
      records = records.filter(r => String(r.date).startsWith(prefix));
    } else if (reportType === "yearly") {
      const prefix = `${selectedYear}`;
      records = records.filter(r => String(r.date).startsWith(prefix));
    } else if (reportType === "weekly") {
      // Simplificação: pega os últimos 7 dias a partir da data selecionada
      const targetDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
      const oneWeekAgo = new Date(targetDate);
      oneWeekAgo.setDate(targetDate.getDate() - 7);
      
      records = records.filter(r => {
        const d = new Date(r.date);
        return d >= oneWeekAgo && d <= targetDate;
      });
    }

    // Filter by selected user if not "all"
    if (selectedUserForReport !== "all") {
      records = records.filter((record) => record.user_id === selectedUserForReport);
    }

    if (!records || records.length === 0) {
      alert("Não há registros para o período e usuário selecionados.");
      return;
    }

    const selectedUser = users?.find(u => u.id === selectedUserForReport);
    const reportData: TimeRecordReportData = {
      records: records.map(record => ({
        id: record.id,
        user_name: record.user_name || "N/A",
        user_email: record.user_email || "N/A",
        date: String(record.date),
        clock_in: record.clock_in!,
        clock_out: record.clock_out || undefined,
        break_start: record.break_start || undefined,
        break_end: record.break_end || undefined,
        lunch_start: record.lunch_start || undefined,
        lunch_end: record.lunch_end || undefined,
        lunch_duration_minutes: record.lunch_duration_minutes || 0,
        break_duration_minutes: record.break_duration_minutes || 0,
        total_hours: record.total_hours || 0,
      })),
      month: selectedMonth.toString().padStart(2, "0"),
      year: selectedYear.toString(),
      employee: selectedUserForReport === "all" ? undefined : (selectedUser?.email || user?.email || undefined),
    };

    await generateTimeRecordReport(reportData);
  };

  if (loadingToday) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
          Controle de Ponto
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registre seus horários de entrada, saída e intervalos
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl sm:text-6xl font-bold" data-testid="text-current-time">
                {format(currentTime, "HH:mm:ss", { locale: ptBR })}
              </div>
              <div className="text-base sm:text-lg text-muted-foreground font-medium" data-testid="text-current-date">
                {format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>

            {!isClockedIn && (
              <div className="text-center space-y-4">
                <Badge variant="secondary" className="text-sm sm:text-base px-3 py-1" data-testid="badge-status">
                  Não registrado hoje
                </Badge>
                <Button
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
                  size="lg"
                  onClick={handleClockIn}
                  disabled={clockIn.isPending}
                  data-testid="button-clock-in"
                >
                  <LogIn className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Registrar Entrada
                </Button>
              </div>
            )}

            {isClockedIn && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-sm sm:text-base text-muted-foreground font-medium">Entrada</div>
                    <div className="text-2xl sm:text-3xl font-bold" data-testid="text-clock-in-time">
                      {formatTime(todayRecord.clock_in)}
                    </div>
                  </div>
                  {todayRecord.clock_out && (
                    <div className="text-center sm:text-left">
                      <div className="text-sm sm:text-base text-muted-foreground font-medium">Saída</div>
                      <div className="text-2xl sm:text-3xl font-bold" data-testid="text-clock-out-time">
                        {formatTime(todayRecord.clock_out)}
                      </div>
                    </div>
                  )}
                </div>

                {isOnBreak && (
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span className="text-base sm:text-lg font-semibold flex items-center gap-2">
                        <Coffee className="h-5 w-5 sm:h-6 sm:w-6" />
                        Intervalo em andamento
                      </span>
                      <Badge variant="default" className="text-sm px-3 py-1" data-testid="badge-break-status">
                        Em pausa
                      </Badge>
                    </div>
                    <div className="text-5xl sm:text-6xl font-bold text-center" data-testid="text-break-timer">
                      {formatBreakTimer(breakTimeRemaining)}
                    </div>
                    <Button
                      className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
                      size="lg"
                      variant="outline"
                      onClick={handleEndBreak}
                      disabled={endBreak.isPending}
                      data-testid="button-end-break"
                    >
                      Finalizar Intervalo
                    </Button>
                  </div>
                )}

                {isOnLunch && (
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-4 sm:p-6 rounded-lg space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span className="text-base sm:text-lg font-semibold flex items-center gap-2">
                        <Coffee className="h-5 w-5 sm:h-6 sm:w-6" />
                        Almoço em andamento
                      </span>
                      <Badge variant="default" className="text-sm px-3 py-1" data-testid="badge-lunch-status">
                        Em pausa
                      </Badge>
                    </div>
                    <div className="text-5xl sm:text-6xl font-bold text-center" data-testid="text-lunch-timer">
                      {formatBreakTimer(breakTimeRemaining)}
                    </div>
                    <Button
                      className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
                      size="lg"
                      variant="outline"
                      onClick={handleEndLunch}
                      disabled={endLunch.isPending}
                      data-testid="button-end-lunch"
                    >
                      Finalizar Almoço
                    </Button>
                  </div>
                )}

                {!todayRecord.clock_out && (
                  <div className="grid gap-3">
                    {canStartBreak && (
                      <Button
                        variant="outline"
                        className="h-12 sm:h-14 text-base sm:text-lg font-semibold"
                        size="lg"
                        onClick={handleStartBreak}
                        disabled={startBreak.isPending}
                        data-testid="button-start-break"
                      >
                        <Coffee className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                        Iniciar Intervalo (15 min)
                      </Button>
                    )}
                    {canStartLunch && (
                      <Button
                        variant="outline"
                        className="h-12 sm:h-14 text-base sm:text-lg font-semibold"
                        size="lg"
                        onClick={handleStartLunch}
                        disabled={startLunch.isPending}
                        data-testid="button-start-lunch"
                      >
                        <Coffee className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                        Lançar Almoço (1h)
                      </Button>
                    )}
                    {canClockOut && (
                      <Button
                        className="h-12 sm:h-14 text-base sm:text-lg font-semibold"
                        size="lg"
                        onClick={handleClockOut}
                        disabled={generateQR.isPending}
                        data-testid="button-clock-out"
                      >
                        <QrCode className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                        Registrar Saída
                      </Button>
                    )}
                  </div>
                )}

                  <div className="bg-green-100 dark:bg-green-900/20 p-4 sm:p-6 rounded-lg text-center space-y-2">
                    <Badge variant="default" className="text-sm sm:text-base px-3 py-1" data-testid="badge-completed">
                      Ponto encerrado
                    </Badge>
                    <div className="text-base sm:text-lg">
                      Total de horas trabalhadas:{" "}
                      <span className="font-bold text-lg sm:text-xl" data-testid="text-total-hours">
                        {(() => {
                          const totalMinutes = Math.round((todayRecord.total_hours || 0) * 60);
                          const hours = Math.floor(totalMinutes / 60);
                          const mins = totalMinutes % 60;
                          return `${hours}:${mins.toString().padStart(2, '0')}`;
                        })()}h
                      </span>
                    </div>
                  </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              Gerar Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm sm:text-base text-muted-foreground font-medium">Tipo de Relatório</label>
                <Select
                  value={reportType}
                  onValueChange={(value: any) => setReportType(value)}
                >
                  <SelectTrigger className="h-11 text-base" data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm sm:text-base text-muted-foreground font-medium">Usuário</label>
                <Select
                  value={selectedUserForReport}
                  onValueChange={setSelectedUserForReport}
                >
                  <SelectTrigger className="h-11 text-base" data-testid="select-user-report">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {(reportType === "daily" || reportType === "weekly") && (
                <div>
                  <label className="text-sm sm:text-base text-muted-foreground font-medium">Dia</label>
                  <Select
                    value={selectedDay.toString()}
                    onValueChange={(value) => setSelectedDay(parseInt(value))}
                  >
                    <SelectTrigger className="h-11 text-base" data-testid="select-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {reportType !== "yearly" && (
                <div>
                  <label className="text-sm sm:text-base text-muted-foreground font-medium">Mês</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="h-11 text-base" data-testid="select-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {format(new Date(2024, month - 1, 1), "MMMM", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm sm:text-base text-muted-foreground font-medium">Ano</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="h-11 text-base" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
              size="lg"
              variant="outline"
              onClick={handleGeneratePDF}
              data-testid="button-generate-pdf"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              Gerar Relatório PDF
            </Button>

            <div className="bg-muted p-4 sm:p-6 rounded-lg space-y-3">
              <div className="text-base sm:text-lg font-bold">Resumo do Período</div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
                <div>
                  <div className="text-muted-foreground font-medium">Dias trabalhados</div>
                  <div className="text-xl sm:text-2xl font-bold" data-testid="text-days-worked">
                    {
                      allRecords?.filter((r) => {
                        const [year, month, day] = String(r.date).split('-').map(Number);
                        let matchesPeriod = false;
                        
                        if (reportType === "daily") {
                          matchesPeriod = day === selectedDay && month === selectedMonth && year === selectedYear;
                        } else if (reportType === "monthly") {
                          matchesPeriod = month === selectedMonth && year === selectedYear;
                        } else if (reportType === "yearly") {
                          matchesPeriod = year === selectedYear;
                        } else if (reportType === "weekly") {
                          const targetDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
                          const oneWeekAgo = new Date(targetDate);
                          oneWeekAgo.setDate(targetDate.getDate() - 7);
                          const recordDate = new Date(String(r.date));
                          matchesPeriod = recordDate >= oneWeekAgo && recordDate <= targetDate;
                        }

                        const matchesUser = selectedUserForReport === "all" || r.user_id === selectedUserForReport;
                        return matchesPeriod && matchesUser;
                      }).length || 0
                    }
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground font-medium">Horas totais</div>
                  <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-monthly-hours">
                    {(
                      allRecords
                        ?.filter((r) => {
                          const [year, month, day] = String(r.date).split('-').map(Number);
                          let matchesPeriod = false;
                          
                          if (reportType === "daily") {
                            matchesPeriod = day === selectedDay && month === selectedMonth && year === selectedYear;
                          } else if (reportType === "monthly") {
                            matchesPeriod = month === selectedMonth && year === selectedYear;
                          } else if (reportType === "yearly") {
                            matchesPeriod = year === selectedYear;
                          } else if (reportType === "weekly") {
                            const targetDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
                            const oneWeekAgo = new Date(targetDate);
                            oneWeekAgo.setDate(targetDate.getDate() - 7);
                            const recordDate = new Date(String(r.date));
                            matchesPeriod = recordDate >= oneWeekAgo && recordDate <= targetDate;
                          }

                          const matchesUser = selectedUserForReport === "all" || r.user_id === selectedUserForReport;
                          return matchesPeriod && matchesUser;
                        })
                        .reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0
                    ).toFixed(2)}
                    h
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Histórico de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAll ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {allRecords && allRecords.length > 0 ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-date">Data</TableHead>
                          <TableHead data-testid="header-employee">Funcionário</TableHead>
                          <TableHead data-testid="header-clock-in">Entrada</TableHead>
                          <TableHead data-testid="header-break">Intervalo</TableHead>
                          <TableHead data-testid="header-clock-out">Saída</TableHead>
                          <TableHead data-testid="header-total">Total (h)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRecords
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((record) => (
                            <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                              <TableCell data-testid={`cell-date-${record.id}`}>
                                {String(record.date).split('-').reverse().join('/')}
                              </TableCell>
                              <TableCell data-testid={`cell-employee-${record.id}`}>
                                {record.user_name}
                              </TableCell>
                              <TableCell data-testid={`cell-clock-in-${record.id}`}>
                                {formatTime(record.clock_in)}
                              </TableCell>
                              <TableCell data-testid={`cell-break-${record.id}`}>
                                {(record.break_duration_minutes ?? 0) > 0
                                  ? formatDuration(record.break_duration_minutes ?? 0)
                                  : "-"}
                              </TableCell>
                              <TableCell data-testid={`cell-clock-out-${record.id}`}>
                                {formatTime(record.clock_out)}
                              </TableCell>
                              <TableCell data-testid={`cell-total-${record.id}`}>
                                {(() => {
                                  const totalMinutes = Math.round((record.total_hours || 0) * 60);
                                  if (totalMinutes <= 0) return "-";
                                  const h = Math.floor(totalMinutes / 60);
                                  const m = totalMinutes % 60;
                                  return `${h}:${m.toString().padStart(2, '0')}`;
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="md:hidden space-y-3">
                    {allRecords
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <div key={record.id} className="bg-muted/50 p-4 rounded-lg space-y-2" data-testid={`card-record-${record.id}`}>
                          <div className="flex justify-between items-start">
                            <div className="font-bold text-lg" data-testid={`cell-date-${record.id}`}>
                              {String(record.date).split('-').reverse().join('/')}
                            </div>
                            <Badge variant="secondary" className="text-xs" data-testid={`cell-total-${record.id}`}>
                              {(() => {
                                const totalMinutes = Math.round((record.total_hours || 0) * 60);
                                if (totalMinutes <= 0) return "-";
                                const h = Math.floor(totalMinutes / 60);
                                const m = totalMinutes % 60;
                                return `${h}:${m.toString().padStart(2, '0')}`;
                              })()}h
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`cell-employee-${record.id}`}>
                            <User className="h-4 w-4 inline mr-1" />
                            {record.user_name}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground">Entrada</div>
                              <div className="font-semibold text-base" data-testid={`cell-clock-in-${record.id}`}>
                                {formatTime(record.clock_in)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Intervalo</div>
                              <div className="font-semibold text-base" data-testid={`cell-break-${record.id}`}>
                                {(record.break_duration_minutes ?? 0) > 0
                                  ? formatDuration(record.break_duration_minutes ?? 0)
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Saída</div>
                              <div className="font-semibold text-base" data-testid={`cell-clock-out-${record.id}`}>
                                {formatTime(record.clock_out)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <History className="h-5 w-5 sm:h-6 sm:w-6" />
            Histórico do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm sm:text-base text-muted-foreground font-medium">Selecione um usuário</label>
            <Select
              value={selectedUserForHistory}
              onValueChange={setSelectedUserForHistory}
            >
              <SelectTrigger className="h-11 text-base" data-testid="select-user-history">
                <SelectValue placeholder="Escolha um usuário para ver o histórico completo" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserForHistory && (
            <>
              {loadingUserHistory ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  {userHistoryRecords && userHistoryRecords.length > 0 && (
                    <div className="bg-muted p-4 sm:p-6 rounded-lg">
                      <div className="text-base sm:text-lg font-bold mb-3">Resumo Total</div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <div className="text-sm sm:text-base text-muted-foreground font-medium">Total de dias</div>
                          <div className="text-xl sm:text-2xl font-bold">{userHistoryRecords.length}</div>
                        </div>
                        <div>
                          <div className="text-sm sm:text-base text-muted-foreground font-medium">Total de horas</div>
                          <div className="text-xl sm:text-2xl font-bold">
                            {(() => {
                              const totalMinutes = userHistoryRecords.reduce((sum, r) => sum + Math.round((r.total_hours || 0) * 60), 0);
                              const h = Math.floor(totalMinutes / 60);
                              const m = totalMinutes % 60;
                              return `${h}:${m.toString().padStart(2, '0')}`;
                            })()}h
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {userHistoryRecords && userHistoryRecords.length > 0 && (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead data-testid="header-history-date">Data</TableHead>
                              <TableHead data-testid="header-history-clock-in">Entrada</TableHead>
                              <TableHead data-testid="header-history-break">Intervalo</TableHead>
                              <TableHead data-testid="header-history-clock-out">Saída</TableHead>
                              <TableHead data-testid="header-history-total">Total (h)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userHistoryRecords
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((record) => (
                                <TableRow key={record.id} data-testid={`row-history-${record.id}`}>
                                  <TableCell data-testid={`cell-history-date-${record.id}`}>
                                    {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                                  </TableCell>
                                  <TableCell data-testid={`cell-history-clock-in-${record.id}`}>
                                    {formatTime(record.clock_in)}
                                  </TableCell>
                                  <TableCell data-testid={`cell-history-break-${record.id}`}>
                                    {(record.break_duration_minutes ?? 0) > 0
                                      ? formatDuration(record.break_duration_minutes ?? 0)
                                      : "-"}
                                  </TableCell>
                                  <TableCell data-testid={`cell-history-clock-out-${record.id}`}>
                                    {formatTime(record.clock_out)}
                                  </TableCell>
                                  <TableCell data-testid={`cell-history-total-${record.id}`}>
                                    {(() => {
                                      const totalMinutes = Math.round((record.total_hours || 0) * 60);
                                      if (totalMinutes <= 0) return "-";
                                      const h = Math.floor(totalMinutes / 60);
                                      const m = totalMinutes % 60;
                                      return `${h}:${m.toString().padStart(2, '0')}`;
                                    })()}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="md:hidden space-y-3">
                        {userHistoryRecords
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((record) => (
                            <div key={record.id} className="bg-muted/50 p-4 rounded-lg space-y-2" data-testid={`card-history-${record.id}`}>
                              <div className="flex justify-between items-start">
                                <div className="font-bold text-lg" data-testid={`cell-history-date-${record.id}`}>
                                  {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                                <Badge variant="secondary" className="text-xs" data-testid={`cell-history-total-${record.id}`}>
                                  {(() => {
                                    const totalMinutes = Math.round((record.total_hours || 0) * 60);
                                    if (totalMinutes <= 0) return "-";
                                    const h = Math.floor(totalMinutes / 60);
                                    const m = totalMinutes % 60;
                                    return `${h}:${m.toString().padStart(2, '0')}`;
                                  })()}h
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-xs text-muted-foreground">Entrada</div>
                                  <div className="font-semibold text-base" data-testid={`cell-history-clock-in-${record.id}`}>
                                    {formatTime(record.clock_in)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Intervalo</div>
                                  <div className="font-semibold text-base" data-testid={`cell-history-break-${record.id}`}>
                                    {(record.break_duration_minutes ?? 0) > 0
                                      ? formatDuration(record.break_duration_minutes ?? 0)
                                      : "-"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Saída</div>
                                  <div className="font-semibold text-base" data-testid={`cell-history-clock-out-${record.id}`}>
                                    {formatTime(record.clock_out)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                  
                  {(!userHistoryRecords || userHistoryRecords.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado para este usuário
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!selectedUserForHistory && (
            <div className="text-center text-muted-foreground py-8 text-base">
              Selecione um usuário para visualizar o histórico completo
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={qrDialogOpen} onOpenChange={(open) => {
        setQrDialogOpen(open);
        if (!open) {
          setQrCodeData(null);
          setVerificationStatus("qr");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          {verificationStatus === "qr" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Verificação Facial
                </DialogTitle>
                <DialogDescription>
                  Escaneie com seu celular e tire uma foto do seu rosto
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                {!qrCodeData || !qrCodeData.qr_code ? (
                  <div className="text-center py-8 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
                    <p className="text-muted-foreground">Gerando QR Code...</p>
                  </div>
                ) : (
                  <>
                    <div className="border-4 border-green-500 rounded-xl p-4 bg-white">
                      <img 
                        src={qrCodeData.qr_code} 
                        alt="QR Code"
                        className="w-64 h-64"
                        data-testid="img-qr-code"
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">Aguardando verificação...</p>
                      <p className="text-xs text-muted-foreground">
                        Expira às {new Date(qrCodeData.expires_at).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {verificationStatus === "verified" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <span className="text-2xl font-bold">Sucesso!</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="text-center py-4">
                <p className="text-lg text-gray-600 mb-4">Sua saída foi registrada com sucesso!</p>
                <Button
                  onClick={() => {
                    setQrDialogOpen(false);
                    logout();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Fechar
                </Button>
              </div>
            </>
          )}

          {verificationStatus === "failed" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <span className="text-2xl font-bold">Erro</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">A verificação facial falhou.</p>
                <Button
                  onClick={() => {
                    setQrDialogOpen(false);
                    setVerificationStatus("qr");
                  }}
                  variant="outline"
                >
                  Tentar Novamente
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

