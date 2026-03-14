import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        {
          "h-4 w-4": size === "sm",
          "h-8 w-8": size === "md",
          "h-12 w-12": size === "lg",
        },
        className
      )}
      data-testid="loading-spinner"
    />
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" data-testid="page-loading">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-600 dark:text-gray-300">Carregando...</p>
      </div>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50" data-testid="fullpage-loading">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-lg text-gray-700 dark:text-gray-200">Inicializando aplicação...</p>
      </div>
    </div>
  );
}