import { Users, TrendingUp, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ReferralStatistic {
  referrer_id: string;
  referrer_name: string;
  referral_count: number;
  total_revenue: number;
}

export default function Indicacoes() {
  const { data: statistics = [], isLoading } = useQuery<ReferralStatistic[]>({
    queryKey: ['/api/referrals/statistics'],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalReferrals = statistics.reduce((sum, stat) => sum + stat.referral_count, 0);
  const totalRevenue = statistics.reduce((sum, stat) => sum + stat.total_revenue, 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Indicações
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe os clientes que trouxeram novos clientes através de indicações
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Indicadores
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrers">
              {isLoading ? <Skeleton className="h-8 w-16" /> : statistics.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes que fizeram indicações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Indicações
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalReferrals}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes indicados no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Total de Indicações
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita gerada por indicações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Indicadores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : statistics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma indicação registrada ainda.</p>
              <p className="text-sm mt-2">
                Quando clientes indicarem novos clientes, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente Indicador</TableHead>
                  <TableHead className="text-center">Indicações</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistics.map((stat, index) => (
                  <TableRow key={stat.referrer_id} data-testid={`row-referrer-${stat.referrer_id}`}>
                    <TableCell className="font-medium">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && index + 1}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-referrer-name-${stat.referrer_id}`}>
                      {stat.referrer_name}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-referral-count-${stat.referrer_id}`}>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {stat.referral_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-revenue-${stat.referrer_id}`}>
                      {formatCurrency(stat.total_revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
