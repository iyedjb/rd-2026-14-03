import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useCrmTasks } from "@/hooks/use-crm-tasks";
import { useAuth } from "@/hooks/use-auth";

type WidgetId = "total" | "pending" | "in_progress" | "completed" | "completion_rate" | "upcoming";

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
}

export function CustomizableDashboard() {
  const { user } = useAuth();
  const { data: tasks = [] } = useCrmTasks();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: "total", label: "Total de Tarefas", visible: true },
    { id: "pending", label: "Pendentes", visible: true },
    { id: "in_progress", label: "Em Andamento", visible: true },
    { id: "completed", label: "Concluídas", visible: true },
    { id: "completion_rate", label: "Taxa de Conclusão", visible: true },
    { id: "upcoming", label: "Próximas de Vencer", visible: true },
  ]);
  const [isEditing, setIsEditing] = useState(false);

  // Load saved widget config
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_widgets");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading widget config:", e);
      }
    }
  }, []);

  // Save widget config
  const saveWidgetConfig = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem("dashboard_widgets", JSON.stringify(newWidgets));
  };

  const toggleWidget = (id: WidgetId) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    saveWidgetConfig(updated);
  };

  const resetToDefault = () => {
    const defaults: WidgetConfig[] = [
      { id: "total", label: "Total de Tarefas", visible: true },
      { id: "pending", label: "Pendentes", visible: true },
      { id: "in_progress", label: "Em Andamento", visible: true },
      { id: "completed", label: "Concluídas", visible: true },
      { id: "completion_rate", label: "Taxa de Conclusão", visible: true },
      { id: "upcoming", label: "Próximas de Vencer", visible: true },
    ];
    saveWidgetConfig(defaults);
  };

  // Calculate metrics
  const myTasks = tasks.filter((t) => t.assigned_to_email === user?.email);
  const stats = {
    total: myTasks.length,
    pending: myTasks.filter((t) => t.status === "pending").length,
    in_progress: myTasks.filter((t) => t.status === "in_progress").length,
    completed: myTasks.filter((t) => t.status === "completed").length,
    completion_rate: myTasks.length > 0 ? Math.round((myTasks.filter((t) => t.status === "completed").length / myTasks.length) * 100) : 0,
    upcoming: myTasks.filter((t) => {
      const daysUntil = (new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 3 && daysUntil > 0 && t.status !== "completed";
    }).length,
  };

  const visibleWidgets = widgets.filter((w) => w.visible);

  if (isEditing) {
    return (
      <div className="space-y-4 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-500">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Personalizar Dashboard</h3>
          <Button size="sm" onClick={() => setIsEditing(false)}>
            Pronto
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {widgets.map((widget) => (
            <button
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                widget.visible
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {widget.visible ? (
                  <Eye className="h-4 w-4 text-blue-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                )}
                <span className="font-medium text-sm">{widget.label}</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={resetToDefault}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setIsEditing(true)} variant="outline">
        Personalizar Dashboard
      </Button>

      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(visibleWidgets.length, 3)} gap-4`}>
        {widgets.map((widget) => {
          if (!widget.visible) return null;

          const value = stats[widget.id as keyof typeof stats];
          const colors: Record<WidgetId, { bg: string; text: string }> = {
            total: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-600 dark:text-blue-400" },
            pending: { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-600 dark:text-yellow-400" },
            in_progress: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-600 dark:text-purple-400" },
            completed: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-600 dark:text-green-400" },
            completion_rate: { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-600 dark:text-indigo-400" },
            upcoming: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-600 dark:text-red-400" },
          };

          const color = colors[widget.id];

          return (
            <Card key={widget.id} className="bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {widget.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${color.text}`}>
                  {widget.id === "completion_rate" ? `${value}%` : value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
