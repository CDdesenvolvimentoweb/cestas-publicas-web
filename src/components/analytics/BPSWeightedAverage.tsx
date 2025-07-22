import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  TrendingUp, 
  BarChart3,
  Download,
  Filter,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

interface BPSPrice {
  id: string;
  product_name: string;
  price: number;
  currency: string;
  date: string;
  location: string;
  supplier_name: string;
  weight?: number;
  source: string;
}

interface WeightedAverage {
  product_name: string;
  simple_average: number;
  weighted_average: number;
  total_weight: number;
  price_count: number;
  min_price: number;
  max_price: number;
  variance: number;
  standard_deviation: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

export default function BPSWeightedAverage() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [weightedAverages, setWeightedAverages] = useState<WeightedAverage[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Buscar preços do BPS
  const { data: bpsPrices } = useQuery({
    queryKey: ['bps-prices', selectedProduct, selectedLocation, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('external_prices')
        .select('*')
        .eq('source', 'BPS')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false });

      if (selectedProduct) {
        query = query.ilike('product_name', `%${selectedProduct}%`);
      }

      if (selectedLocation) {
        query = query.ilike('location', `%${selectedLocation}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as BPSPrice[];
    }
  });

  // Buscar produtos únicos
  const { data: availableProducts } = useQuery({
    queryKey: ['available-products-bps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_prices')
        .select('product_name')
        .eq('source', 'BPS')
        .order('product_name');
      
      if (error) throw error;
      
      const uniqueProducts = Array.from(
        new Set(data.map(item => item.product_name))
      );
      
      return uniqueProducts;
    }
  });

  // Buscar localizações únicas
  const { data: availableLocations } = useQuery({
    queryKey: ['available-locations-bps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_prices')
        .select('location')
        .eq('source', 'BPS')
        .not('location', 'is', null)
        .order('location');
      
      if (error) throw error;
      
      const uniqueLocations = Array.from(
        new Set(data.map(item => item.location).filter(Boolean))
      );
      
      return uniqueLocations;
    }
  });

  // Função para calcular médias ponderadas
  const calculateWeightedAverages = async () => {
    if (!bpsPrices || bpsPrices.length === 0) {
      toast.error('Nenhum preço BPS encontrado para o período selecionado');
      return;
    }

    setIsCalculating(true);

    try {
      // Agrupar preços por produto
      const pricesByProduct = bpsPrices.reduce((acc, price) => {
        if (!acc[price.product_name]) {
          acc[price.product_name] = [];
        }
        
        // Definir peso baseado na data (mais recente = maior peso)
        const daysDiff = Math.max(1, Math.floor(
          (new Date().getTime() - new Date(price.date).getTime()) / (1000 * 60 * 60 * 24)
        ));
        const weight = 1 / Math.log(daysDiff + 1); // Peso decrescente logarítmico
        
        acc[price.product_name].push({
          ...price,
          weight
        });
        
        return acc;
      }, {} as Record<string, (BPSPrice & { weight: number })[]>);

      const results: WeightedAverage[] = [];

      for (const [productName, prices] of Object.entries(pricesByProduct)) {
        // Calcular média simples
        const simpleAverage = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
        
        // Calcular média ponderada
        const totalWeight = prices.reduce((sum, p) => sum + p.weight, 0);
        const weightedSum = prices.reduce((sum, p) => sum + (p.price * p.weight), 0);
        const weightedAverage = weightedSum / totalWeight;
        
        // Calcular estatísticas
        const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);
        const minPrice = sortedPrices[0];
        const maxPrice = sortedPrices[sortedPrices.length - 1];
        
        // Calcular variância e desvio padrão
        const variance = prices.reduce((sum, p) => {
          return sum + Math.pow(p.price - simpleAverage, 2);
        }, 0) / prices.length;
        
        const standardDeviation = Math.sqrt(variance);
        
        // Calcular intervalo de confiança (95%)
        const marginOfError = 1.96 * (standardDeviation / Math.sqrt(prices.length));
        const confidenceInterval = {
          lower: Math.max(0, weightedAverage - marginOfError),
          upper: weightedAverage + marginOfError
        };

        results.push({
          product_name: productName,
          simple_average: simpleAverage,
          weighted_average: weightedAverage,
          total_weight: totalWeight,
          price_count: prices.length,
          min_price: minPrice,
          max_price: maxPrice,
          variance,
          standard_deviation: standardDeviation,
          confidence_interval: confidenceInterval
        });
      }

      // Salvar resultados calculados
      for (const result of results) {
        await supabase
          .from('price_analytics')
          .upsert({
            period_start: dateRange.start,
            period_end: dateRange.end,
            avg_price: result.weighted_average,
            median_price: result.simple_average,
            min_price: result.min_price,
            max_price: result.max_price,
            price_count: result.price_count,
            supplier_count: 1,
            sources: {
              bps_weighted_average: result.weighted_average,
              simple_average: result.simple_average,
              variance: result.variance,
              standard_deviation: result.standard_deviation,
              confidence_interval: result.confidence_interval,
              total_weight: result.total_weight
            }
          });
      }

      setWeightedAverages(results);
      toast.success(`Médias ponderadas calculadas para ${results.length} produtos`);
    } catch (error) {
      console.error('Erro ao calcular médias ponderadas:', error);
      toast.error('Erro ao calcular médias ponderadas');
    } finally {
      setIsCalculating(false);
    }
  };

  const exportResults = () => {
    if (weightedAverages.length === 0) return;

    const csvContent = [
      'Produto,Média Simples,Média Ponderada,Peso Total,Quantidade,Preço Mín,Preço Máx,Desvio Padrão,IC Inferior,IC Superior',
      ...weightedAverages.map(wa => 
        [
          wa.product_name,
          wa.simple_average.toFixed(2),
          wa.weighted_average.toFixed(2),
          wa.total_weight.toFixed(4),
          wa.price_count,
          wa.min_price.toFixed(2),
          wa.max_price.toFixed(2),
          wa.standard_deviation.toFixed(2),
          wa.confidence_interval.lower.toFixed(2),
          wa.confidence_interval.upper.toFixed(2)
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `media_ponderada_bps_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Média Ponderada BPS</h2>
          <p className="text-muted-foreground">
            Cálculo de médias ponderadas com análise estatística completa
          </p>
        </div>
        
        <Button onClick={exportResults} disabled={weightedAverages.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="filters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filters">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </TabsTrigger>
          <TabsTrigger value="results">
            <Calculator className="w-4 h-4 mr-2" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <BarChart3 className="w-4 h-4 mr-2" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros de Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os produtos</SelectItem>
                      {availableProducts?.map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Localização</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as localizações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as localizações</SelectItem>
                      {availableLocations?.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Inicial</label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Final</label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  {bpsPrices ? `${bpsPrices.length} preços encontrados` : 'Carregando...'}
                </div>
                
                <Button 
                  onClick={calculateWeightedAverages}
                  disabled={isCalculating || !bpsPrices?.length}
                >
                  {isCalculating ? (
                    <>
                      <Calculator className="w-4 h-4 mr-2 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calcular Médias
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Médias Ponderadas Calculadas
                {weightedAverages.length > 0 && (
                  <Badge variant="secondary">
                    {weightedAverages.length} produtos
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weightedAverages.length > 0 ? (
                <div className="space-y-4">
                  {weightedAverages.map((wa, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-lg">{wa.product_name}</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                R$ {wa.weighted_average.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Média Ponderada</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold">
                                R$ {wa.simple_average.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Média Simples</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold">
                                {wa.price_count}
                              </div>
                              <div className="text-xs text-muted-foreground">Amostras</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold text-red-600">
                                R$ {wa.min_price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Mínimo</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">
                                R$ {wa.max_price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Máximo</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold">
                                ±{wa.standard_deviation.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Desvio Padrão</div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium mb-1">
                              Intervalo de Confiança (95%):
                            </div>
                            <div className="text-sm text-muted-foreground">
                              R$ {wa.confidence_interval.lower.toFixed(2)} - R$ {wa.confidence_interval.upper.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma média ponderada calculada ainda</p>
                  <p className="text-sm">Configure os filtros e clique em "Calcular Médias"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Estatística</CardTitle>
            </CardHeader>
            <CardContent>
              {weightedAverages.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {weightedAverages.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Produtos Analisados</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {weightedAverages.reduce((sum, wa) => sum + wa.price_count, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total de Preços</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          R$ {(weightedAverages.reduce((sum, wa) => sum + wa.weighted_average, 0) / weightedAverages.length).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Média Geral</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Produtos com Maior Variabilidade:</h4>
                    {weightedAverages
                      .sort((a, b) => b.standard_deviation - a.standard_deviation)
                      .slice(0, 5)
                      .map((wa, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <span className="font-medium">{wa.product_name}</span>
                          <Badge variant="outline" className="text-yellow-600">
                            Desvio: ±R$ {wa.standard_deviation.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma análise disponível</p>
                  <p className="text-sm">Calcule as médias ponderadas primeiro</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
