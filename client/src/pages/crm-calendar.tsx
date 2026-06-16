import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCrmTasks } from "@/hooks/use-crm-tasks";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CrmTask } from "@shared/schema";
import { getBrazilianHolidays, getHolidayForDate } from "@/lib/holidays";

export default function CrmCalendar() {
  const { user } = useAuth();
  const { data: tasks = [] } = useCrmTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const holidays = useMemo(() => getBrazilianHolidays(currentDate.getFullYear()), [currentDate]);

  const tasksForSelectedDate = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.due_date);
      return isSameDay(taskDate, selectedDate);
    });
  }, [selectedDate, tasks]);

  const selectedHoliday = useMemo(() => {
    return getHolidayForDate(selectedDate);
  }, [selectedDate]);

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.due_date);
      return isSameDay(taskDate, date);
    });
  };

  const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const weekDaysShort = ["Do", "Se", "Te", "Qu", "Qu", "Se", "Sa"];
  const firstDayOfWeek = monthStart.getDay();
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Calendário
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  {/* Month/Year selectors */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="h-9 w-9 p-0"
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <select
                        value={currentDate.getMonth()}
                        onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
                        className="px-3 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        data-testid="select-month"
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i} value={i}>
                            {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                          </option>
                        ))}
                      </select>

                      <select
                        value={currentDate.getFullYear()}
                        onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
                        className="px-3 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        data-testid="select-year"
                      >
                        {Array.from({ length: 10 }).map((_, i) => {
                          const year = 2020 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="h-9 w-9 p-0"
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date();
                        setCurrentDate(today);
                        setSelectedDate(today);
                      }}
                      className="font-semibold"
                      data-testid="button-today"
                    >
                      Hoje
                    </Button>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Week days header */}
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {weekDaysShort.map((day) => (
                    <div key={day} className="text-center font-bold text-xs text-slate-500 dark:text-slate-400 py-3 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-lg" />
                  ))}

                  {/* Days */}
                  {daysInMonth.map((date) => {
                    const dayTasks = getTasksForDay(date);
                    const holiday = getHolidayForDate(date);
                    const isSelected = isSameDay(date, selectedDate);
                    const isTodayDate = isSameDay(date, new Date());

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 font-semibold text-sm ${
                          isSelected
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-700"
                            : isTodayDate
                            ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            : holiday
                            ? "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        data-testid={`button-day-${date.getDate()}`}
                      >
                        <span>{date.getDate()}</span>
                        
                        {/* Event indicators */}
                        {(holiday || dayTasks.length > 0) && (
                          <div className="flex gap-1 mt-1 absolute bottom-1">
                            {holiday && (
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${
                                  holiday.type === 'national'
                                    ? "bg-red-500"
                                    : "bg-purple-500"
                                }`}
                                data-testid={`dot-holiday-${date.getDate()}`}
                              />
                            )}
                            {dayTasks.length > 0 && (
                              <div
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                data-testid={`dot-task-${date.getDate()}`}
                              />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected date card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Data Selecionada
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {format(selectedDate, "dd")}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {format(selectedDate, "EEEE", { locale: ptBR })}
                </p>
                {isToday && (
                  <div className="mt-3 px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs font-semibold text-blue-600 dark:text-blue-300 inline-block">
                    Hoje
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Holiday card */}
            {selectedHoliday && (
              <Card className={`border-0 shadow-sm ${
                selectedHoliday.type === 'national'
                  ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900'
                  : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900'
              }`}>
                <CardContent className="p-6">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                    selectedHoliday.type === 'national'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-purple-700 dark:text-purple-300'
                  }`}>
                    {selectedHoliday.type === 'national' ? 'Feriado Nacional' : 'Evento Internacional'}
                  </p>
                  <p className={`font-bold text-lg ${
                    selectedHoliday.type === 'national'
                      ? 'text-red-900 dark:text-red-100'
                      : 'text-purple-900 dark:text-purple-100'
                  }`}>
                    {selectedHoliday.name}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tasks card */}
            <Card className="border-0 shadow-sm bg-white dark:bg-slate-800">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="text-base">
                  {tasksForSelectedDate.length > 0
                    ? `${tasksForSelectedDate.length} Tarefa${tasksForSelectedDate.length > 1 ? "s" : ""}`
                    : "Nenhuma tarefa"}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4 max-h-96 overflow-y-auto space-y-3">
                {tasksForSelectedDate.length === 0 && !selectedHoliday && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                    Nenhum evento neste dia
                  </p>
                )}
                
                {tasksForSelectedDate.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border-l-4 border-blue-500 hover:shadow-md transition-shadow"
                    data-testid={`card-task-${task.id}`}
                  >
                    <p className="font-bold text-sm text-slate-900 dark:text-white mb-1" data-testid={`text-title-${task.id}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2" data-testid={`text-assignee-${task.id}`}>
                      {task.assigned_to_name || task.assigned_to_email}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs rounded font-semibold ${
                          task.priority === "urgent"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                            : task.priority === "high"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        }`}
                        data-testid={`badge-priority-${task.id}`}
                      >
                        {task.priority === "urgent"
                          ? "Urgente"
                          : task.priority === "high"
                          ? "Alta"
                          : task.priority === "medium"
                          ? "Média"
                          : "Baixa"}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded font-semibold ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        }`}
                        data-testid={`badge-status-${task.id}`}
                      >
                        {task.status === "completed"
                          ? "Concluída"
                          : task.status === "in_progress"
                          ? "Em Andamento"
                          : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
