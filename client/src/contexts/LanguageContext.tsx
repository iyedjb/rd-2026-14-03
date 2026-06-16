import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "pt" | "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    "crm.title": "CRM - Gestão de Tarefas",
    "crm.subtitle": "Organize e acompanhe suas tarefas de forma profissional",
    "crm.total": "Total de Tarefas",
    "crm.pending": "Pendentes",
    "crm.in_progress": "Em Andamento",
    "crm.progress": "Progresso",
    "crm.search": "Buscar tarefas...",
    "crm.my_task": "Minha Tarefa",
    "crm.assign_task": "Atribuir Tarefa",
    "crm.create_task": "Criar Minha Tarefa",
    "crm.assign": "Atribuir Tarefa",
    "crm.calendar": "Calendário de Tarefas",
    "crm.title_placeholder": "ex: Seguimento de cliente",
    "crm.description_placeholder": "Detalhes da tarefa",
    "crm.priority": "Prioridade",
    "crm.delivery_date": "Data de Entrega",
    "crm.created_by": "Criado por",
    "crm.assigned_to": "Atribuído para",
    "crm.status": "Status",
    "crm.progress_label": "Progresso",
    "crm.add_update": "Adicionar Atualização",
    "crm.save": "Salvar",
    "crm.cancel": "Cancelar",
    "nav.dashboard": "Dashboard",
    "nav.crm": "CRM",
    "nav.clients": "Clientes",
    "common.loading": "Carregando...",
    "common.error": "Erro",
    "common.success": "Sucesso!",
    "common.cancel": "Cancelar",
    "common.save": "Salvar",
  },
  en: {
    "crm.title": "CRM - Task Management",
    "crm.subtitle": "Organize and track your tasks professionally",
    "crm.total": "Total Tasks",
    "crm.pending": "Pending",
    "crm.in_progress": "In Progress",
    "crm.progress": "Progress",
    "crm.search": "Search tasks...",
    "crm.my_task": "My Task",
    "crm.assign_task": "Assign Task",
    "crm.create_task": "Create My Task",
    "crm.assign": "Assign Task",
    "crm.calendar": "Task Calendar",
    "crm.title_placeholder": "e.g., Client follow-up",
    "crm.description_placeholder": "Task details",
    "crm.priority": "Priority",
    "crm.delivery_date": "Delivery Date",
    "crm.created_by": "Created by",
    "crm.assigned_to": "Assigned to",
    "crm.status": "Status",
    "crm.progress_label": "Progress",
    "crm.add_update": "Add Update",
    "crm.save": "Save",
    "crm.cancel": "Cancel",
    "nav.dashboard": "Dashboard",
    "nav.crm": "CRM",
    "nav.clients": "Clients",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success!",
    "common.cancel": "Cancel",
    "common.save": "Save",
  },
  es: {
    "crm.title": "CRM - Gestión de Tareas",
    "crm.subtitle": "Organiza y realiza un seguimiento de tus tareas profesionalmente",
    "crm.total": "Total de Tareas",
    "crm.pending": "Pendiente",
    "crm.in_progress": "En Progreso",
    "crm.progress": "Progreso",
    "crm.search": "Buscar tareas...",
    "crm.my_task": "Mi Tarea",
    "crm.assign_task": "Asignar Tarea",
    "crm.create_task": "Crear Mi Tarea",
    "crm.assign": "Asignar Tarea",
    "crm.calendar": "Calendario de Tareas",
    "crm.title_placeholder": "p. ej., Seguimiento del cliente",
    "crm.description_placeholder": "Detalles de la tarea",
    "crm.priority": "Prioridad",
    "crm.delivery_date": "Fecha de Entrega",
    "crm.created_by": "Creado por",
    "crm.assigned_to": "Asignado a",
    "crm.status": "Estado",
    "crm.progress_label": "Progreso",
    "crm.add_update": "Agregar Actualización",
    "crm.save": "Guardar",
    "crm.cancel": "Cancelar",
    "nav.dashboard": "Panel",
    "nav.crm": "CRM",
    "nav.clients": "Clientes",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "¡Éxito!",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "pt";
  });

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const setLanguageWithStorage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageWithStorage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
