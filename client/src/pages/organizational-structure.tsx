import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowUp, Building2, Settings } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DepartmentList } from "@/components/departments/department-list";
import { DepartmentForm } from "@/components/departments/department-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OrganizationalStructure() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasSeeded = useRef(false);

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments/active"],
  });

  const { data: allDepartments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: userRole === 'vadmin',
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/departments/seed`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments/active"] });
      hasSeeded.current = true;
      toast({
        title: "Departamentos criados",
        description: "A estrutura organizacional foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      hasSeeded.current = true;
      if (!error.message.includes("Departments already exist")) {
        toast({
          title: "Aviso",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (userRole === 'vadmin' && !isLoading && allDepartments.length === 0 && !hasSeeded.current && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [userRole, isLoading, allDepartments.length]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (departmentId: string) => {
    const element = document.getElementById(`department-${departmentId}`);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const handleAdd = () => {
    setEditingDepartment(undefined);
    setShowForm(true);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDepartment(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDepartment(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando estrutura...</p>
        </div>
      </div>
    );
  }

  if (userRole === 'vadmin' && (isManaging || showForm)) {
    return (
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Estrutura Organizacional</h2>
            <p className="text-muted-foreground">
              {showForm ? (editingDepartment ? "Editar departamento" : "Adicionar novo departamento") : "Gerencie os departamentos da agência"}
            </p>
          </div>
          {!showForm && (
            <Button
              variant="outline"
              onClick={() => setIsManaging(false)}
              data-testid="button-view-structure"
            >
              Ver Estrutura
            </Button>
          )}
        </div>

        {showForm ? (
          <div className="max-w-3xl">
            <DepartmentForm
              department={editingDepartment}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <DepartmentList onAdd={handleAdd} onEdit={handleEdit} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
            Estrutura Organizacional da Agência
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
            Conheça todos os setores, funções e responsabilidades que compõem nossa agência.
          </p>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full" />

          {userRole === 'vadmin' && departments.length > 0 && (
            <Button
              onClick={() => setIsManaging(true)}
              variant="outline"
              className="mt-4"
              data-testid="button-manage-departments"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Departamentos
            </Button>
          )}
        </div>

        {departments.length > 0 && (
          <div className="mb-8 bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Navegação Rápida
            </h3>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <Button
                  key={dept.id}
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToSection(dept.id)}
                  className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                  data-testid={`button-nav-${dept.id}`}
                >
                  {dept.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {departments.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {seedMutation.isPending ? "Criando estrutura organizacional..." : "Nenhum departamento encontrado"}
              </h3>
              <p className="text-muted-foreground">
                {seedMutation.isPending 
                  ? "Aguarde enquanto criamos a estrutura inicial da agência."
                  : "A estrutura organizacional será exibida aqui quando os departamentos forem adicionados."}
              </p>
              {userRole === 'vadmin' && !seedMutation.isPending && (
                <Button
                  onClick={() => setIsManaging(true)}
                  className="mt-4"
                  data-testid="button-start-managing"
                >
                  Gerenciar Departamentos
                </Button>
              )}
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {departments.map((dept) => (
                <AccordionItem
                  key={dept.id}
                  value={dept.id}
                  id={`department-${dept.id}`}
                  className="bg-card border rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md"
                  data-testid={`accordion-department-${dept.id}`}
                >
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors [&[data-state=open]]:bg-primary/5">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground" data-testid={`text-dept-name-${dept.id}`}>
                          {dept.name}
                        </h3>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 bg-muted/20">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-primary mb-2">Função:</h4>
                        <p className="text-foreground leading-relaxed" data-testid={`text-dept-description-${dept.id}`}>
                          {dept.description}
                        </p>
                      </div>

                      {dept.responsible && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-2">Responsável:</h4>
                          <p className="text-foreground" data-testid={`text-dept-responsible-${dept.id}`}>
                            {dept.responsible}
                          </p>
                        </div>
                      )}

                      {dept.subsectors && dept.subsectors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-primary mb-3">Subsetores e Funções:</h4>
                          <ul className="space-y-3">
                            {dept.subsectors.map((subsector, index) => (
                              <li key={index} className="flex gap-3" data-testid={`list-subsector-${dept.id}-${index}`}>
                                <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground">{subsector.title}</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {subsector.description}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <footer className="mt-12 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-footer">
            © 2025 Agência — Estrutura Organizacional. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          data-testid="button-back-to-top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
