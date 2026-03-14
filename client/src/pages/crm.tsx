import { useState, useMemo } from "react";
import { Plus, Search, Users, BarChart3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChecklistItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCrmTasks, useCreateCrmTask, useUpdateCrmTask, useDeleteCrmTask } from "@/hooks/use-crm-tasks";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CrmTaskCard } from "@/components/crm/crm-task-card";
import type { CrmTask } from "@shared/schema";
import { Clock, Zap, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CRM() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { data: allUsers = [] } = useUsers();
  const { data: tasks = [], isLoading } = useCrmTasks();
  const createTask = useCreateCrmTask();
  const updateTask = useUpdateCrmTask();
  const deleteTask = useDeleteCrmTask();

  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByPerson, setFilterByPerson] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskDelivery, setNewTaskDelivery] = useState<string>("");
  const [newTaskChecklist, setNewTaskChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const isVAdmin = userRole === "vadmin";

  // Filter out deleted users
  const activeUsers = useMemo(() => {
    const deletedEmails = [
      'sawsen@rodabemturismo.com',
      'isamara@rodabemturismo.com',
      'client@vuro.com.br',
      'ciient@vuro.com.br',
      'isabelly@rodabemturismo.com'
    ];
    return allUsers.filter(u => !deletedEmails.includes(u.email?.toLowerCase()));
  }, [allUsers]);

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set(tasks.map(t => t.assigned_to_name).filter(Boolean));
    return Array.from(assignees).sort();
  }, [tasks]);

  // Filter and sort tasks - urgent first, then by due date
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Person filter for vadmin - when a specific person is selected, show ALL their tasks regardless of tab
      const matchesPerson = filterByPerson === "all" || task.assigned_to_name === filterByPerson;
      
      // Tab filter - only applied when showing "all" people, not when filtered by specific person
      const matchesTab = filterByPerson !== "all" 
        ? true // Show all tasks for selected person
        : (activeTab === "archived" 
          ? task.status === "completed"
          : task.status !== "completed");

      return matchesSearch && matchesPerson && matchesTab;
    });

    // Sort: urgent tasks first, then by due date (earliest first)
    return filtered.sort((a, b) => {
      // Urgent tasks always come first
      const aIsUrgent = a.priority === "urgent";
      const bIsUrgent = b.priority === "urgent";
      
      if (aIsUrgent && !bIsUrgent) return -1;
      if (!aIsUrgent && bIsUrgent) return 1;
      
      // Then sort by due date (earliest first)
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      
      return aDate - bDate;
    });
  }, [tasks, searchTerm, activeTab, filterByPerson]);

  // Calculate statistics
  const stats = useMemo(() => {
    const myTasks = tasks.filter((t) => t.assigned_to_email === user?.email);
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const total = tasks.length;

    return { total, completed, pending, inProgress };
  }, [tasks, user?.uid]);

  const handleCreateTask = async () => {
    if (!newTaskTitle || !newTaskAssignee || !newTaskDelivery) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!isVAdmin) {
      toast({
        title: "Acesso Negado",
        description: "Apenas VAdmins podem criar tarefas",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignee = allUsers.find((u) => u.id === newTaskAssignee);
      await createTask.mutateAsync({
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        assigned_to_email: assignee?.email || "",
        assigned_to_name: assignee?.email?.split("@")[0] || "",
        due_date: new Date(newTaskDelivery),
        checklist: newTaskChecklist.length > 0 ? newTaskChecklist : undefined,
        created_by_email: user?.email || "",
        created_by_name: user?.email?.split("@")[0] || "",
        created_by_role: userRole || "admin",
      } as any);

      toast({
        title: "Sucesso!",
        description: "Tarefa criada com sucesso",
      });

      setShowCreateTaskDialog(false);
      resetTaskForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar tarefa",
        variant: "destructive",
      });
    }
  };

  const resetTaskForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskAssignee("");
    setNewTaskDelivery("");
    setNewTaskChecklist([]);
    setNewChecklistItem("");
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newChecklistItem.trim(),
      done: false,
      order: newTaskChecklist.length,
    };
    setNewTaskChecklist([...newTaskChecklist, newItem]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (itemId: string) => {
    setNewTaskChecklist(newTaskChecklist.filter(item => item.id !== itemId));
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates,
      } as any);
      toast({
        title: "Sucesso!",
        description: "Tarefa atualizada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta tarefa?")) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast({
        title: "Sucesso!",
        description: "Tarefa deletada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao deletar tarefa",
        variant: "destructive",
      });
    }
  };

  const generateReport = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(24);
      doc.setTextColor(20, 20, 40);
      doc.text("Relatório de Tarefas", 20, yPosition);
      yPosition += 10;

      // Date info
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 120);
      const today = new Date();
      const dateStr = today.toLocaleDateString("pt-BR");
      doc.text(`${dateStr} • Último Mês`, 20, yPosition);
      yPosition += 16;

      // Group tasks by assignee
      const tasksByPerson = new Map<string, CrmTask[]>();
      tasks.forEach((task) => {
        const personName = task.assigned_to_name || "Sem Atribuição";
        if (!tasksByPerson.has(personName)) {
          tasksByPerson.set(personName, []);
        }
        tasksByPerson.get(personName)!.push(task);
      });

      // Generate section for each person
      tasksByPerson.forEach((personTasks, personName) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        // Person name and role
        doc.setFontSize(14);
        doc.setTextColor(20, 20, 40);
        doc.text(personName, 20, yPosition);
        
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 160);
        doc.text("Admin", pageWidth - 30, yPosition, { align: "right" });
        yPosition += 8;

        // Stats
        const completed = personTasks.filter(t => t.status === "completed").length;
        const total = personTasks.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const avgCompletion = personTasks.length > 0 
          ? Math.round(personTasks.reduce((sum, t) => sum + (t.completion_percentage || 0), 0) / personTasks.length)
          : 0;

        // Stats boxes with subtle coloring
        const statBoxWidth = (pageWidth - 40) / 4;
        const statBoxHeight = 14;
        const statBoxY = yPosition;

        // Total
        doc.setFillColor(245, 245, 250);
        doc.rect(20, statBoxY, statBoxWidth, statBoxHeight, "F");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 120);
        doc.text("Total", 20 + 4, statBoxY + 4);
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 80);
        doc.text(total.toString(), 20 + 4, statBoxY + 11);

        // Completed
        doc.setFillColor(240, 250, 240);
        doc.rect(20 + statBoxWidth, statBoxY, statBoxWidth, statBoxHeight, "F");
        doc.setFontSize(10);
        doc.setTextColor(80, 140, 80);
        doc.text("Concluídas", 20 + statBoxWidth + 4, statBoxY + 4);
        doc.setFontSize(12);
        doc.setTextColor(40, 120, 40);
        doc.text(completed.toString(), 20 + statBoxWidth + 4, statBoxY + 11);

        // Completion rate
        doc.setFillColor(245, 250, 255);
        doc.rect(20 + statBoxWidth * 2, statBoxY, statBoxWidth, statBoxHeight, "F");
        doc.setFontSize(10);
        doc.setTextColor(80, 120, 160);
        doc.text("Taxa Conclusão", 20 + statBoxWidth * 2 + 4, statBoxY + 4);
        doc.setFontSize(12);
        doc.setTextColor(50, 100, 180);
        doc.text(`${completionRate}%`, 20 + statBoxWidth * 2 + 4, statBoxY + 11);

        // Average progress
        doc.setFillColor(250, 250, 240);
        doc.rect(20 + statBoxWidth * 3, statBoxY, statBoxWidth, statBoxHeight, "F");
        doc.setFontSize(10);
        doc.setTextColor(140, 120, 80);
        doc.text("Progresso Médio", 20 + statBoxWidth * 3 + 4, statBoxY + 4);
        doc.setFontSize(12);
        doc.setTextColor(180, 140, 40);
        doc.text(`${avgCompletion}%`, 20 + statBoxWidth * 3 + 4, statBoxY + 11);

        yPosition += statBoxHeight + 12;

        // Tasks table
        const tableData = personTasks.map((task) => [
          task.title.length > 30 ? task.title.substring(0, 30) + "..." : task.title,
          task.status === "completed" ? "✓ Concluída" : task.status === "in_progress" ? "⟳ Em Andamento" : "○ Pendente",
          task.priority === "urgent" ? "🔴 Urgente" : task.priority === "high" ? "🟠 Alta" : task.priority === "medium" ? "🟡 Média" : "🟢 Baixa",
          `${task.completion_percentage || 0}%`,
        ]);

        if (tableData.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [["Tarefa", "Status", "Prioridade", "Progresso"]],
            body: tableData,
            margin: 20,
            headStyles: {
              fillColor: [230, 230, 245],
              textColor: [60, 60, 80],
              fontSize: 10,
              fontStyle: "bold",
            },
            bodyStyles: {
              fontSize: 9,
              textColor: [80, 80, 100],
            },
            alternateRowStyles: {
              fillColor: [252, 252, 255],
            },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 40 },
              2: { cellWidth: 40 },
              3: { cellWidth: 30 },
            },
          });
          yPosition = (doc as any).lastAutoTable.finalY + 12;
        }

        yPosition += 8;
      });

      // Download
      doc.save("relatorio-tarefas.pdf");
      toast({
        title: "Sucesso!",
        description: "Relatório gerado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar relatório",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Tarefas</h1>
          <p className="text-slate-600 dark:text-slate-400">Gerenciar e acompanhar tarefas de toda a equipe</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total</div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
                <span className="text-slate-400 dark:text-slate-600"><Users className="h-5 w-5" /></span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Pendentes</div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-yellow-600">{stats.pending}</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Em Andamento</div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-blue-600">{stats.inProgress}</span>
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Concluídas</div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-green-600">{stats.completed}</span>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter by User Section */}
        {isVAdmin && (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-white">Filtrar por Usuário</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={filterByPerson === "all" ? "default" : "outline"}
                      onClick={() => setFilterByPerson("all")}
                      className={filterByPerson === "all" ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      👥 Todos ({uniqueAssignees.length})
                    </Button>
                    {uniqueAssignees.map((name) => (
                      <Button
                        key={name}
                        variant={filterByPerson === name ? "default" : "outline"}
                        onClick={() => setFilterByPerson(name)}
                        className={filterByPerson === name ? "bg-blue-600 hover:bg-blue-700" : ""}
                        size="sm"
                      >
                        👤 {name}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="ml-auto"
                    onClick={generateReport}
                    data-testid="button-generate-report"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs and Actions */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="active" className="flex items-center gap-1">
                📋 Tarefas Ativas
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-1">
                ✓ Concluídas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isVAdmin && (
            <Button
              onClick={() => setShowCreateTaskDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-create-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              data-testid="input-search-tasks"
            />
          </div>
          <Select defaultValue="todas">
            <SelectTrigger className="w-32 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white dark:bg-slate-900">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-slate-600 dark:text-slate-400">Carregando tarefas...</div>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-4 flex items-center justify-center text-slate-300 dark:text-slate-600">
                    🔍
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                    Nenhuma tarefa encontrada
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <CrmTaskCard
                key={task.id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                isPending={updateTask.isPending || deleteTask.isPending}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Atribua uma tarefa a um usuário do sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input
                placeholder="ex: Seguimento de cliente"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="mt-1"
                data-testid="input-task-title"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <textarea
                placeholder="Detalhes da tarefa"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-20"
                data-testid="input-task-description"
              />
            </div>

            {/* Checklist Builder */}
            <div className="space-y-2">
              <Label>Checklist (Subtarefas)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar item ao checklist..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
                  className="flex-1"
                  data-testid="input-checklist-item"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addChecklistItem}
                  className="shrink-0"
                  data-testid="button-add-checklist-item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newTaskChecklist.length > 0 && (
                <div className="space-y-1 mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  {newTaskChecklist.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {index + 1}. {item.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChecklistItem(item.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-checklist-${index}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prioridade</Label>
                <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                  <SelectTrigger className="mt-1" data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data de Entrega *</Label>
                <Input
                  type="date"
                  value={newTaskDelivery}
                  onChange={(e) => setNewTaskDelivery(e.target.value)}
                  className="mt-1"
                  data-testid="input-task-delivery"
                />
              </div>
            </div>

            <div>
              <Label>Atribuir para (Email) *</Label>
              <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                <SelectTrigger className="mt-1" data-testid="select-task-assignee">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email} ({u.role === 'vadmin' ? 'VAdmin' : 'Admin'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={createTask.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-task"
              >
                {createTask.isPending ? "Criando..." : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
