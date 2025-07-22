import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Cell
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Calendar, 
  FileText,
  Filter,
  Download
} from 'lucide-react';

export default function PriceHistoryDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('12'); // meses
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Buscar produtos para o filtro
  const { data: products = [] } = useQuery({
    queryKey: ['catalog-products-for-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_products')
        .select(`
          id,
          name,
          description,
          product_categories (name)
        `)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Buscar categorias para o filtro
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories-for-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Buscar histórico de preços
  const { data: priceHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['price-history', selectedProduct, selectedCategory, dateRange, sourceFilter],
    queryFn: async () => {
      const startDate = subMonths(new Date(), parseInt(dateRange)).toISOString().split('T')[0];
      
      let query = supabase
        .from('price_history')
        .select(`
          *,
          catalog_products (
            id,
            name,
            product_categories (name)
          ),
          suppliers (company_name)
        `)
        .gte('reference_date', startDate)
        .order('reference_date', { ascending: true });

      if (selectedProduct && selectedProduct !== 'all') {
        query = query.eq('catalog_product_id', selectedProduct);
      }

      if (selectedCategory && selectedCategory !== 'all') {
        // Filtrar por categoria via join
        const categoryProducts = products
          .filter(p => p.product_categories?.name === categories.find(c => c.id === selectedCategory)?.name)
          .map(p => p.id);
        
        if (categoryProducts.length > 0) {
          query = query.in('catalog_product_id', categoryProducts);
        }
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source_type', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: products.length > 0 && categories.length > 0
  });

  // Processar dados para gráficos
  const chartData = useMemo(() => {
    if (!priceHistory.length) return [];

    const grouped = priceHistory.reduce((acc, item) => {
      const date = format(parseISO(item.reference_date), 'MMM yyyy', { locale: ptBR });
      
      if (!acc[date]) {
        acc[date] = {
          date,
          prices: [],
          count: 0,
          sources: new Set()
        };
      }
      
      acc[date].prices.push(item.unit_price);
      acc[date].count++;
      acc[date].sources.add(item.source_name || item.source_type);
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((group: any) => {
      const prices = group.prices.sort((a, b) => a - b);
      const len = prices.length;
      
      return {
        date: group.date,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgPrice: prices.reduce((sum, p) => sum + p, 0) / len,
        medianPrice: len % 2 === 0 
          ? (prices[len/2 - 1] + prices[len/2]) / 2 
          : prices[Math.floor(len/2)],
        count: group.count,
        sources: Array.from(group.sources).join(', ')
      };
    }).sort((a, b) => new Date(a.date + ' 01').getTime() - new Date(b.date + ' 01').getTime());
  }, [priceHistory]);

  // Estatísticas resumidas
  const statistics = useMemo(() => {
    if (!priceHistory.length) return null;

    const prices = priceHistory.map(h => h.unit_price);
    const sources = new Set(priceHistory.map(h => h.source_name || h.source_type));
    const suppliers = new Set(priceHistory.filter(h => h.supplier_id).map(h => h.supplier_id));

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const len = sortedPrices.length;

    return {
      totalRecords: priceHistory.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / len,
      medianPrice: len % 2 === 0 
        ? (sortedPrices[len/2 - 1] + sortedPrices[len/2]) / 2 
        : sortedPrices[Math.floor(len/2)],
      sourcesCount: sources.size,
      suppliersCount: suppliers.size,
      dateRange: {
        start: Math.min(...priceHistory.map(h => new Date(h.reference_date).getTime())),
        end: Math.max(...priceHistory.map(h => new Date(h.reference_date).getTime()))
      }
    };
  }, [priceHistory]);

  // Distribuição por fonte
  const sourceDistribution = useMemo(() => {
    if (!priceHistory.length) return [];

    const sources = priceHistory.reduce((acc, item) => {
      const source = item.source_name || item.source_type;
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
    
    return Object.entries(sources).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [priceHistory]);

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando histórico de preços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Dashboard de Preços Históricos
          </h2>
          <p className="text-muted-foreground">Análise de tendências e variações de preços</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produto</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                  <SelectItem value="24">Últimos 24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fonte</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  <SelectItem value="external_api">APIs Externas</SelectItem>
                  <SelectItem value="quotation">Cotações</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="import">Importação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Menor Preço</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statistics.minPrice)}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Maior Preço</p>
                  <p className="text-2xl font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statistics.maxPrice)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Preço Médio</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statistics.avgPrice)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mediana</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statistics.medianPrice)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de Preços */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução dos Preços</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tendência de preços ao longo do tempo
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `R$ ${parseFloat(value).toFixed(2)}`,
                    name === 'minPrice' ? 'Menor' :
                    name === 'maxPrice' ? 'Maior' :
                    name === 'avgPrice' ? 'Média' : 'Mediana'
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="minPrice" stroke="#10b981" name="Menor Preço" />
                <Line type="monotone" dataKey="avgPrice" stroke="#3b82f6" name="Preço Médio" />
                <Line type="monotone" dataKey="maxPrice" stroke="#ef4444" name="Maior Preço" />
                <Line type="monotone" dataKey="medianPrice" stroke="#8b5cf6" strokeDasharray="5 5" name="Mediana" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Fonte */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fonte</CardTitle>
            <p className="text-sm text-muted-foreground">
              Origem dos dados de preços
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Informações Adicionais */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resumo da Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Dados Coletados</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total de registros:</span>
                    <Badge variant="secondary">{statistics.totalRecords}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Fontes diferentes:</span>
                    <Badge variant="secondary">{statistics.sourcesCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Fornecedores:</span>
                    <Badge variant="secondary">{statistics.suppliersCount}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Período Analisado</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Data inicial:</span>
                    <span>{format(new Date(statistics.dateRange.start), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data final:</span>
                    <span>{format(new Date(statistics.dateRange.end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Variação de Preços</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Amplitude:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statistics.maxPrice - statistics.minPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Variação (%):</span>
                    <span className="font-medium">
                      {(((statistics.maxPrice - statistics.minPrice) / statistics.minPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há dados */}
      {!historyLoading && priceHistory.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Nenhum histórico de preços encontrado</p>
            <p className="text-sm text-muted-foreground text-center">
              Ajuste os filtros ou aguarde a coleta de dados das integrações externas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
