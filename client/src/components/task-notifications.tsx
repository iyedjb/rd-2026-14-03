import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useCrmTasks } from "@/hooks/use-crm-tasks";
import type { CrmTask } from "@shared/schema";

export function TaskNotifications() {
  const { user } = useAuth();
  const { data: tasks = [] } = useCrmTasks();
  const [notifications, setNotifications] = useState<CrmTask[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    // Get tasks assigned to current user that are not completed
    const myPendingTasks = tasks.filter(
      (task) =>
        task.assigned_to_email === user.email &&
        task.status !== "completed" &&
        new Date(task.due_date) <= new Date(Date.now() + 86400000) // Due within 24 hours
    );
    setNotifications(myPendingTasks);
  }, [tasks, user?.email]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {show ? (
        <Card className="w-96 max-h-80 shadow-2xl">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-bold">Tarefas Próximas de Vencer ({notifications.length})</h3>
            </div>
          </div>

          <div className="space-y-2 p-4">
            {notifications.map((task) => (
              <div
                key={task.id}
                className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded"
              >
                <p className="font-medium text-sm text-slate-900 dark:text-white">
                  {task.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Vence: {new Date(task.due_date).toLocaleDateString("pt-BR")}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 text-xs rounded">
                    {task.priority === "urgent" ? "🔴 Urgente" : "🟡 " + task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShow(false)}
            className="w-full p-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 border-t"
          >
            Fechar
          </button>
        </Card>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="relative bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <Bell className="h-6 w-6" />
          {notifications.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {notifications.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
