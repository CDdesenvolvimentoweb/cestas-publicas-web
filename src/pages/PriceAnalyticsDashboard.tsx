import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  Filter,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

interface PriceRecord {
  id: string;
  product_description: string;
  unit_price: number;
  procurement_date: string;
  supplier_name: string;
  location_uf: string;
  location_city: string;
  source_name: string;
}

interface PriceStatistics {
  product_name: string;
  count: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  median_price: number;
  std_deviation: number;
  trend: 'up' | 'down' | 'stable';
  outliers: number;
}

interface FilterState {
  search: string;
  uf: string;
  source: string;
  dateRange: DateRange | undefined;
  priceRange: {
    min: number | null;
    max: number | null;
  };
}

const PriceAnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    uf: '',
    source: '',
    dateRange: undefined,
    priceRange: { min: null, max: null }
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');

  // Fetch price records with filters
  const { data: priceRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['price-records', filters],
    queryFn: async (): Promise<PriceRecord[]> => {
      let query = supabase
        .from('external_price_records')
        .select(`
          id,
          product_description,
          unit_price,
          procurement_date,
          supplier_name,
          location_uf,
          location_city,
          external_price_integrations!inner(source_name)
        `)
        .not('unit_price', 'is', null)
        .order('procurement_date', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.ilike('product_description', `%${filters.search}%`);
      }
      
      if (filters.uf) {
        query = query.eq('location_uf', filters.uf);
      }

      if (filters.dateRange?.from) {
        query = query.gte('procurement_date', filters.dateRange.from.toISOString());
      }
      
      if (filters.dateRange?.to) {
        query = query.lte('procurement_date', filters.dateRange.to.toISOString());
      }

      if (filters.priceRange.min !== null) {
        query = query.gte('unit_price', filters.priceRange.min);
      }
      
      if (filters.priceRange.max !== null) {
        query = query.lte('unit_price', filters.priceRange.max);
      }

      const { data, error } = await query.limit(1000);
      
      if (error) throw error;
      
      return (data || []).map(record => ({
        ...record,
        source_name: record.external_price_integrations?.source_name || 'Unknown'
      }));
    },
    enabled: true
  });

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!priceRecords) return [];

    const productGroups = priceRecords.reduce((acc, record) => {
      const key = record.product_description.toLowerCase().trim();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(record);
      return acc;
    }, {} as Record<string, PriceRecord[]>);

    return Object.entries(productGroups)
      .map(([productName, records]): PriceStatistics => {
        const prices = records.map(r => r.unit_price).sort((a, b) => a - b);
        const count = prices.length;
        const min_price = Math.min(...prices);
        const max_price = Math.max(...prices);
        const avg_price = prices.reduce((sum, price) => sum + price, 0) / count;
        
        // Calculate median
        const median_price = count % 2 === 0 
          ? (prices[count / 2 - 1] + prices[count / 2]) / 2
          : prices[Math.floor(count / 2)];

        // Calculate standard deviation
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg_price, 2), 0) / count;
        const std_deviation = Math.sqrt(variance);

        // Detect outliers (values beyond 2 standard deviations)
        const outliers = prices.filter(price => 
          Math.abs(price - avg_price) > 2 * std_deviation
        ).length;

        // Determine trend (simplified - based on recent vs older prices)
        const recentPrices = records
          .sort((a, b) => new Date(b.procurement_date).getTime() - new Date(a.procurement_date).getTime())
          .slice(0, Math.ceil(count / 3))
          .map(r => r.unit_price);
        
        const olderPrices = records
          .sort((a, b) => new Date(a.procurement_date).getTime() - new Date(b.procurement_date).getTime())
          .slice(0, Math.ceil(count / 3))
          .map(r => r.unit_price);

        const recentAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((sum, price) => sum + price, 0) / olderPrices.length;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        const trendThreshold = 0.05; // 5% change threshold
        
        if (recentAvg > olderAvg * (1 + trendThreshold)) {
          trend = 'up';
        } else if (recentAvg < olderAvg * (1 - trendThreshold)) {
          trend = 'down';
        }

        return {
          product_name: productName,
          count,
          min_price,
          max_price,
          avg_price,
          median_price,
          std_deviation,
          trend,
          outliers
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [priceRecords]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!priceRecords || !selectedProduct) return [];

    const productRecords = priceRecords
      .filter(record => 
        record.product_description.toLowerCase().includes(selectedProduct.toLowerCase())
      )
      .sort((a, b) => new Date(a.procurement_date).getTime() - new Date(b.procurement_date).getTime());

    return productRecords.map(record => ({
      date: new Date(record.procurement_date).toLocaleDateString('pt-BR'),
      price: record.unit_price,
      supplier: record.supplier_name,
      location: `${record.location_city}/${record.location_uf}`,
      source: record.source_name
    }));
  }, [priceRecords, selectedProduct]);

  const exportToExcel = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-price-data', {
        body: { filters, format: 'xlsx' }
      });
      
      if (error) throw error;
      
      // Create download link
      const blob = new Blob([data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analise-precos-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      toast.error(`Erro na exportação: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Análise de Preços</h1>
          <p className="text-muted-foreground">
            Análise detalhada dos preços coletados de fontes externas
          </p>
        </div>
        
        <Button onClick={exportToExcel} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar Produto</label>
              <Input
                placeholder="Digite o nome do produto..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={filters.uf} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, uf: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ES">Espírito Santo</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Período</label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(dateRange) => 
                  setFilters(prev => ({ ...prev, dateRange }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Fonte</label>
              <Select value={filters.source} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, source: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="PNCP">PNCP</SelectItem>
                  <SelectItem value="BPS">BPS</SelectItem>
                  <SelectItem value="SINAPI">SINAPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="outliers">Outliers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceRecords?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Preços coletados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produtos Únicos</CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Diferentes produtos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {priceRecords?.length 
                    ? (priceRecords.reduce((sum, r) => sum + r.unit_price, 0) / priceRecords.length).toFixed(2)
                    : '0,00'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Média geral
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outliers Detectados</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.reduce((sum, stat) => sum + stat.outliers, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Preços destoantes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos com Mais Registros</CardTitle>
              <CardDescription>
                Produtos com maior volume de dados coletados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.slice(0, 10).map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {stat.product_name.charAt(0).toUpperCase() + stat.product_name.slice(1)}
                        </h4>
                        {stat.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {stat.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {stat.outliers > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>{stat.count} registros</span>
                        <span>R$ {stat.min_price.toFixed(2)} - R$ {stat.max_price.toFixed(2)}</span>
                        <span>Média: R$ {stat.avg_price.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProduct(stat.product_name)}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Analisar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {selectedProduct && chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Preços - {selectedProduct}</CardTitle>
                <CardDescription>
                  Histórico de preços ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [`R$ ${value}`, 'Preço']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Additional tabs would be implemented here */}
      </Tabs>
    </div>
  );
};

export default PriceAnalyticsDashboard;