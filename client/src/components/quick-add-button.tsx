import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateClient } from "@/hooks/use-clients";
import { useCreateCrmTask } from "@/hooks/use-crm-tasks";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import type { InsertClient } from "@shared/schema";
import { toTitleCase } from "@/lib/utils";

export function QuickAddButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<"choose" | "client" | "task">("choose");
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: allUsers = [] } = useUsers();
  
  // Client creation form state
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientCPF, setClientCPF] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientType, setClientType] = useState<"agencia" | "operadora">("agencia");
  const [clientDestination, setClientDestination] = useState("");
  const [clientDuration, setClientDuration] = useState("3");

  // Task creation form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [taskAssignee, setTaskAssignee] = useState<string>(user?.uid || "");
  const [taskDelivery, setTaskDelivery] = useState("");

  const createClient = useCreateClient();
  const createTask = useCreateCrmTask();
  const isVAdmin = (user as any)?.role === "vadmin";

  const resetForms = () => {
    setClientFirstName("");
    setClientLastName("");
    setClientCPF("");
    setClientPhone("");
    setClientEmail("");
    setClientType("agencia");
    setClientDestination("");
    setClientDuration("3");
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("medium");
    setTaskAssignee(user?.uid || "");
    setTaskDelivery("");
    setMode("choose");
  };

  const handleCreateClient = async () => {
    if (!clientFirstName || !clientLastName || !clientCPF || !clientPhone || !clientDestination || !clientDuration) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = new Date();
      const clientData: InsertClient = {
        first_name: clientFirstName,
        last_name: clientLastName,
        birthdate: today,
        cpf: clientCPF,
        phone: clientPhone,
        email: clientEmail || undefined,
        client_type: clientType,
        destination: clientDestination,
        duration: parseInt(clientDuration),
        contract_type: "normal",
        is_brinde: false,
      };

      createClient.mutate(clientData, {
        onSuccess: () => {
          toast({
            title: "Sucesso!",
            description: "Cliente criado com sucesso",
          });
          setShowDialog(false);
          resetForms();
        },
        onError: () => {
          toast({
            title: "Erro",
            description: "Falha ao criar cliente",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar cliente",
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle || !taskDelivery) {
      toast({
        title: "Erro",
        description: "Por favor, preencha título e data de entrega",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTask.mutateAsync({
        title: taskTitle,
        description: taskDescription || undefined,
        priority: taskPriority,
        owner_user_id: user?.uid || "",
        owner_email: user?.email || "",
        owner_name: user?.email?.split("@")[0] || "",
        assigned_to_email: allUsers.find((u) => u.id === taskAssignee)?.email || "",
        assigned_to_name: allUsers.find((u) => u.id === taskAssignee)?.email?.split("@")[0] || "",
        assigned_by_user_id: user?.uid || "",
        assigned_by_email: user?.email || "",
        assigned_by_name: user?.email?.split("@")[0] || "",
        due_date: taskDelivery,
        status: "pending",
        completion_percentage: 0,
      } as any);

      toast({
        title: "Sucesso!",
        description: "Tarefa criada com sucesso",
      });
      setShowDialog(false);
      resetForms();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar tarefa",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Floating Quick Add Button */}
      <button
        onClick={() => {
          setShowDialog(true);
          setMode("choose");
        }}
        className="fixed bottom-8 right-8 z-40 group"
      >
        <div className="relative inline-flex">
          {/* Animated ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
          {/* Button */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transform transition-all duration-300 group-hover:scale-110 cursor-pointer flex items-center justify-center">
            <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-500" />
          </div>
        </div>
      </button>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDialog(false);
          resetForms();
        } else {
          setShowDialog(true);
        }
      }}>
        <DialogContent className="max-w-md border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl">
          {mode === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Adicionar Novo</DialogTitle>
                <DialogDescription>
                  Escolha o que deseja adicionar rapidamente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <button
                  onClick={() => setMode("client")}
                  className="w-full p-4 text-left border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                      <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Novo Cliente</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Adicione um cliente rapidamente</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMode("task")}
                  className="w-full p-4 text-left border-2 border-green-200 dark:border-green-800 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                      <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Nova Tarefa</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Crie uma nova tarefa</p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === "client" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados principais do cliente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Nome"
                      value={clientFirstName}
                      onChange={(e) => setClientFirstName(toTitleCase(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Sobrenome *</Label>
                    <Input
                      placeholder="Sobrenome"
                      value={clientLastName}
                      onChange={(e) => setClientLastName(toTitleCase(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>CPF *</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={clientCPF}
                    onChange={(e) => setClientCPF(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="cliente@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Tipo *</Label>
                  <Select value={clientType} onValueChange={(v: any) => setClientType(v)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agencia">Agência</SelectItem>
                      <SelectItem value="operadora">Operadora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Destino *</Label>
                  <Input
                    placeholder="ex: Praia Grande"
                    value={clientDestination}
                    onChange={(e) => setClientDestination(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Duração (dias) *</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={clientDuration}
                    onChange={(e) => setClientDuration(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button variant="outline" onClick={() => setMode("choose")}>
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreateClient}
                    disabled={createClient.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createClient.isPending ? "Criando..." : "Criar Cliente"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {mode === "task" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Crie uma nova tarefa rapidamente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    placeholder="ex: Seguimento de cliente"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Detalhes da tarefa (opcional)"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Prioridade</Label>
                  <Select value={taskPriority} onValueChange={(v: any) => setTaskPriority(v)}>
                    <SelectTrigger className="mt-2">
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
                  <Label>Atribuir para {isVAdmin && "(Apenas Admins)"}</Label>
                  <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter((u) => isVAdmin ? u.role === "admin" : u.role === "admin" || u.id === user?.uid)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data de Entrega *</Label>
                  <Input
                    type="date"
                    value={taskDelivery}
                    onChange={(e) => setTaskDelivery(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button variant="outline" onClick={() => setMode("choose")}>
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={createTask.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createTask.isPending ? "Criando..." : "Criar Tarefa"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
