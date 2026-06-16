import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TutorialContextType {
  activeStep: string | null;
  setActiveStep: (step: string | null) => void;
  completeTutorialStep: (stepId: string) => void;
  isStepCompleted: (stepId: string) => boolean;
  completedSteps: Set<string>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_KEY = 'tutorial_progress';

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedSteps)));
  }, [completedSteps]);

  const completeTutorialStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps).add(stepId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newCompleted)));
    setCompletedSteps(newCompleted);
    setActiveStep(null);
  };

  const isStepCompleted = (stepId: string) => completedSteps.has(stepId);

  return (
    <TutorialContext.Provider 
      value={{ 
        activeStep, 
        setActiveStep, 
        completeTutorialStep, 
        isStepCompleted,
        completedSteps 
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}
