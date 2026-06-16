import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Page {
  name: string;
  href: string;
  category: string;
}

interface NavSearchProps {
  pages: Page[];
}

export function NavSearch({ pages }: NavSearchProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredPages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return pages.filter(
      (page) =>
        page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, pages]);

  const groupedPages = useMemo(() => {
    const groups: Record<string, Page[]> = {};
    filteredPages.forEach((page) => {
      if (!groups[page.category]) {
        groups[page.category] = [];
      }
      groups[page.category].push(page);
    });
    return groups;
  }, [filteredPages]);

  const handleSelect = (href: string) => {
    setLocation(href);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" style={{ zIndex: 100 }}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500/70 dark:text-emerald-400/70 pointer-events-none" />
        <Input
          placeholder="Buscar página..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-9 pr-4 h-10 text-xs rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200/50 dark:border-emerald-700/50 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
        />
      </div>

      {isOpen && filteredPages.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden overflow-y-auto"
          style={{ 
            zIndex: 9999,
            backgroundColor: 'white',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            maxHeight: '280px'
          }}
        >
          {Object.entries(groupedPages).map(([category, categoryPages]) => (
            <div key={category}>
              <div 
                className="px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase text-emerald-600 flex items-center gap-1.5 border-b border-emerald-100"
                style={{ backgroundColor: '#ecfdf5' }}
              >
                <Sparkles className="h-3 w-3" />
                {category}
              </div>
              {categoryPages.map((page) => (
                <button
                  key={page.href}
                  onClick={() => handleSelect(page.href)}
                  className="w-full text-left px-4 py-3 text-xs text-slate-700 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-2.5 group"
                  style={{ backgroundColor: 'white' }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-emerald-500 group-hover:scale-125 transition-all duration-200"></div>
                  <span className="font-medium">{page.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
