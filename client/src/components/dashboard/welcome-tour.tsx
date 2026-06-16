import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Bug, ArrowRight, Check } from "lucide-react";

interface WelcomeTourProps {
  open: boolean;
  onComplete: () => void;
}

const tourSteps = [
  {
    title: "Atualizamos!",
    description: "Bem-vindo à nova interface do nosso sistema. Implementamos um design Neumórfico super limpo e moderno, focando na cor verde oficial da empresa.",
    icon: Sparkles,
  },
  {
    title: "Novo Design",
    description: "A interface agora é composta por cartões texturizados, profundidade simulada e fontes mais nítidas para não cansar a vista durante o uso diário.",
    icon: LayoutDashboard,
  },
  {
    title: "Correções e Melhorias",
    description: "Além do visual, consertamos inconsistências nos Relatórios Financeiros, na lista de passageiros e polimos todos os fluxos de trabalho.",
    icon: Bug,
  }
];

export function WelcomeTour({ open, onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step if modal closes/opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const StepIcon = tourSteps[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent className="sm:max-w-[450px] neo-extruded border-none p-0 overflow-hidden rounded-[32px]">
        {/* Header Graphic Area */}
        <div className="bg-primary/5 p-10 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-color)_0%,transparent_70%)] opacity-5"></div>
          <div className="relative neo-inset p-5 rounded-full text-primary animate-in zoom-in duration-500">
            <StepIcon className="w-12 h-12" />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 pb-10">
          <div className="flex gap-1.5 justify-center mb-8">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "w-2 bg-primary/40" 
                      : "w-2 neo-inset bg-transparent"
                }`}
              />
            ))}
          </div>

          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentStep}>
            <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">
              {tourSteps[currentStep].title}
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              {tourSteps[currentStep].description}
            </p>
          </div>

          {/* Footer actions */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground font-semibold px-4"
            >
              Pular
            </Button>

            <Button
              onClick={handleNext}
              className="neo-btn bg-primary text-primary-foreground rounded-xl px-6 py-5 h-auto font-bold group border-0 text-[15px] hover:bg-primary/90"
            >
              {currentStep < tourSteps.length - 1 ? (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Começar
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
