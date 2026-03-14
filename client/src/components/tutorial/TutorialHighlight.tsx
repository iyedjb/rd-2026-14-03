import { ReactNode } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { Card } from '@/components/ui/card';
import { ArrowDown, Sparkles } from 'lucide-react';

interface TutorialHighlightProps {
  stepId: string;
  children: ReactNode;
  message?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function TutorialHighlight({ 
  stepId, 
  children, 
  message,
  position = 'top' 
}: TutorialHighlightProps) {
  const { activeStep } = useTutorial();
  const isActive = activeStep === stepId;

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {message && position === 'top' && (
        <Card className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl animate-in fade-in slide-in-from-top-2 w-max max-w-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
          <ArrowDown className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-pink-500 h-6 w-6" />
        </Card>
      )}
      
      <div className="relative animate-tutorial-wave">
        <div className="absolute inset-0 -m-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-75 blur animate-pulse" />
        <div className="relative">
          {children}
        </div>
      </div>

      {message && position === 'bottom' && (
        <Card className="absolute -bottom-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 w-max max-w-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
