import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, Star, CheckCircle, ArrowRight, Play, Sparkles, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useTutorial } from "@/contexts/TutorialContext";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action: string;
  route?: string;
  icon: any;
  reward: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "dashboard",
    title: "Explore o Dashboard",
    description: "Veja as estatísticas principais do seu negócio",
    action: "Ir para Dashboard",
    route: "/",
    icon: BookOpen,
    reward: "🎯 Explorador"
  },
  {
    id: "add-client",
    title: "Adicione seu Primeiro Cliente",
    description: "Aprenda a cadastrar um novo cliente no sistema",
    action: "Adicionar Cliente",
    route: "/clients/new",
    icon: Star,
    reward: "⭐ Primeira Venda"
  },
  {
    id: "view-clients",
    title: "Visualize seus Clientes",
    description: "Veja a lista de todos os clientes cadastrados",
    action: "Ver Clientes",
    route: "/clients",
    icon: CheckCircle,
    reward: "👥 Gerente"
  },
  {
    id: "add-prospect",
    title: "Cadastre um Prospecto",
    description: "Adicione leads e potenciais clientes",
    action: "Adicionar Prospecto",
    route: "/prospects/new",
    icon: Sparkles,
    reward: "🎪 Caçador de Leads"
  },
  {
    id: "reports",
    title: "Gere um Relatório",
    description: "Crie relatórios mensais com dados financeiros",
    action: "Ver Relatórios",
    route: "/reports",
    icon: Trophy,
    reward: "📊 Analista Master"
  }
];

export default function Manual() {
  const [, setLocation] = useLocation();
  const { completedSteps, setActiveStep } = useTutorial();
  const [currentStep, setCurrentStep] = useState(() => {
    return completedSteps.size;
  });

  useEffect(() => {
    setCurrentStep(completedSteps.size);
  }, [completedSteps]);

  const progress = (completedSteps.size / tutorialSteps.length) * 100;

  const handleStepAction = (step: TutorialStep, index: number) => {
    // Set the active tutorial step
    setActiveStep(step.id);
    
    // Navigate to the page
    if (step.route) {
      setLocation(step.route);
    }
  };

  const isStepCompleted = (stepId: string) => completedSteps.has(stepId);
  const isStepCurrent = (index: number) => index === currentStep;
  const isStepLocked = (index: number) => index > currentStep;

  const resetProgress = () => {
    localStorage.removeItem('tutorial_progress');
    setCurrentStep(0);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-2xl shadow-lg">
              <Play className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Tutorial Interativo
              </h1>
              <p className="text-muted-foreground">Aprenda praticando, como em um jogo!</p>
            </div>
          </div>
        </header>

        <Card className="mb-8 border-2 border-purple-200 dark:border-purple-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Seu Progresso
              </span>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {completedSteps.size}/{tutorialSteps.length}
                </Badge>
                {completedSteps.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetProgress}
                    data-testid="button-reset-tutorial"
                    className="text-xs"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reiniciar
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3 mb-2" />
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                {completedSteps.size === 0 && "Comece sua jornada! Complete os desafios abaixo"}
                {completedSteps.size > 0 && completedSteps.size < tutorialSteps.length && 
                  `Ótimo trabalho! Continue praticando`}
                {completedSteps.size === tutorialSteps.length && 
                  "🎉 Parabéns! Você dominou o sistema!"}
              </p>
              <div className="flex gap-1">
                {Array.from(completedSteps).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {tutorialSteps.map((step, index) => {
            const completed = isStepCompleted(step.id);
            const current = isStepCurrent(index);
            const locked = isStepLocked(index);
            const StepIcon = step.icon;

            return (
              <Card 
                key={step.id}
                className={`transition-all duration-300 ${
                  current ? 'border-2 border-purple-500 shadow-2xl scale-105' : 
                  completed ? 'border-green-500 border-2 bg-green-50 dark:bg-green-950' :
                  locked ? 'opacity-50' : 'border-border'
                }`}
                data-testid={`tutorial-step-${step.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      completed ? 'bg-green-500' :
                      current ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse' :
                      'bg-muted'
                    }`}>
                      {completed ? (
                        <CheckCircle className="h-8 w-8 text-white" />
                      ) : (
                        <StepIcon className={`h-8 w-8 ${current ? 'text-white' : 'text-muted-foreground'}`} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                            <Badge variant="outline" className="mr-2">
                              Passo {index + 1}
                            </Badge>
                            {step.title}
                            {current && (
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                Atual
                              </Badge>
                            )}
                          </h3>
                          <p className="text-muted-foreground mt-1">{step.description}</p>
                        </div>
                        {completed && (
                          <div className="text-right">
                            <div className="text-2xl mb-1">{step.reward.split(' ')[0]}</div>
                            <p className="text-xs text-muted-foreground">{step.reward.split(' ')[1]}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleStepAction(step, index)}
                        disabled={locked}
                        className={`mt-4 ${
                          current ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' :
                          completed ? 'bg-green-500 hover:bg-green-600' :
                          ''
                        }`}
                        data-testid={`button-${step.id}`}
                      >
                        {completed ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Revisar
                          </>
                        ) : (
                          <>
                            {step.action}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {locked && (
                        <p className="text-xs text-muted-foreground mt-2">
                          🔒 Complete o passo anterior para desbloquear
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {completedSteps.size === tutorialSteps.length && (
          <Card className="mt-8 border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full">
                  <Trophy className="h-16 w-16 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-2">🎉 Missão Completa!</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Você dominou todas as funcionalidades do sistema!
              </p>
              <div className="flex justify-center gap-2 mb-4">
                {tutorialSteps.map(step => (
                  <div key={step.id} className="text-3xl">{step.reward.split(' ')[0]}</div>
                ))}
              </div>
              <Badge className="text-lg px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500">
                ⭐ Mestre do Sistema
              </Badge>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Dicas para Aproveitar ao Máximo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <strong>Pratique com dados reais:</strong> Use o tutorial para criar seus primeiros registros reais
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 dark:bg-green-950 p-2 rounded">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <strong>Explore livremente:</strong> Depois de completar um passo, volte e explore mais recursos
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded">
                <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <strong>Refaça quando precisar:</strong> Você pode revisar qualquer passo clicando em "Revisar"
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
