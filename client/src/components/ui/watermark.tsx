interface WatermarkProps {
  text: string;
  subtitle?: string;
  className?: string;
}

export function Watermark({ text, subtitle, className = "" }: WatermarkProps) {
  return (
    <div 
      className={`fixed bottom-2 right-2 z-40 pointer-events-none select-none ${className}`}
      style={{ 
        opacity: 0.4,
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    >
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/20 dark:border-slate-700/50">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">
          {text}
        </div>
        {subtitle && (
          <div className="text-[10px] text-slate-500 dark:text-slate-500 text-right">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}