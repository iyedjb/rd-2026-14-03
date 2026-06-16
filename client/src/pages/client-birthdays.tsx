import { useState, useMemo } from "react";
import { useClients } from "@/hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Cake, 
  Download, 
  Calendar,
  Phone,
  User
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { parseLocalDate, calculateAge } from "@/lib/utils";
import type { Client } from "@/types";

export default function ClientBirthdays() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("semana");
  
  const { clients, isLoading } = useClients({ limit: 5000 });

  const clientsWithBirthdays = useMemo(() => {
    // Group clients by CPF to avoid duplicates for the same person with multiple contracts
    const uniqueClients = new Map<string, Client>();
    
    clients.forEach((client: Client) => {
      if (client.birthdate) {
        // Use CPF as the primary key if available, otherwise fallback to ID
        const key = client.cpf || client.id;
        if (!uniqueClients.has(key)) {
          uniqueClients.set(key, client);
        }
      }
    });
    
    return Array.from(uniqueClients.values());
  }, [clients]);

  const getTodayAtMidnight = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getBirthdaysForDate = (date: Date) => {
    return clientsWithBirthdays.filter((client: Client) => {
      if (!client.birthdate) return false;
      // Parse as local date to avoid timezone shifts
      const birthdate = typeof client.birthdate === 'string' 
        ? parseLocalDate((client.birthdate as string).split('T')[0])
        : (client.birthdate instanceof Date ? client.birthdate : new Date(client.birthdate as any));
      return birthdate.getDate() === date.getDate() && 
             birthdate.getMonth() === date.getMonth();
    });
  };

  const getNextWeekBirthdays = () => {
    const today = getTodayAtMidnight();
    const birthdays: { client: Client; date: Date }[] = [];

    for (let i = 0; i <= 7; i++) {
      const checkDate = addDays(today, i);
      const dayBirthdays = getBirthdaysForDate(checkDate);
      dayBirthdays.forEach((client: Client) => {
        birthdays.push({ client, date: checkDate });
      });
    }

    return birthdays.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getMonthBirthdays = () => {
    return clientsWithBirthdays
      .filter((client: Client) => {
        if (!client.birthdate) return false;
        const birthdate = typeof client.birthdate === 'string' 
          ? parseLocalDate((client.birthdate as string).split('T')[0])
          : (client.birthdate instanceof Date ? client.birthdate : new Date(client.birthdate as any));
        return birthdate.getMonth() === currentMonth.getMonth();
      })
      .sort((a: Client, b: Client) => {
        const dateA = typeof a.birthdate === 'string'
          ? parseLocalDate((a.birthdate as string).split('T')[0]).getDate()
          : (a.birthdate instanceof Date ? a.birthdate.getDate() : new Date(a.birthdate as any).getDate());
        const dateB = typeof b.birthdate === 'string'
          ? parseLocalDate((b.birthdate as string).split('T')[0]).getDate()
          : (b.birthdate instanceof Date ? b.birthdate.getDate() : new Date(b.birthdate as any).getDate());
        return dateA - dateB;
      });
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const generateWeeklyPDF = () => {
    const doc = new jsPDF();
    const today = getTodayAtMidnight();
    
    doc.setFontSize(20);
    doc.setTextColor(76, 175, 80);
    doc.text("Aniversários da Semana", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`${format(today, "dd/MM/yyyy", { locale: ptBR })} a ${format(addDays(today, 7), "dd/MM/yyyy", { locale: ptBR })}`, 14, 30);
    doc.text(`Gerado em: ${format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 36);
    
    const nextWeekBirthdays = getNextWeekBirthdays();
    
    if (nextWeekBirthdays.length > 0) {
      const tableData = nextWeekBirthdays.map(({ client, date }) => {
        const age = client.birthdate ? calculateAge(client.birthdate) : "-";
        const daysUntil = differenceInDays(date, today);
        const daysText = daysUntil === 0 ? "Hoje!" : daysUntil === 1 ? "Amanhã" : `${format(date, "EEEE", { locale: ptBR })}`;
        
        return [
          `${client.first_name} ${client.last_name}`,
          format(date, "dd/MM", { locale: ptBR }),
          age.toString(),
          client.phone || "-",
          daysText
        ];
      });

      autoTable(doc, {
        startY: 44,
        head: [["Cliente", "Data", "Idade", "Telefone", "Dia"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [76, 175, 80], fontSize: 11 },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 55 },
          4: { cellWidth: 35 }
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Nenhum aniversário nos próximos 7 dias.", 14, 50);
    }

    doc.save(`aniversarios-semana-${format(today, "yyyy-MM-dd")}.pdf`);
  };

  const generateMonthlyPDF = () => {
    const doc = new jsPDF();
    const today = getTodayAtMidnight();
    
    doc.setFontSize(20);
    doc.setTextColor(76, 175, 80);
    doc.text(`Aniversários de ${format(currentMonth, "MMMM yyyy", { locale: ptBR })}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(today, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);

    const monthBirthdays = getMonthBirthdays();

    if (monthBirthdays.length > 0) {
      const monthTableData = monthBirthdays.map((client: Client) => {
        const birthdate = typeof client.birthdate === 'string'
          ? parseLocalDate((client.birthdate as string).split('T')[0])
          : (client.birthdate instanceof Date ? client.birthdate : new Date(client.birthdate as any));
        const age = calculateAge(client.birthdate, currentMonth);
        return [
          `${client.first_name} ${client.last_name}`,
          format(birthdate, "dd/MM", { locale: ptBR }),
          age.toString(),
          client.phone || "-",
          client.email || "-"
        ];
      });

      autoTable(doc, {
        startY: 38,
        head: [["Cliente", "Data", "Idade", "Telefone", "Email"]],
        body: monthTableData,
        theme: 'striped',
        headStyles: { fillColor: [76, 175, 80], fontSize: 11 },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 50 },
          4: { cellWidth: 45 }
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Nenhum aniversário neste mês.", 14, 44);
    }

    doc.save(`aniversarios-${format(currentMonth, "MMMM-yyyy", { locale: ptBR })}.pdf`);
  };

  const nextWeekBirthdays = getNextWeekBirthdays();
  const monthBirthdays = getMonthBirthdays();
  const todayBirthdays = getBirthdaysForDate(getTodayAtMidnight());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-muted-foreground">Carregando aniversários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg">
              <Cake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Aniversário dos Clientes
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {clientsWithBirthdays.length} clientes com data de aniversário
              </p>
            </div>
          </div>
        </div>

        {todayBirthdays.length > 0 && (
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-white p-2.5 rounded-xl animate-pulse">
                  <Cake className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                    Aniversariantes de Hoje!
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {todayBirthdays.map((c: Client) => (
                      <Badge key={c.id} variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        {c.first_name} {c.last_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger 
              value="semana" 
              className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              data-testid="tab-week"
            >
              Próxima Semana
              {nextWeekBirthdays.length > 0 && (
                <Badge className="ml-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {nextWeekBirthdays.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="mes" 
              className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              data-testid="tab-month"
            >
              Mês
              <Badge className="ml-2 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {monthBirthdays.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="calendario" 
              className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
              data-testid="tab-calendar"
            >
              Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="semana" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={generateWeeklyPDF}
                className="rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-md"
                data-testid="button-pdf-week"
              >
                <Download className="h-4 w-4 mr-2" />
                Relatório da Semana
              </Button>
            </div>

            {nextWeekBirthdays.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Cake className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Nenhum aniversário nos próximos 7 dias</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nextWeekBirthdays.map(({ client, date }, index) => {
                  const daysUntil = differenceInDays(date, getTodayAtMidnight());
                  const age = client.birthdate ? calculateAge(client.birthdate, getTodayAtMidnight()) : null;
                  
                  return (
                    <Card 
                      key={`${client.id}-${index}`}
                      className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge 
                            className={`rounded-lg ${
                              daysUntil === 0 
                                ? "bg-amber-500 text-white" 
                                : daysUntil === 1 
                                  ? "bg-orange-500 text-white"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                            }`}
                          >
                            {daysUntil === 0 ? "Hoje!" : daysUntil === 1 ? "Amanhã" : format(date, "EEEE", { locale: ptBR })}
                          </Badge>
                          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {format(date, "dd/MM")}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {client.first_name} {client.last_name}
                            </span>
                          </div>
                          {age && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-6">
                              Faz {age} anos
                            </p>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <Phone className="h-4 w-4" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="rounded-xl h-10 w-10"
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[140px] text-center capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="rounded-xl h-10 w-10"
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={generateMonthlyPDF}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
                data-testid="button-pdf-month"
              >
                <Download className="h-4 w-4 mr-2" />
                Relatório do Mês
              </Button>
            </div>

            {monthBirthdays.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Cake className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Nenhum aniversário em {format(currentMonth, "MMMM", { locale: ptBR })}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {monthBirthdays.map((client: Client) => {
                  const birthdate = typeof client.birthdate === 'string'
                    ? parseLocalDate((client.birthdate as string).split('T')[0])
                    : (client.birthdate instanceof Date ? client.birthdate : new Date(client.birthdate as any));
                  const age = calculateAge(client.birthdate, currentMonth);
                  const isToday = birthdate.getDate() === new Date().getDate() && birthdate.getMonth() === new Date().getMonth();
                  
                  return (
                    <Card 
                      key={client.id}
                      className={`hover:shadow-lg transition-shadow border-l-4 ${isToday ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-l-emerald-500"}`}
                      data-testid={`birthday-card-${client.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {format(birthdate, "dd")}
                          </span>
                          {isToday && (
                            <Badge className="bg-amber-500 text-white rounded-lg">Hoje!</Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {client.first_name} {client.last_name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Faz {age} anos
                          </p>
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Phone className="h-3 w-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendario" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-emerald-500" />
                    Calendário
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="rounded-xl h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-base font-semibold min-w-[130px] text-center capitalize">
                      {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="rounded-xl h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-slate-500 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dayBirthdays = getBirthdaysForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);

                    return (
                      <div
                        key={index}
                        className={`
                          relative min-h-[70px] p-1.5 rounded-lg transition-all
                          ${isCurrentMonth 
                            ? "bg-white dark:bg-slate-800" 
                            : "bg-slate-50 dark:bg-slate-900/50 opacity-40"}
                          ${isCurrentDay 
                            ? "ring-2 ring-emerald-500" 
                            : ""}
                          ${dayBirthdays.length > 0 
                            ? "bg-emerald-50 dark:bg-emerald-950/30" 
                            : ""}
                        `}
                        data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        <span
                          className={`
                            text-xs font-medium block mb-1
                            ${isCurrentDay 
                              ? "bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center" 
                              : isCurrentMonth 
                                ? "text-slate-600 dark:text-slate-300" 
                                : "text-slate-400"}
                          `}
                        >
                          {format(day, "d")}
                        </span>

                        {dayBirthdays.length > 0 && (
                          <div className="space-y-0.5">
                            {dayBirthdays.slice(0, 2).map((client: Client) => (
                              <div
                                key={client.id}
                                className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded truncate"
                                title={`${client.first_name} ${client.last_name}`}
                              >
                                {client.first_name}
                              </div>
                            ))}
                            {dayBirthdays.length > 2 && (
                              <div className="text-[10px] text-emerald-600 font-medium text-center">
                                +{dayBirthdays.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

