import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, ShoppingCart, 
  Users, Clock, DollarSign, Activity, Calendar,
  Download, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  total_baskets: number;
  total_quotes: number;
  avg_response_rate: number;
  total_savings: number;
  active_suppliers: number;
  period_days: number;
  generated_at: string;
}

interface PriceTrend {
  product_id: string;
  product_name: string;
  category_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_variance: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  quote_count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Buscar estatísticas do dashboard
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_dashboard_statistics',
        { days_back: parseInt(selectedPeriod) }
      );

      if (statsError) throw statsError;
      setStats(statsData as unknown as DashboardStats);

      // Buscar tendências de preços
      const { data: trendsData, error: trendsError } = await supabase.rpc(
        'analyze_price_trends',
        { days_back: parseInt(selectedPeriod) }
      );

      if (trendsError) throw trendsError;
      setPriceTrends((trendsData || []) as unknown as PriceTrend[]);

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados analíticos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'text-red-500';
      case 'decreasing': return 'text-green-500';
      case 'stable': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const prepareTrendChartData = () => {
    return priceTrends.slice(0, 10).map(trend => ({
      name: trend.product_name.length > 20 
        ? trend.product_name.substring(0, 20) + '...' 
        : trend.product_name,
      precoMedio: trend.avg_price,
      precoMinimo: trend.min_price,
      precoMaximo: trend.max_price,
      cotacoes: trend.quote_count,
    }));
  };

  const prepareDistributionData = () => {
    const distribution = priceTrends.reduce((acc, trend) => {
      acc[trend.trend_direction] = (acc[trend.trend_direction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([key, value]) => ({
      name: key === 'increasing' ? 'Em Alta' :
            key === 'decreasing' ? 'Em Baixa' :
            key === 'stable' ? 'Estável' : 'Dados Insuficientes',
      value,
      color: key === 'increasing' ? '#FF8042' :
             key === 'decreasing' ? '#00C49F' :
             key === 'stable' ? '#0088FE' : '#FFBB28',
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Carregando dados...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">180 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cestas Criadas</p>
                  <p className="text-2xl font-bold">{stats.total_baskets}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cotações Enviadas</p>
                  <p className="text-2xl font-bold">{stats.total_quotes}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Resposta</p>
                  <p className="text-2xl font-bold">{stats.avg_response_rate}%</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fornecedores Ativos</p>
                  <p className="text-2xl font-bold">{stats.active_suppliers}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Economia Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.total_savings)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências de Preços</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendências de Preços por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareTrendChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `R$ ${value}`} />
                    <Tooltip formatter={(value) => [`R$ ${value}`, '']} />
                    <Bar dataKey="precoMedio" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Tendências</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareDistributionData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Análise de Tendências de Preços</span>
                <Badge variant="outline">{priceTrends.length} produtos analisados</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceTrends.slice(0, 10).map((trend) => (
                  <div key={trend.product_id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium">{trend.product_name}</h4>
                      <p className="text-sm text-muted-foreground">{trend.category_name}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Preço Médio</p>
                        <p className="font-semibold">{formatCurrency(trend.avg_price)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Variação</p>
                        <p className="font-semibold">
                          {formatCurrency(trend.min_price)} - {formatCurrency(trend.max_price)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Cotações</p>
                        <p className="font-semibold">{trend.quote_count}</p>
                      </div>
                      <div className={`flex items-center gap-1 ${getTrendColor(trend.trend_direction)}`}>
                        {getTrendIcon(trend.trend_direction)}
                        <span className="capitalize text-sm">{trend.trend_direction}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Performance de Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Dados de fornecedores serão exibidos aqui
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Análise detalhada de produtos será exibida aqui
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {stats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Dados atualizados {formatDistanceToNow(new Date(stats.generated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};