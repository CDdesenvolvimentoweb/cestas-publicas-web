import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Clock, Target, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SupplierRankingData {
  supplier_id: string;
  supplier_name: string;
  total_quotes: number;
  responded_quotes: number;
  response_rate: number;
  avg_response_time_hours: number;
  total_value: number;
  ranking_score: number;
}

interface SupplierRankingProps {
  managementUnitId?: string;
}

export const SupplierRanking = ({ managementUnitId }: SupplierRankingProps) => {
  const [ranking, setRanking] = useState<SupplierRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90");

  useEffect(() => {
    fetchRanking();
  }, [managementUnitId, timeRange]);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('calculate_supplier_ranking', {
          management_unit_id_param: managementUnitId || null,
          days_back: parseInt(timeRange)
        });

      if (error) throw error;
      setRanking(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar ranking: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankingBadge = (position: number) => {
    if (position === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (position === 3) return <Trophy className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando ranking...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ranking de Fornecedores</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ranking.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum fornecedor com dados suficientes para ranking</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Cotações</TableHead>
                  <TableHead className="text-center">Taxa Resposta</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                  <TableHead className="text-center">Valor Total</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((supplier, index) => (
                  <TableRow key={supplier.supplier_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankingBadge(index + 1)}
                        <span className="font-medium">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{supplier.supplier_name}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.responded_quotes}/{supplier.total_quotes}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={supplier.response_rate >= 80 ? "default" : supplier.response_rate >= 50 ? "secondary" : "destructive"}>
                        {supplier.response_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {supplier.avg_response_time_hours 
                            ? `${supplier.avg_response_time_hours.toFixed(1)}h`
                            : "N/A"
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          R$ {supplier.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${getScoreColor(supplier.ranking_score)}`}>
                        {supplier.ranking_score.toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};