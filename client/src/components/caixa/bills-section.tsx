import { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Search, Filter, ArrowUpDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useBills, useDeleteBill, useUpdateBill, useCreateBill } from "@/hooks/use-bills";
import type { Bill } from "@shared/schema";

export function BillsSection() {
  const [billType, setBillType] = useState<"pagar" | "receber">("pagar");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState({ title: "", amount: 0, dayOfMonth: "12", category: "" });

  const { data: bills, isLoading } = useBills(billType);
  const deleteBill = useDeleteBill();
  const updateBill = useUpdateBill();
  const createBill = useCreateBill();

  const statusColors = {
    pending: { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-800 dark:text-yellow-200", label: "Pendente" },
    paid: { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-800 dark:text-green-200", label: "Pago" },
    overdue: { bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-800 dark:text-red-200", label: "Atrasado" },
  } as const;

  // Helper to calculate due date from day of month
  const calculateDueDate = (dayOfMonth: string | number) => {
    const day = parseInt(String(dayOfMonth));
    const now = new Date();
    let dueDate = new Date(now.getFullYear(), now.getMonth(), day);
    // If the date is in the past, move to next month
    if (dueDate < now) {
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    return dueDate;
  };

  const filteredAndSorted = useMemo(() => {
    if (!bills || !Array.isArray(bills)) return [];
    let filtered = bills.filter(bill => {
      const matchSearch = bill.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "all" || bill.status === filterStatus;
      return matchSearch && matchStatus;
    });

    filtered.sort((a, b) => {
      let result = 0;
      if (sortBy === "date") {
        result = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else {
        result = a.amount - b.amount;
      }
      return sortOrder === "asc" ? result : -result;
    });

    return filtered;
  }, [bills, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSave = async () => {
    if (!formData.title || !formData.amount || !formData.dayOfMonth) return;

    const dueDate = calculateDueDate(formData.dayOfMonth);

    if (editingBill) {
      await updateBill.mutateAsync({
        id: editingBill.id,
        data: { ...formData, due_date: dueDate },
      });
    } else {
      await createBill.mutateAsync({
        type: billType,
        title: formData.title,
        amount: formData.amount,
        due_date: dueDate,
        category: formData.category,
      });
    }

    setDialogOpen(false);
    setEditingBill(null);
    setFormData({ title: "", amount: 0, dayOfMonth: "12", category: "" });
  };

  const handleMarkPaid = async (bill: Bill) => {
    await updateBill.mutateAsync({
      id: bill.id,
      data: { status: "paid", paid_at: new Date() },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={billType === "pagar" ? "default" : "outline"}
            onClick={() => setBillType("pagar")}
          >
            Contas a Pagar
          </Button>
          <Button
            variant={billType === "receber" ? "default" : "outline"}
            onClick={() => setBillType("receber")}
          >
            Contas a Receber
          </Button>
        </div>
        <Button onClick={() => { setEditingBill(null); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills Grid */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhuma conta encontrada</div>
        ) : (
          filteredAndSorted.map((bill) => (
            <Card key={bill.id} className={bill.status === "paid" ? "bg-green-50 dark:bg-green-950/20" : bill.status === "overdue" ? "bg-red-50 dark:bg-red-950/20 border-red-200" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{bill.title}</h3>
                      <Badge className={statusColors[bill.status as keyof typeof statusColors].bg}>
                        <span className={statusColors[bill.status as keyof typeof statusColors].text}>{statusColors[bill.status as keyof typeof statusColors].label}</span>
                      </Badge>
                      {bill.category && <Badge variant="outline">{bill.category}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(bill.due_date).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {bill.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPaid(bill)}
                      >
                        Marcar Pago
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditingBill(bill); setDialogOpen(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Excluir esta conta?")) deleteBill.mutate(bill.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingBill ? "Editar Conta" : "Nova Conta Recorrente"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                placeholder="Título (ex: Aluguel, Internet)"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <input
                placeholder="Categoria (opcional)"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <input
                type="number"
                placeholder="Valor"
                value={formData.amount || ""}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-2 py-1 border rounded text-sm"
              />
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Dia do mês (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 12 para todo dia 12"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({...formData, dayOfMonth: e.target.value})}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">A conta será recorrente todo mês neste dia</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
