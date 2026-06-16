import { useEffect, useState } from "react";
import { Plus, FileText, BookOpen, Sparkles, TrendingUp, Headphones, Bell, ArrowRight, Zap, Target, Award, Mail, Globe, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { useDashboardStats } from "@/hooks/use-reports";
import { useTutorial } from "@/contexts/TutorialContext";
import { AtendimentoClienteModal } from "@/components/atendimento-modal";
import { useNotifications, useMarkNotificationAsRead } from "@/hooks/use-notifications";
import { PlanExpirationNotification } from "@/components/dashboard/plan-expiration-notification";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { activeStep, completeTutorialStep, isStepCompleted } = useTutorial();
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('monthly');
  const [atendimentoModalOpen, setAtendimentoModalOpen] = useState(false);
  const { data: stats, isLoading } = useDashboardStats(revenuePeriod);
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (activeStep === 'dashboard') {
      const timer = setTimeout(() => {
        completeTutorialStep('dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeStep, completeTutorialStep]);

  const defaultStats = {
    totalClients: 0,
    activeDestinations: 0,
    monthlyRevenue: 0,
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Floating Bubbles Background */}
        {/* Removed Floating Bubbles to maintain clean Neumorphism aesthetic */}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl relative z-10">
          {/* Contact Info Bar */}
          <ContactInfoBar />

          {/* Modern Glass Header */}
          <header className="mb-10">
            <div className="relative">
              {/* Neumorphic card header */}
              <div className="relative neo-extruded rounded-[32px] p-8 lg:p-10 overflow-hidden mb-10">
                <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className="relative neo-inset-deep p-3 rounded-2xl text-primary">
                          <Zap className="h-6 w-6" />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary px-4 py-1.5 rounded-full neo-inset">
                        Painel Principal
                      </span>
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-black text-foreground tracking-tight mb-3">
                      Dashboard
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium max-w-md">
                      Visão completa e em tempo real do seu negócio de viagens
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Notification Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          data-testid="button-notifications"
                          className="group relative neo-btn p-4 rounded-2xl transition-all duration-300"
                        >
                          <div className="relative">
                            <Bell className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-h-96 overflow-y-auto rounded-2xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg mb-4">Notificações</h3>
                          {notifications.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">Nenhuma notificação</p>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                onClick={() => markAsRead.mutate(notification.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-all ${
                                  notification.read
                                    ? "bg-slate-100 dark:bg-slate-800"
                                    : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700"
                                }`}
                              >
                                <p className="font-semibold text-sm">{notification.title}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(notification.created_at).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Atendimento Button */}
                    <button
                      onClick={() => setAtendimentoModalOpen(true)}
                      data-testid="button-atendimento-header"
                      className="group flex items-center gap-3 neo-btn text-foreground hover:text-primary font-bold py-4 px-6 rounded-2xl transition-all duration-300"
                    >
                      <Headphones className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                      <span>Atendimento</span>
                    </button>

                    {/* Date Display */}
                    <div className="neo-extruded rounded-2xl p-4 text-center min-w-[100px]">
                      <div className="text-2xl font-black text-foreground leading-none">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit' })}
                      </div>
                      <div className="text-sm font-semibold text-primary uppercase tracking-wide">
                        {new Date().toLocaleDateString('pt-BR', { month: 'short' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Plan Expiration Notification */}
          <PlanExpirationNotification />

          {/* Stats Cards Section */}
          <section className="mb-10">
            <StatsCards 
              stats={stats || defaultStats} 
              isLoading={isLoading}
              revenuePeriod={revenuePeriod}
              onPeriodChange={setRevenuePeriod}
            />
          </section>

          {/* Quick Actions - Modern Bubble Cards */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="neo-inset-deep p-3 rounded-2xl text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">
                  Ações Rápidas
                </h2>
                <p className="text-sm text-muted-foreground">Acesse as principais funções</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Add Client Card */}
              <div 
                onClick={() => setLocation("/clients/new")}
                data-testid="button-add-new-client"
                className="group cursor-pointer neo-btn rounded-[32px]"
              >
                <div className="p-8 flex flex-col h-full bg-transparent">
                  <div className="relative mb-6">
                    <div className="neo-inset-deep p-4 rounded-2xl inline-block text-primary">
                      <Plus className="h-8 w-8 group-hover:rotate-90 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    Adicionar Cliente
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 flex-grow">
                    Cadastre novos clientes
                  </p>
                  
                  <div className="flex items-center text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span>Começar agora</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Reports Card */}
              <div 
                onClick={() => setLocation("/reports")}
                data-testid="button-generate-report"
                className="group cursor-pointer neo-btn rounded-[32px]"
              >
                <div className="p-8 flex flex-col h-full bg-transparent">
                  <div className="relative mb-6">
                    <div className="neo-inset-deep p-4 rounded-2xl inline-block text-primary">
                      <FileText className="h-8 w-8 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    Gerar Relatório
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 flex-grow">
                    Análises e métricas
                  </p>
                  
                  <div className="flex items-center text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span>Ver relatórios</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Manual Card */}
              <div 
                onClick={() => setLocation("/manual")}
                data-testid="button-open-manual"
                className="group cursor-pointer neo-btn rounded-[32px]"
              >
                <div className="p-8 flex flex-col h-full bg-transparent">
                  <div className="relative mb-6">
                    <div className="neo-inset-deep p-4 rounded-2xl inline-block text-primary">
                      <BookOpen className="h-8 w-8 group-hover:rotate-6 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    Manual de Uso
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 flex-grow">
                    Aprenda tudo
                  </p>
                  
                  <div className="flex items-center text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span>Explorar manual</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Decorative Element */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 neo-extruded rounded-full px-6 py-3 border-none">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Sistema de Gestão de Viagens
              </span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </div>
      <AtendimentoClienteModal open={atendimentoModalOpen} onOpenChange={setAtendimentoModalOpen} />
      <WelcomeTour 
        open={!isStepCompleted('dashboard_tour')} 
        onComplete={() => completeTutorialStep('dashboard_tour')}
      />
    </>
  );
}

function ContactInfoBar() {
  const { toast } = useToast();
  
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm animate-in fade-in duration-300">
      <div className="flex items-center gap-2 neo-extruded rounded-[32px] px-4 py-2">
        <Mail className="h-4 w-4 text-primary" />
        <a 
          href="https://mail.hostinger.com/v2?_user=contato@rodabemturismo.com&_gl=1*175dd4n*_gcl_au*MjU2Mjc2NTA2LjE3NjUyMTQxODE.*FPAU*MjU2Mjc2NTA2LjE3NjUyMTQxODE.*_ga*NjQwODg2MDQ1LjE3NTcwMDI5NTQ.*_ga_73N1QWLEMH*czE3NjkyMDEwNDkkbzYzJGcxJHQxNzY5MjAxMDcxJGozOCRsMSRoNzM0MzI2MjMxJGRpVHE4X2lmWVVOY3V3X0prVzRWT2YxTE53SjBHYnREMlh3*_fplc*M1NOanclMkZub1V2OTZKbXh6WlRMdHI4cEJWSHdvNDRTNmt2UVlvWlQ3ZUxkdlBvM3NvZ29adExTZGdoRUVkbEVMNWtUZ3pEMVlpdjNMYURDcDZMRDhRYnBxVDNjejRuekZ6U0lPYW41YzRGTjBCbDNaZVljMHZPUnVVVTFHJTJCQSUzRCUzRA.."
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary transition-colors"
          data-testid="link-email"
        >
          contato@rodabemturismo.com
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 rounded-full neo-btn ml-1 hover:bg-transparent"
          onClick={() => {
            navigator.clipboard.writeText("contato@rodabemturismo.com");
            toast({
              title: "Email copiado!",
              description: "contato@rodabemturismo.com",
            });
          }}
          data-testid="button-copy-email"
        >
          <Copy className="h-3 w-3 text-primary" />
        </Button>
      </div>
      <div className="flex items-center gap-2 neo-extruded rounded-[32px] px-4 py-2">
        <Globe className="h-4 w-4 text-primary" />
        <a 
          href="https://rodabemturismo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
          data-testid="link-website"
        >
          rodabemturismo.com
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

