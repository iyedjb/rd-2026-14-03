import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function Administrativo() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold flex items-center gap-2 mb-6">
        <ShieldCheck className="h-8 w-8 text-primary" />
        Administrativo
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-12 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Área Administrativa</h3>
            <p className="text-muted-foreground">Esta categoria está sendo preparada para receber novas funcionalidades administrativas.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
