import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NavSearch } from "@/components/nav-search";
import { CredentialsModal } from "@/components/credentials-modal";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileText, 
  Plane,
  Shield,
  LogOut,
  User,
  MapPin,
  PiggyBank,
  Target,
  Activity,
  Bus,
  BookOpen,
  Receipt,
  Wallet,
  Calendar,
  Building2,
  Clock,
  History,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Key,
  Sparkles,
  CreditCard,
  UserPlus,
  Trash2,
  LayoutGrid,
  Headset,
  Coins,
  Megaphone,
  UserSquare2,
  BriefcaseIcon
} from "lucide-react";
import { useState, useMemo } from "react";

function CompanyLogo({ size = 40 }: { size?: number }) {
  return (
    <div 
      className="flex-shrink-0 flex items-center justify-center neo-inset-deep rounded-full" 
      style={{ width: size, height: size }}
    >
      <div className="text-primary font-black shadow-inner flex items-center justify-center text-lg">
        R
      </div>
    </div>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavCategory {
  name: string;
  icon: any;
  items: NavItem[];
}

const navigationCategories: (NavItem | NavCategory)[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutGrid,
  },
  {
    name: "Atendimento do Cliente",
    icon: Users,
    items: [
      {
        name: "Criar Contrato",
        href: "/clients/new",
        icon: FileText,
      },
      {
        name: "Clientes cadastrados",
        href: "/clients",
        icon: Users,
      },
      {
        name: "Créditos de Clientes",
        href: "/creditos",
        icon: CreditCard,
      },
      {
        name: "Clientes Inativos",
        href: "/inactive-clients",
        icon: UserPlus,
      },
      {
        name: "Clientes Interessados",
        href: "/prospects",
        icon: UserPlus,
        badge: "Novo",
      },
      {
        name: "Histórico de Clientes",
        href: "/client-history",
        icon: History,
        badge: "Atualizado",
      },
      {
        name: "Indicações",
        href: "/indicacoes",
        icon: Users,
      },
      {
        name: "Destinos",
        href: "/destinations",
        icon: MapPin,
      },
      {
        name: "Programa de Viagens",
        href: "/programa-viagens",
        icon: Calendar,
      },
      {
        name: "Descrição de Ônibus",
        href: "/buses",
        icon: Bus,
      },
    ],
  },
  {
    name: "Finanças",
    icon: PiggyBank,
    items: [
      {
        name: "Caixa",
        href: "/caixa",
        icon: PiggyBank,
      },
      {
        name: "Parcelas",
        href: "/parcelas",
        icon: Wallet,
      },
      {
        name: "Pagamentos de Clientes",
        href: "/receipts",
        icon: Receipt,
      },
      {
        name: "Créditos de Clientes",
        href: "/creditos",
        icon: CreditCard,
      },
    ],
  },
  {
    name: "Gestão Marketing",
    icon: Sparkles,
    items: [
      {
        name: "Campanhas",
        href: "/marketing/campaigns",
        icon: Target,
      },
      {
        name: "Prospects",
        href: "/prospects",
        icon: UserPlus,
      },
    ],
  },
  {
    name: "Setor RH",
    icon: Users,
    items: [
      {
        name: "Funcionários",
        href: "/funcionarios",
        icon: Users,
      },
      {
        name: "Controle de Ponto",
        href: "/controle-de-ponto",
        icon: Clock,
      },
      {
        name: "Estrutura Organizacional",
        href: "/organizational-structure",
        icon: Building2,
      },
    ],
  },
  {
    name: "CRM",
    icon: Briefcase,
    items: [
      {
        name: "Tarefas",
        href: "/crm",
        icon: Briefcase,
      },
      {
        name: "Calendário",
        href: "/crm/calendar",
        icon: Calendar,
      },
      {
        name: "Atividade Usuários",
        href: "/user-activity",
        icon: Activity,
      },
      {
        name: "Aniversário Clientes",
        href: "/client-birthdays",
        icon: Calendar,
      },
      {
        name: "Clientes Excluídos",
        href: "/deleted-clients",
        icon: Trash2,
      },
    ],
  },
  {
    name: "Administrativo",
    icon: Shield,
    items: [
      {
        name: "Geral",
        href: "/administrativo",
        icon: Shield,
      },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, userRole, logout } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([])
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const isCategory = (item: NavItem | NavCategory): item is NavCategory => {
    return 'items' in item;
  };

  const getVisibleNavigation = () => {
    if (userRole === 'vadmin') {
      return navigationCategories;
    } else {
      const allowedPaths = ['/', '/clients', '/client-history', '/prospects', '/inactive-clients', '/destinations', '/buses', '/programa-viagens', '/caixa', '/parcelas', '/receipts', '/creditos', '/controle-de-ponto', '/crm', '/crm/calendar', '/funcionarios', '/client-birthdays', '/administrativo'];
      
      return navigationCategories.filter(item => {
        if (isCategory(item)) {
          return item.items.some(subItem => allowedPaths.includes(subItem.href));
        } else {
          return allowedPaths.includes(item.href);
        }
      }).map(item => {
        if (isCategory(item)) {
          return {
            ...item,
            items: item.items.filter(subItem => allowedPaths.includes(subItem.href))
          };
        }
        return item;
      });
    }
  };

  const visibleNav = getVisibleNavigation();
  const allPages = useMemo(() => {
    const pages: Array<{ name: string; href: string; category: string }> = [];
    
    visibleNav.forEach((item) => {
      if (isCategory(item)) {
        item.items.forEach((subItem) => {
          pages.push({
            name: subItem.name,
            href: subItem.href,
            category: item.name,
          });
        });
      } else {
        pages.push({
          name: item.name,
          href: item.href,
          category: "General",
        });
      }
    });
    
    return pages;
  }, [visibleNav]);

  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);

  return (
    <>
      <CredentialsModal isOpen={isCredentialsOpen} onClose={() => setIsCredentialsOpen(false)} />
      <aside className="relative w-64 pt-2 bg-background neo-extruded border-none flex flex-col overflow-hidden z-20">
        {/* Header section */}
        <div className="relative p-5 space-y-4">
          <div className="relative neo-inset rounded-2xl p-4">
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CompanyLogo size={40} />
                <div className="flex flex-col">
                  <h1 className="text-lg font-black text-primary leading-tight tracking-tight">
                    RODA BEM
                  </h1>
                  <h2 className="text-xs font-bold text-primary/70 leading-tight">
                    TURISMO
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsCredentialsOpen(true)}
                className="relative p-2 rounded-xl neo-btn text-primary transition-all duration-300 hover:scale-105"
                data-testid="button-credentials"
                title="Ver Senhas e Contatos"
              >
                <Key className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center font-medium tracking-wide">
              sua melhor companhia
            </p>
          </div>
          
          {/* Search box */}
          <div className="relative" style={{ zIndex: 100 }}>
            <div className="relative neo-inset rounded-xl p-0.5">
              <NavSearch pages={allPages} />
            </div>
          </div>
        </div>
        
        {/* Navigation section */}
        <nav className="flex-1 px-3 pb-3 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200/50 dark:scrollbar-thumb-emerald-800/50 scrollbar-track-transparent" style={{ zIndex: 1 }}>
          <ul className="space-y-1.5">
            {visibleNav.map((item) => {
              if (isCategory(item)) {
                const isExpanded = expandedCategories.has(item.name);
                const hasActiveChild = item.items.some(subItem => 
                  location === subItem.href || (subItem.href !== "/" && location.startsWith(subItem.href))
                );
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => toggleCategory(item.name)}
                      data-testid={`nav-category-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 text-sm font-semibold group mb-1.5 relative overflow-hidden active:scale-[0.98]",
                        isExpanded ? "neo-inset" : "neo-btn text-foreground"
                      )}
                    >
                      <div className="flex items-center z-10">
                        <div className="p-2 rounded-xl mr-3 neo-inset-deep text-primary transition-all duration-300 shadow-sm">
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-[13px] text-foreground font-bold tracking-tight">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 z-10">
                        <ChevronRight className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
                          isExpanded && "rotate-90"
                        )} />
                      </div>
                    </button>
                    {isExpanded && (
                      <ul className="mt-1.5 ml-2 space-y-1 pl-4 border-l-2 border-primary/20">
                        {item.items.map((subItem) => {
                          const isActive = location === subItem.href || 
                            (subItem.href !== "/" && location.startsWith(subItem.href));
                          
                          return (
                            <li key={subItem.name}>
                              <Link href={subItem.href}>
                                <button
                                  data-testid={`nav-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  className={cn(
                                    "w-full flex items-center px-3 py-2.5 text-left rounded-xl transition-all duration-300 text-xs font-medium group",
                                    isActive ? "neo-inset-deep text-primary scale-[1.02]" : "neo-btn text-muted-foreground hover:text-primary"
                                  )}
                                >
                                  <div className={cn(
                                    "p-1 rounded-lg mr-2.5 transition-all duration-300",
                                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                                  )}>
                                    <subItem.icon className={cn(
                                      "h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110",
                                    )} />
                                  </div>
                                  <span className={cn(
                                    !isActive && "text-muted-foreground",
                                    isActive && "font-bold"
                                  )}>{subItem.name}</span>
                                  {subItem.badge && !isActive && (
                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full shadow-sm">
                                      {subItem.badge}
                                    </span>
                                  )}
                                </button>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              } else {
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <button 
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className={cn(
                          "w-full flex items-center px-4 py-3.5 text-left rounded-2xl transition-all duration-300 text-sm font-bold group mb-2 relative overflow-hidden",
                          isActive ? "neo-inset-deep text-primary" : "neo-btn text-foreground hover:text-primary"
                        )}
                      >
                        <div className="p-2 rounded-xl mr-3 neo-inset-deep text-primary transition-all duration-300">
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-[13px] tracking-tight">{item.name}</span>
                      </button>
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
        </nav>
        
        {/* Footer section */}
        <div className="relative p-4 space-y-3">
          
          {/* User info card */}
          <div className="relative neo-inset rounded-2xl p-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl neo-inset-deep">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground truncate flex-1">{user?.email}</span>
            </div>
          </div>
          
          {/* Logout button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full neo-btn hover:text-destructive transition-all duration-300 rounded-xl text-xs font-bold border-none" 
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sair
          </Button>
          
          {/* Security badge */}
          <div className="relative overflow-hidden neo-inset-deep rounded-xl p-2.5 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-wide">Dados criptografados</span>
          </div>
        </div>
      </aside>
    </>
  );
}

