import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
        <SelectTrigger className="w-24 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">Português</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Español</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
