import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  MoreVertical,
  User,
  MessageSquare,
  Zap,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CrmTask, ChecklistItem } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";

interface CrmTaskCardProps {
  task: CrmTask;
  onUpdate: (taskId: string, updates: any) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  isPending?: boolean;
}

export function CrmTaskCard({ task, onUpdate, onDelete, isPending = false }: CrmTaskCardProps) {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [newStatus, setNewStatus] = useState(task.status || "pending");
  const [newPercentage, setNewPercentage] = useState((task.completion_percentage ?? 0).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = user?.email;
  const isAssignee = task.assigned_to_email === userEmail;
  const isCreator = task.created_by_email === userEmail;
  const canEdit = isAssignee || isCreator;

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="h-4 w-4" />,
    in_progress: <Zap className="h-4 w-4" />,
    completed: <CheckCircle2 className="h-4 w-4" />,
    cancelled: <Clock className="h-4 w-4 opacity-50" />,
  };

  const statusColors: Record<string, string> = {
    pending: "text-yellow-600 dark:text-yellow-400",
    in_progress: "text-blue-600 dark:text-blue-400",
    completed: "text-green-600 dark:text-green-400",
    cancelled: "text-gray-600 dark:text-gray-400",
  };

  const handleSaveUpdate = async () => {
    if (!newUpdate.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedUpdates = [
        ...(task.updates || []),
        {
          user_id: user?.uid || "",
          user_email: user?.email || "",
          user_name: user?.email?.split("@")[0] || "",
          message: newUpdate,
          timestamp: new Date().toISOString(),
        },
      ];

      const updateData: any = {
        updates: updatedUpdates,
        status: newStatus,
      };
      
      if (!task.checklist || task.checklist.length === 0) {
        updateData.completion_percentage = parseInt(newPercentage);
      }
      
      await onUpdate(task.id, updateData);

      setShowDialog(false);
      setNewUpdate("");
      setNewStatus(task.status);
      setNewPercentage("0");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await onUpdate(task.id, {
        status,
      });
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!task.checklist || !canEdit) return;
    
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    
    try {
      await onUpdate(task.id, {
        checklist: updatedChecklist,
      });
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  const isUrgent = task.priority === "urgent";

  return (
    <>
      <Card className={`border-l-4 hover:shadow-lg transition-all duration-300 ${
        task.status === 'completed' 
          ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' 
          : isUrgent 
            ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20 ring-2 ring-red-200 dark:ring-red-800 animate-pulse shadow-red-200 dark:shadow-red-800' 
            : 'border-l-blue-500'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleUpdateStatus(task.status === 'completed' ? 'in_progress' : 'completed')}
                    className="w-5 h-5 rounded cursor-pointer"
                    disabled={!canEdit}
                  />
                </div>
                <CardTitle className={`text-lg ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                  {task.title}
                </CardTitle>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    priorityColors[task.priority as keyof typeof priorityColors]
                  } ${isUrgent ? 'animate-pulse' : ''}`}
                >
                  {task.priority === "low"
                    ? "🟢"
                    : task.priority === "medium"
                    ? "🟡"
                    : task.priority === "high"
                    ? "🟠"
                    : "🔴"}
                </span>
                {isUrgent && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    URGENTE
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 ml-8">
                  {task.description}
                </p>
              )}
            </div>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isPending}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Adicionar Atualização
                  </DropdownMenuItem>
                  {(isAssignee || isCreator) && (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdateStatus("pending")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Pendente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus("in_progress")}>
                        <Zap className="h-4 w-4 mr-2" />
                        Em Andamento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus("completed")}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Concluída
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Owner and Assignment Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <User className="h-3 w-3" /> Criado por
              </div>
              <p className="font-medium text-slate-900 dark:text-white">
                {task.created_by_name}
              </p>
            </div>
            {task.assigned_to_name && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Atribuído para
                </div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {task.assigned_to_name}
                </p>
                {task.assigned_to_email && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {task.assigned_to_email}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Completion Percentage Progress Bar */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Progresso: {task.completion_percentage ?? 0}%
            </label>
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isUrgent 
                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}
                style={{ width: `${task.completion_percentage ?? 0}%` }}
              />
            </div>
          </div>

          {/* Checklist Section */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Checklist ({task.checklist.filter(item => item.done).length}/{task.checklist.length})
                </label>
              </div>
              <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {task.checklist.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded transition-colors ${
                      item.done 
                        ? 'bg-green-50 dark:bg-green-950/20' 
                        : 'bg-white dark:bg-slate-900'
                    }`}
                    data-testid={`checklist-item-${index}`}
                  >
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={() => handleToggleChecklistItem(item.id)}
                      disabled={!canEdit || isPending}
                      className={item.done ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' : ''}
                      data-testid={`checkbox-item-${index}`}
                    />
                    <span className={`text-sm flex-1 ${
                      item.done 
                        ? 'line-through text-slate-400 dark:text-slate-500' 
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.title}
                    </span>
                    {item.done && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 ${statusColors[task.status]}`}>
              {statusIcons[task.status as keyof typeof statusIcons]}
              {task.status === "pending"
                ? "Pendente"
                : task.status === "in_progress"
                ? "Em Andamento"
                : "Concluída"}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              • {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy", { locale: ptBR }) : 'Sem data'}
            </span>
          </div>

          {/* Comments/Updates Section */}
          {(task.updates || []).length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
              <p className="text-xs font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> 💬 COMENTÁRIOS ({(task.updates || []).length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(task.updates || []).map((update, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800 p-2.5 rounded border-l-3 border-l-purple-400 dark:border-l-purple-600"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        {update.user_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {update.timestamp ? format(new Date(update.timestamp), "dd MMM HH:mm", { locale: ptBR }) : ''}
                      </p>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {update.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Atualização</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Completion Percentage Slider */}
            <div className="space-y-2">
              <Label>Progresso: {newPercentage}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={newPercentage}
                onChange={(e) => setNewPercentage(e.target.value)}
                className="w-full"
              />
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${newPercentage}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Pendente
                    </span>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" /> Em Andamento
                    </span>
                  </SelectItem>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Concluída
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Update Message */}
            <div className="space-y-2">
              <Label>Atualização / Nota</Label>
              <textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Digite sua atualização aqui..."
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-24"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveUpdate}
                disabled={isSubmitting || !newUpdate.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Salvando..." : "Salvar Atualização"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
