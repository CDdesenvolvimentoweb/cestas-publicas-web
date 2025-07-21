import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingBasket, CheckCircle, Clock } from 'lucide-react';

interface UnitStatsProps {
  unitId: string;
  unitName: string;
}

interface Stats {
  active_users: number;
  total_baskets: number;
  active_baskets: number;
}

export const ManagementUnitStats = ({ unitId, unitName }: UnitStatsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [unitId]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_management_unit_stats', {
        unit_id: unitId
      });

      if (error) throw error;
      setStats(data as unknown as Stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{unitName}</CardTitle>
        <CardDescription>Estatísticas da unidade gestora</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.active_users}</p>
              <p className="text-sm text-muted-foreground">Usuários Ativos</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ShoppingBasket className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total_baskets}</p>
              <p className="text-sm text-muted-foreground">Total de Cestas</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cestas em Andamento:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {stats.active_baskets}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cestas Finalizadas:</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {stats.total_baskets - stats.active_baskets}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};