import { useState } from "react";
import { Plus, User, Trash2, Edit, UserX, DollarSign, Calendar, Mail, Phone, Briefcase, Building2, FileText, Download, Image as ImageIcon, Clipboard, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFuncionarioSchema } from "@shared/schema";
import type { InsertFuncionario, Funcionario } from "@shared/schema";
import {
  useFuncionarios,
  useCreateFuncionario,
  useUpdateFuncionario,
  useTerminateFuncionario,
  useDeleteFuncionario,
  useCreateTrialFuncionario,
  useTrialFuncionarios,
  useActivateTrialFuncionario,
  useProposals,
  useApproveProposal,
  useDeleteProposal,
} from "@/hooks/use-funcionarios";
import { TrialPeriodDialog } from "@/components/trial-period-dialog";
import { useClients, useUpdateClient, useDeleteClient } from "@/hooks/use-clients";
import type { Proposal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import { auth } from "@/lib/firebase";

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
};

export default function Funcionarios() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvingClient, setApprovingClient] = useState<Client | null>(null);
  const [approvalPhoto, setApprovalPhoto] = useState<string>("");
  const [cpfDisplay, setCpfDisplay] = useState("");
  const [proposalData, setProposalData] = useState({
    funcionario_id: '',
    funcionario_name: '',
    funcionario_position: '',
    funcionario_email: '',
    funcionario_phone: '',
    client_first_name: '',
    client_last_name: '',
    client_email: '',
    client_phone: '',
    client_cpf: '',
    client_birthdate: '',
    proposed_salary: 0,
    job_description: '',
    work_location: 'presencial' as const,
    work_days: '',
    work_hours: '',
    additional_details: '',
  });

  const { data: funcionarios = [], isLoading } = useFuncionarios();
  const { clients = [] } = useClients();
  const { data: proposals = [] } = useProposals() as any;
  const { data: trialFuncionarios = [] } = useTrialFuncionarios();
  const createFuncionario = useCreateFuncionario();
  const createTrialFuncionario = useCreateTrialFuncionario();
  const updateFuncionario = useUpdateFuncionario();
  const terminateFuncionario = useTerminateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const activateTrialFuncionario = useActivateTrialFuncionario();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const approveProposal = useApproveProposal();
  const deleteProposalMutation = useDeleteProposal();

  const form = useForm<InsertFuncionario>({
    resolver: zodResolver(insertFuncionarioSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      cpf: "",
      birthdate: undefined,
      address: "",
      nationality: "",
      education_level: undefined,
      position: "",
      department: "",
      salary: 0,
      hire_date: new Date(),
      effective_date: undefined,
      instagram: "",
      facebook: "",
      linkedin: "",
      curriculum_url: "",
      personal_story: "",
      specializations: [],
      evaluation_period_start: undefined,
      evaluation_period_end: undefined,
    },
  });

  const filteredFuncionarios = funcionarios.filter((f) => {
    if (filterActive === "active") return f.is_active;
    if (filterActive === "inactive") return !f.is_active;
    return true;
  });

  const handleApprovalClick = (proposal: Proposal) => {
    setApprovingClient(proposal as any);
    setApprovalPhoto("");
    setShowApprovalDialog(true);
  };

  const handleApprovalSubmit = async () => {
    if (!approvingClient) return;

    try {
      await approveProposal.mutateAsync({
        id: approvingClient.id,
        photo_url: approvalPhoto || undefined,
      });

      toast({
        title: "Sucesso!",
        description: `${approvingClient.first_name} foi aprovado e adicionado aos funcionários ativos!`,
      });

      setShowApprovalDialog(false);
      setApprovingClient(null);
      setApprovalPhoto("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar o candidato.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProposal = async (proposal: Proposal) => {
    if (!confirm(`Tem certeza que deseja excluir a proposta de ${proposal.client_first_name} ${proposal.client_last_name}?`)) {
      return;
    }

    try {
      await deleteProposalMutation.mutateAsync(proposal.id);
      toast({
        title: "Sucesso!",
        description: "Proposta excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a proposta.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (funcionario?: Funcionario) => {
    if (funcionario) {
      setEditingFuncionario(funcionario);
      // Convert Firebase timestamps to proper Date objects
      const toDate = (val: any) => {
        if (!val) return undefined;
        if (typeof val === 'number') return new Date(val);
        if (typeof val === 'string') return new Date(val);
        if (val instanceof Date) return val;
        return undefined;
      };
      
      form.reset({
        first_name: funcionario.first_name,
        last_name: funcionario.last_name,
        email: funcionario.email || "",
        phone: funcionario.phone || "",
        cpf: funcionario.cpf,
        birthdate: toDate(funcionario.birthdate),
        address: funcionario.address || "",
        nationality: funcionario.nationality || "",
        education_level: funcionario.education_level,
        position: funcionario.position,
        department: funcionario.department,
        salary: funcionario.salary,
        hire_date: toDate(funcionario.hire_date),
        effective_date: toDate(funcionario.effective_date),
        photo_url: funcionario.photo_url || "",
        instagram: funcionario.instagram || "",
        facebook: funcionario.facebook || "",
        linkedin: funcionario.linkedin || "",
        curriculum_url: funcionario.curriculum_url || "",
        personal_story: funcionario.personal_story || "",
        specializations: funcionario.specializations || [],
        trial_period_days: funcionario.trial_period_days,
        evaluation_period_start: toDate(funcionario.evaluation_period_start),
        evaluation_period_end: toDate(funcionario.evaluation_period_end),
      });
    } else {
      setEditingFuncionario(null);
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        cpf: "",
        birthdate: undefined,
        address: "",
        nationality: "",
        education_level: undefined,
        position: "",
        department: "",
        salary: 0,
        hire_date: new Date(),
        effective_date: undefined,
        photo_url: "",
        instagram: "",
        facebook: "",
        linkedin: "",
        curriculum_url: "",
        personal_story: "",
        specializations: [],
        trial_period_days: undefined,
        evaluation_period_start: undefined,
        evaluation_period_end: undefined,
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (data: InsertFuncionario) => {
    console.log("=== Form Submit Started ===");
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    
    const cleanedData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      birthdate: data.birthdate instanceof Date ? data.birthdate : (data.birthdate ? new Date(data.birthdate) : undefined),
      hire_date: data.hire_date instanceof Date ? data.hire_date : (data.hire_date ? new Date(data.hire_date) : new Date()),
      effective_date: data.effective_date instanceof Date ? data.effective_date : (data.effective_date ? new Date(data.effective_date) : undefined),
      evaluation_period_start: data.evaluation_period_start instanceof Date ? data.evaluation_period_start : (data.evaluation_period_start ? new Date(data.evaluation_period_start) : undefined),
      evaluation_period_end: data.evaluation_period_end instanceof Date ? data.evaluation_period_end : (data.evaluation_period_end ? new Date(data.evaluation_period_end) : undefined),
      specializations: (data.specializations || []).map(spec => ({
        title: spec.title,
        date: spec.date instanceof Date ? spec.date : (spec.date ? new Date(spec.date) : undefined),
      })),
    };
    console.log("Cleaned data:", cleanedData);
    
    try {
      if (editingFuncionario) {
        console.log("Updating funcionário:", editingFuncionario.id);
        await updateFuncionario.mutateAsync({
          id: editingFuncionario.id,
          data: cleanedData,
        });
        toast({
          title: "Sucesso!",
          description: "Funcionário atualizado com sucesso.",
        });
      } else {
        console.log("Creating new funcionário...");
        const result = await createFuncionario.mutateAsync(cleanedData);
        console.log("Create result:", result);
        toast({
          title: "Sucesso!",
          description: "Funcionário criado com sucesso.",
        });
      }
      setShowDialog(false);
    } catch (error: any) {
      console.error("Error saving funcionário:", error);
      console.error("Error details:", error.message, error.response);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o funcionário.",
        variant: "destructive",
      });
    }
  };

  const handleTerminate = (funcionario: Funcionario) => {
    setSelectedFuncionario(funcionario);
    setTerminationReason("");
    setShowTerminateDialog(true);
  };

  const generateTerminationPDF = (funcionario: Funcionario, reason: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CARTA DE DEMISSÃO", pageWidth / 2, yPosition, { align: "center" });
    yPosition += lineHeight * 2;

    // Company info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("RODABEM TURISMO", margin, yPosition);
    yPosition += lineHeight;
    doc.setFontSize(10);
    doc.text("Rua Exemplo, 123 - São Paulo, SP", margin, yPosition);
    yPosition += lineHeight;
    doc.text("CNPJ: 00.000.000/0000-00", margin, yPosition);
    yPosition += lineHeight * 2;

    // Date
    doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Employee info
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO FUNCIONÁRIO", margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${funcionario.first_name} ${funcionario.last_name}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`CPF: ${funcionario.cpf}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Cargo: ${funcionario.position}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Departamento: ${funcionario.department}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Data de Admissão: ${format(new Date(funcionario.hire_date), "dd/MM/yyyy")}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Data de Demissão: ${format(new Date(), "dd/MM/yyyy")}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Termination reason
    doc.setFont("helvetica", "bold");
    doc.text("MOTIVO DA DEMISSÃO", margin, yPosition);
    yPosition += lineHeight;
    doc.setFont("helvetica", "normal");
    
    // Word wrap for reason
    const reasonLines = doc.splitTextToSize(reason, pageWidth - (margin * 2));
    reasonLines.forEach((line: string) => {
      if (yPosition > pageHeight - margin - 50) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += lineHeight * 2;

    // Declaration
    doc.setFont("helvetica", "normal");
    const declaration = "Por meio desta carta, formalizamos o desligamento do funcionário acima mencionado de nosso quadro de colaboradores.";
    const declarationLines = doc.splitTextToSize(declaration, pageWidth - (margin * 2));
    declarationLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += lineHeight * 3;

    // Signature section
    if (yPosition > pageHeight - margin - 30) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "normal");
    doc.text("_".repeat(40), margin, yPosition);
    yPosition += lineHeight;
    doc.text("Assinatura da Empresa", margin, yPosition);
    yPosition += lineHeight * 2;

    doc.text("_".repeat(40), margin, yPosition);
    yPosition += lineHeight;
    doc.text("Assinatura do Funcionário", margin, yPosition);

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Este documento é uma comunicação oficial de desligamento e deve ser mantido em arquivo.",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Save PDF
    const fileName = `Carta_Demissao_${funcionario.first_name}_${funcionario.last_name}_${format(new Date(), "dd-MM-yyyy")}.pdf`;
    doc.save(fileName);
  };

  const confirmTermination = async () => {
    if (!selectedFuncionario || !terminationReason.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o motivo da demissão.",
        variant: "destructive",
      });
      return;
    }

    try {
      await terminateFuncionario.mutateAsync({
        id: selectedFuncionario.id,
        reason: terminationReason,
      });

      // Generate PDF after successful termination
      generateTerminationPDF(selectedFuncionario, terminationReason);

      toast({
        title: "Sucesso!",
        description: "Funcionário demitido e carta de demissão gerada.",
      });
      setShowTerminateDialog(false);
      setSelectedFuncionario(null);
      setTerminationReason("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível demitir o funcionário.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateProposal = async () => {
    try {
      const response = await fetch('/api/proposals/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.currentUser ? await auth.currentUser.getIdToken() : ''}`,
        },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proposal');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proposta-${proposalData.client_first_name}-${proposalData.client_last_name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: "Cliente criado e proposta gerada com sucesso!",
      });

      setShowProposalDialog(false);
      setProposalData({
        funcionario_id: 'admin',
        funcionario_name: 'Departamento RH',
        funcionario_position: 'Recursos Humanos',
        funcionario_email: '',
        funcionario_phone: '',
        client_first_name: '',
        client_last_name: '',
        client_email: '',
        client_phone: '',
        client_cpf: '',
        client_birthdate: '',
        proposed_salary: 0,
        job_description: '',
        work_location: 'presencial',
        work_days: '',
        work_hours: '',
        additional_details: '',
      });
    } catch (error: any) {
      console.error('Error generating proposal:', error);
      const errorMessage = error.response?.data?.error || error.message || "Não foi possível gerar a proposta.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário permanentemente?")) {
      return;
    }

    try {
      await deleteFuncionario.mutateAsync(id);
      toast({
        title: "Sucesso!",
        description: "Funcionário excluído com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o funcionário.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (funcionarioId: string, name: string) => {
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`/api/funcionarios/${funcionarioId}/termination-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `termo-demissao-${name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: "PDF baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Funcionários
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Gerenciamento de colaboradores
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Button
                    size="lg"
                    className="relative bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-2xl font-semibold text-base px-8 py-6 rounded-xl border-0 overflow-hidden group"
                    data-testid="button-actions-menu"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    <motion.div
                      animate={{ x: [0, 2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="flex items-center gap-2 relative z-10"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Plus className="h-5 w-5" />
                      </motion.div>
                      <span>Ações</span>
                      <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 mt-2 p-2 shadow-2xl border-slate-200 dark:border-slate-700">
                <DropdownMenuItem
                  onClick={() => handleOpenDialog()}
                  data-testid="menu-item-novo-funcionario"
                  className="group cursor-pointer px-4 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Plus className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">Novo Funcionário</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Adicionar um novo colaborador</p>
                    </div>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => setShowTrialDialog(true)}
                  data-testid="menu-item-trial-period"
                  className="group cursor-pointer px-4 py-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors mb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Clock className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">Período de Experiência</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Adicionar com período de prova</p>
                    </div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setSelectedFuncionario(null);
                    setProposalData({
                      funcionario_id: 'admin',
                      funcionario_name: 'Departamento RH',
                      funcionario_position: 'Recursos Humanos',
                      funcionario_email: '',
                      funcionario_phone: '',
                      client_first_name: '',
                      client_last_name: '',
                      client_email: '',
                      client_phone: '',
                      client_cpf: '',
                      client_birthdate: '',
                      proposed_salary: 0,
                      job_description: '',
                      work_location: 'presencial',
                      work_days: '',
                      work_hours: '',
                      additional_details: '',
                    });
                    setShowProposalDialog(true);
                  }}
                  data-testid="menu-item-fazer-proposta"
                  className="group cursor-pointer px-4 py-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <FileText className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">Fazer Proposta</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Criar proposta de emprego</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <Button
              variant={filterActive === "active" ? "default" : "outline"}
              onClick={() => setFilterActive("active")}
              size="sm"
              data-testid="button-filter-active"
            >
              Ativos
            </Button>
            <Button
              variant={filterActive === "inactive" ? "default" : "outline"}
              onClick={() => setFilterActive("inactive")}
              size="sm"
              data-testid="button-filter-inactive"
            >
              Demitidos
            </Button>
            <Button
              variant={filterActive === "all" ? "default" : "outline"}
              onClick={() => setFilterActive("all")}
              size="sm"
              data-testid="button-filter-all"
            >
              Todos
            </Button>
          </div>
        </div>

        {/* Trial Period Section */}
        {trialFuncionarios.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Funcionários em Período de Experiência
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(trialFuncionarios as Funcionario[]).map((funcionario) => {
                const trialEndDate = funcionario.trial_start_date && funcionario.trial_period_days
                  ? new Date(new Date(funcionario.trial_start_date).getTime() + funcionario.trial_period_days * 24 * 60 * 60 * 1000)
                  : null;
                const daysRemaining = trialEndDate
                  ? Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                  : 0;

                return (
                  <Card
                    key={funcionario.id}
                    className="bg-orange-50/80 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 shadow-lg overflow-hidden"
                    data-testid={`card-trial-funcionario-${funcionario.id}`}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                          Em Experiência
                        </span>
                        {daysRemaining <= 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                            Vencido
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {funcionario.first_name} {funcionario.last_name}
                      </h3>

                      <div className="space-y-2 mb-6 text-sm">
                        <div className="flex items-center text-slate-600 dark:text-slate-400">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <span>{funcionario.position}</span>
                        </div>
                        <div className="flex items-center text-slate-600 dark:text-slate-400">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span>{funcionario.department}</span>
                        </div>
                        <div className="flex items-center text-slate-600 dark:text-slate-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{format(new Date(funcionario.trial_start_date!), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className={`flex items-center font-semibold ${daysRemaining <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{daysRemaining <= 0 ? 'Período vencido' : `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restantes`}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => activateTrialFuncionario.mutate(funcionario.id)}
                          disabled={activateTrialFuncionario.isPending}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                          data-testid={`button-activate-trial-${funcionario.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ativar
                        </Button>
                        <Button
                          onClick={() => handleDelete(funcionario.id)}
                          disabled={deleteFuncionario.isPending}
                          variant="destructive"
                          data-testid={`button-delete-trial-${funcionario.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Proposals Section */}
        {proposals.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Candidatos Pendentes de Aprovação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(proposals as Proposal[]).map((proposal) => (
                <Card
                  key={proposal.id}
                  className="bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 shadow-lg overflow-hidden"
                  data-testid={`card-pending-proposal-${proposal.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                        Pendente de Aprovação
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                      {proposal.client_first_name} {proposal.client_last_name}
                    </h3>

                    <div className="space-y-2 mb-6">
                      {proposal.client_phone && (
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{proposal.client_phone}</span>
                        </div>
                      )}
                      {proposal.client_email && (
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="truncate">{proposal.client_email}</span>
                        </div>
                      )}
                      {proposal.work_location && (
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <span>{proposal.work_location}</span>
                        </div>
                      )}
                      {proposal.job_description && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-yellow-200 dark:border-yellow-700">
                          <p className="line-clamp-2"><strong>Cargo:</strong> {proposal.job_description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprovalClick(proposal)}
                        disabled={approveProposal.isPending}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        data-testid={`button-approve-proposal-${proposal.id}`}
                      >
                        {approveProposal.isPending ? "Aprovando..." : "Aprovar Candidato"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteProposal(proposal)}
                        disabled={deleteProposalMutation.isPending}
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-proposal-${proposal.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Employee Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">Carregando...</p>
          </div>
        ) : filteredFuncionarios.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Nenhum funcionário encontrado
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFuncionarios.map((funcionario) => (
              <Card
                key={funcionario.id}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-white/20 dark:border-slate-700/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                data-testid={`card-funcionario-${funcionario.id}`}
              >
                <div className="p-6">
                  {/* Photo Section */}
                  {funcionario.photo_url && (
                    <div className="mb-4 -mx-6 -mt-6">
                      <img
                        src={funcionario.photo_url}
                        alt={`${funcionario.first_name} ${funcionario.last_name}`}
                        className="w-full h-40 object-cover"
                        data-testid={`img-photo-${funcionario.id}`}
                      />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        funcionario.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {funcionario.is_active ? "Ativo" : "Demitido"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(funcionario)}
                        data-testid={`button-edit-${funcionario.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {funcionario.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTerminate(funcionario)}
                          data-testid={`button-terminate-${funcionario.id}`}
                        >
                          <UserX className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(funcionario.id)}
                        data-testid={`button-delete-${funcionario.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    {funcionario.first_name} {funcionario.last_name}
                  </h3>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Briefcase className="h-4 w-4 mr-2" />
                      <span className="font-medium">{funcionario.position}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Building2 className="h-4 w-4 mr-2" />
                      <span>{funcionario.department}</span>
                    </div>
                    {funcionario.email && (
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{funcionario.email}</span>
                      </div>
                    )}
                    {funcionario.phone && (
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{funcionario.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Admitido em {format(new Date(funcionario.hire_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center text-lg font-bold text-green-600 dark:text-green-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <DollarSign className="h-5 w-5 mr-1" />
                      <span>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(funcionario.salary)}
                      </span>
                    </div>
                    {!funcionario.is_active && funcionario.termination_date && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          Demitido em {format(new Date(funcionario.termination_date), "dd/MM/yyyy")}
                        </p>
                        {funcionario.termination_reason && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Motivo: {funcionario.termination_reason}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={() => handleDownloadPDF(funcionario.id, `${funcionario.first_name}-${funcionario.last_name}`)}
                          data-testid={`button-download-pdf-${funcionario.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Baixar Termo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFuncionario ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do funcionário
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  {...form.register("first_name")}
                  data-testid="input-first-name"
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.first_name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Sobrenome *</Label>
                <Input
                  id="last_name"
                  {...form.register("last_name")}
                  data-testid="input-last-name"
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                data-testid="input-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={form.watch("cpf") || ""}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    form.setValue("cpf", formatted);
                  }}
                  maxLength={14}
                  placeholder="123.456.789-00"
                  data-testid="input-cpf"
                />
                {form.formState.errors.cpf && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.cpf.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Cargo *</Label>
                <Input
                  id="position"
                  {...form.register("position")}
                  data-testid="input-position"
                />
                {form.formState.errors.position && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.position.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="department">Departamento *</Label>
                <Input
                  id="department"
                  {...form.register("department")}
                  data-testid="input-department"
                />
                {form.formState.errors.department && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.department.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salary">Salário (R$) *</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  {...form.register("salary", { valueAsNumber: true })}
                  data-testid="input-salary"
                />
                {form.formState.errors.salary && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.salary.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="hire_date">Data de Admissão *</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={
                    (form.watch("hire_date")
                      ? form.watch("hire_date") instanceof Date
                        ? (form.watch("hire_date") as Date).toISOString().split('T')[0]
                        : String(form.watch("hire_date"))
                      : "") as string
                  }
                  onChange={(e) => {
                    form.setValue("hire_date", e.target.value ? new Date(e.target.value) : new Date());
                  }}
                  data-testid="input-hire-date"
                />
                {form.formState.errors.hire_date && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.hire_date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-3">Informações Pessoais</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthdate">Data de Nascimento</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={
                    (form.watch("birthdate")
                      ? form.watch("birthdate") instanceof Date
                        ? (form.watch("birthdate") as Date).toISOString().split('T')[0]
                        : String(form.watch("birthdate"))
                      : "") as string
                  }
                  onChange={(e) => {
                    form.setValue("birthdate", e.target.value ? new Date(e.target.value) : undefined);
                  }}
                  data-testid="input-birthdate"
                />
              </div>
              <div>
                <Label htmlFor="nationality">Filiação / Nacionalidade</Label>
                <Input
                  id="nationality"
                  {...form.register("nationality")}
                  placeholder="Ex: Brasileira"
                  data-testid="input-nationality"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Rua, número, bairro, cidade"
                data-testid="input-address"
              />
            </div>

            <div>
              <Label htmlFor="education_level">Escolaridade</Label>
              <select
                id="education_level"
                {...form.register("education_level")}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                data-testid="input-education-level"
              >
                <option value="">Selecionar...</option>
                <option value="fundamental">Fundamental</option>
                <option value="medio">Médio</option>
                <option value="superior">Superior</option>
                <option value="pos_graduacao">Pós-graduação</option>
              </select>
            </div>

            {/* Social Media */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-3">Redes Sociais</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  {...form.register("instagram")}
                  placeholder="@usuario"
                  data-testid="input-instagram"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  {...form.register("facebook")}
                  placeholder="Usuario"
                  data-testid="input-facebook"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  {...form.register("linkedin")}
                  placeholder="linkedin.com/in/usuario"
                  data-testid="input-linkedin"
                />
              </div>
            </div>

            {/* Qualifications */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-3">Qualificações</h3>
            </div>

            <div>
              <Label htmlFor="curriculum_url">Currículo (Upload)</Label>
              <Input
                id="curriculum_url"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      form.setValue("curriculum_url", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                data-testid="input-curriculum-url"
              />
              <p className="text-xs text-slate-500 mt-1">PDF, DOC ou DOCX</p>
            </div>

            <div>
              <Label htmlFor="personal_story">Conte Sua História</Label>
              <Textarea
                id="personal_story"
                {...form.register("personal_story")}
                placeholder="Descreva sua trajetória profissional, experiências relevantes..."
                rows={3}
                data-testid="input-personal-story"
              />
            </div>

            {/* Employment Details */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-3">Detalhes de Emprego</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_date">Data de Efetivação</Label>
                <Input
                  id="effective_date"
                  type="date"
                  {...form.register("effective_date", {
                    setValueAs: (v) => (v ? new Date(v) : undefined),
                  })}
                  data-testid="input-effective-date"
                />
              </div>
              <div>
                <Label htmlFor="trial_period_days">Período de Experiência (dias)</Label>
                <Input
                  id="trial_period_days"
                  type="number"
                  min="0"
                  {...form.register("trial_period_days", { valueAsNumber: true })}
                  placeholder="Ex: 30, 60, 90"
                  data-testid="input-trial-period-days"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="evaluation_period_start">Período de Avaliação - Início</Label>
                <Input
                  id="evaluation_period_start"
                  type="date"
                  {...form.register("evaluation_period_start", {
                    setValueAs: (v) => (v ? new Date(v) : undefined),
                  })}
                  data-testid="input-evaluation-period-start"
                />
              </div>
              <div>
                <Label htmlFor="evaluation_period_end">Período de Avaliação - Fim</Label>
                <Input
                  id="evaluation_period_end"
                  type="date"
                  {...form.register("evaluation_period_end", {
                    setValueAs: (v) => (v ? new Date(v) : undefined),
                  })}
                  data-testid="input-evaluation-period-end"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specializations">Cursos e Especializações</Label>
              <div className="space-y-2">
                {(form.watch("specializations") || []).map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <Input
                      placeholder="Título do curso/especialização"
                      value={spec.title}
                      onChange={(e) => {
                        const specs = form.getValues("specializations") || [];
                        specs[idx].title = e.target.value;
                        form.setValue("specializations", specs);
                      }}
                      className="flex-1"
                      data-testid={`input-specialization-title-${idx}`}
                    />
                    <Input
                      type="date"
                      value={spec.date ? new Date(spec.date).toISOString().split('T')[0] : ""}
                      onChange={(e) => {
                        const specs = form.getValues("specializations") || [];
                        specs[idx].date = e.target.value ? new Date(e.target.value) : undefined;
                        form.setValue("specializations", specs);
                      }}
                      className="w-32"
                      data-testid={`input-specialization-date-${idx}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const specs = form.getValues("specializations") || [];
                        form.setValue("specializations", specs.filter((_, i) => i !== idx));
                      }}
                      data-testid={`button-remove-specialization-${idx}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const specs = form.getValues("specializations") || [];
                    form.setValue("specializations", [...specs, { title: "", date: undefined }]);
                  }}
                  data-testid="button-add-specialization"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Especialização
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="photo_url">Foto de Perfil</Label>
              <Input
                id="photo_url"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      form.setValue("photo_url", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                data-testid="input-photo-url"
              />
              <p className="text-xs text-slate-500 mt-1">Selecione uma imagem do seu dispositivo</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createFuncionario.isPending || updateFuncionario.isPending}
                data-testid="button-submit-funcionario"
              >
                {createFuncionario.isPending || updateFuncionario.isPending
                  ? "Salvando..."
                  : editingFuncionario
                  ? "Atualizar"
                  : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fazer Proposta</DialogTitle>
            <DialogDescription>
              Crie uma proposta profissional para um novo candidato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_first_name">Nome do Cliente *</Label>
                  <Input
                    id="client_first_name"
                    value={proposalData.client_first_name}
                    onChange={(e) => setProposalData({ ...proposalData, client_first_name: e.target.value })}
                    data-testid="input-client-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="client_last_name">Sobrenome do Cliente *</Label>
                  <Input
                    id="client_last_name"
                    value={proposalData.client_last_name}
                    onChange={(e) => setProposalData({ ...proposalData, client_last_name: e.target.value })}
                    data-testid="input-client-last-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_phone">Telefone *</Label>
                  <Input
                    id="client_phone"
                    value={proposalData.client_phone}
                    onChange={(e) => setProposalData({ ...proposalData, client_phone: e.target.value })}
                    placeholder="(31) 99999-9999"
                    data-testid="input-client-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={proposalData.client_email}
                    onChange={(e) => setProposalData({ ...proposalData, client_email: e.target.value })}
                    data-testid="input-client-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_cpf">CPF</Label>
                  <Input
                    id="client_cpf"
                    value={proposalData.client_cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setProposalData({ ...proposalData, client_cpf: formatted });
                    }}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    data-testid="input-client-cpf"
                  />
                </div>
                <div>
                  <Label htmlFor="client_birthdate">Data de Nascimento</Label>
                  <Input
                    id="client_birthdate"
                    type="date"
                    value={proposalData.client_birthdate}
                    onChange={(e) => setProposalData({ ...proposalData, client_birthdate: e.target.value })}
                    data-testid="input-client-birthdate"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proposed_salary">Salário Proposto (R$) *</Label>
                <Input
                  id="proposed_salary"
                  type="number"
                  step="0.01"
                  value={proposalData.proposed_salary}
                  onChange={(e) => setProposalData({ ...proposalData, proposed_salary: parseFloat(e.target.value) })}
                  data-testid="input-proposed-salary"
                />
              </div>

              <div>
                <Label htmlFor="job_description">Descrição do Trabalho *</Label>
                <Textarea
                  id="job_description"
                  value={proposalData.job_description}
                  onChange={(e) => setProposalData({ ...proposalData, job_description: e.target.value })}
                  placeholder="Descreva as responsabilidades e atividades..."
                  rows={3}
                  data-testid="input-job-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work_location">Local de Trabalho *</Label>
                  <select
                    id="work_location"
                    value={proposalData.work_location}
                    onChange={(e) => setProposalData({ ...proposalData, work_location: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    data-testid="input-work-location"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="work_days">Dias de Trabalho *</Label>
                  <Input
                    id="work_days"
                    value={proposalData.work_days}
                    onChange={(e) => setProposalData({ ...proposalData, work_days: e.target.value })}
                    placeholder="Ex: Segunda a Sexta"
                    data-testid="input-work-days"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="work_hours">Horário de Trabalho</Label>
                <Input
                  id="work_hours"
                  value={proposalData.work_hours}
                  onChange={(e) => setProposalData({ ...proposalData, work_hours: e.target.value })}
                  placeholder="Ex: 08:00 às 17:00"
                  data-testid="input-work-hours"
                />
              </div>

              <div>
                <Label htmlFor="additional_details">Observações Adicionais</Label>
                <Textarea
                  id="additional_details"
                  value={proposalData.additional_details}
                  onChange={(e) => setProposalData({ ...proposalData, additional_details: e.target.value })}
                  placeholder="Informações adicionais sobre a proposta..."
                  rows={2}
                  data-testid="input-additional-details"
                />
              </div>
            </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowProposalDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateProposal}
              disabled={!proposalData.client_first_name || !proposalData.client_last_name || !proposalData.client_phone || !proposalData.job_description || proposalData.proposed_salary === 0}
              data-testid="button-generate-proposal"
            >
              <Download className="mr-2 h-4 w-4" />
              Criar Cliente e Gerar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog - Photo Upload */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Candidato</DialogTitle>
            <DialogDescription>
              Envie a foto do candidato para ativar na equipe
            </DialogDescription>
          </DialogHeader>
          {approvingClient && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {approvingClient.first_name} {approvingClient.last_name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {approvingClient.phone}
                </p>
              </div>

              <div>
                <Label htmlFor="approval_photo">Foto do Funcionário</Label>
                <Input
                  id="approval_photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setApprovalPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  data-testid="input-approval-photo"
                />
                <p className="text-xs text-slate-500 mt-1">Selecione uma foto (opcional)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApprovalSubmit}
              disabled={approveProposal.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              data-testid="button-submit-approval"
            >
              {approveProposal.isPending ? "Ativando..." : "Ativar Funcionário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <UserX className="h-5 w-5" />
              Demitir Funcionário
            </DialogTitle>
            <DialogDescription>
              Esta ação irá desativar o funcionário e gerar uma carta de demissão em PDF.
            </DialogDescription>
          </DialogHeader>
          {selectedFuncionario && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedFuncionario.first_name} {selectedFuncionario.last_name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedFuncionario.position} - {selectedFuncionario.department}
                </p>
              </div>
              <div>
                <Label htmlFor="termination_reason">Motivo da Demissão *</Label>
                <Textarea
                  id="termination_reason"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="Descreva o motivo da demissão..."
                  rows={4}
                  data-testid="input-termination-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTerminateDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmTermination}
              disabled={terminateFuncionario.isPending || !terminationReason.trim()}
              data-testid="button-confirm-terminate"
            >
              <FileText className="mr-2 h-4 w-4" />
              {terminateFuncionario.isPending ? "Processando..." : "Demitir e Gerar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Period Dialog */}
      <TrialPeriodDialog
        isOpen={showTrialDialog}
        onClose={() => setShowTrialDialog(false)}
        onSubmit={(data) => createTrialFuncionario.mutateAsync(data)}
        isLoading={createTrialFuncionario.isPending}
      />
    </div>
  );
}
