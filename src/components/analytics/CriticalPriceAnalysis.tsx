import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Shield,
  Calculator,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface PriceCriticalAnalysis {
  product_name: string;
  current_price: number;
  reference_price: number;
  variance_percentage: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  analysis_type: 'OUTLIER' | 'TREND' | 'MARKET' | 'HISTORICAL';
  confidence_score: number;
  recommendations: string[];
  data_points: number;
  last_updated: string;
}

interface PriceAlert {
  id: string;
  product_name: string;
  alert_type: 'PRICE_SPIKE' | 'PRICE_DROP' | 'MARKET_ANOMALY' | 'SUPPLIER_ISSUE';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  current_value: number;
  threshold_value: number;
  created_at: string;
}

export default function CriticalPriceAnalysis() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [criticalAnalyses, setCriticalAnalyses] = useState<PriceCriticalAnalysis[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Buscar produtos com preços para análise
  const { data: availableProducts } = useQuery({
    queryKey: ['products-for-analysis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_prices')
        .select('product_name')
        .order('product_name');
      
      if (error) throw error;
      
      const uniqueProducts = Array.from(
        new Set(data.map(item => item.product_name))
      );
      
      return uniqueProducts;
    }
  });

  // Buscar alertas de preços ativos
  const { data: activeAlerts } = useQuery({
    queryKey: ['price-alerts'],
    queryFn: async () => {
      // Simular alertas de preços (em produção, isso viria de uma tabela real)
      const alerts: PriceAlert[] = [
        {
          id: '1',
          product_name: 'Arroz tipo 1',
          alert_type: 'PRICE_SPIKE',
          severity: 'CRITICAL',
          message: 'Preço 45% acima da média histórica',
          current_value: 145.50,
          threshold_value: 100.00,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          product_name: 'Feijão carioca',
          alert_type: 'MARKET_ANOMALY',
          severity: 'WARNING',
          message: 'Variação de preços inconsistente entre fornecedores',
          current_value: 87.30,
          threshold_value: 75.00,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          product_name: 'Óleo de soja',
          alert_type: 'PRICE_DROP',
          severity: 'INFO',
          message: 'Redução significativa de preços detectada',
          current_value: 45.20,
          threshold_value: 60.00,
          created_at: new Date().toISOString()
        }
      ];
      
      return alerts;
    }
  });

  // Função para análise crítica de preços
  const performCriticalAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      // Buscar preços para análise
      let query = supabase
        .from('external_prices')
        .select('*')
        .order('date', { ascending: false });

      if (selectedProduct) {
        query = query.ilike('product_name', `%${selectedProduct}%`);
      }

      const { data: prices, error } = await query.limit(1000);
      
      if (error) throw error;

      if (!prices || prices.length === 0) {
        toast.error('Nenhum preço encontrado para análise');
        return;
      }

      // Agrupar preços por produto
      const pricesByProduct = prices.reduce((acc, price) => {
        if (!acc[price.product_name]) {
          acc[price.product_name] = [];
        }
        acc[price.product_name].push(price);
        return acc;
      }, {} as Record<string, any[]>);

      const analyses: PriceCriticalAnalysis[] = [];

      for (const [productName, productPrices] of Object.entries(pricesByProduct)) {
        if (productPrices.length < 3) continue; // Precisa de pelo menos 3 pontos

        const sortedPrices = productPrices
          .map(p => p.price)
          .sort((a, b) => a - b);

        const currentPrice = productPrices[0].price; // Mais recente
        const avgPrice = sortedPrices.reduce((sum, p) => sum + p, 0) / sortedPrices.length;
        const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
        
        // Calcular quartis para detecção de outliers
        const q1Index = Math.floor(sortedPrices.length * 0.25);
        const q3Index = Math.floor(sortedPrices.length * 0.75);
        const q1 = sortedPrices[q1Index];
        const q3 = sortedPrices[q3Index];
        const iqr = q3 - q1;
        
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        // Análise de outliers
        const isOutlier = currentPrice < lowerBound || currentPrice > upperBound;
        
        // Calcular variância percentual
        const variancePercentage = ((currentPrice - avgPrice) / avgPrice) * 100;
        
        // Determinar nível de risco
        let riskLevel: PriceCriticalAnalysis['risk_level'] = 'LOW';
        let analysisType: PriceCriticalAnalysis['analysis_type'] = 'MARKET';
        
        if (Math.abs(variancePercentage) > 50) {
          riskLevel = 'CRITICAL';
          analysisType = 'OUTLIER';
        } else if (Math.abs(variancePercentage) > 25) {
          riskLevel = 'HIGH';
          analysisType = 'TREND';
        } else if (Math.abs(variancePercentage) > 10) {
          riskLevel = 'MEDIUM';
          analysisType = 'MARKET';
        }

        // Gerar recomendações
        const recommendations: string[] = [];
        
        if (variancePercentage > 25) {
          recommendations.push('Verificar fornecedores alternativos');
          recommendations.push('Revisar especificações do produto');
          recommendations.push('Considerar negociação de preços');
        } else if (variancePercentage < -25) {
          recommendations.push('Verificar qualidade do produto');
          recommendations.push('Confirmar disponibilidade do fornecedor');
          recommendations.push('Avaliar condições comerciais');
        } else if (Math.abs(variancePercentage) > 10) {
          recommendations.push('Monitorar tendência de preços');
          recommendations.push('Comparar com outros portais');
        }

        if (isOutlier) {
          recommendations.push('Investigar possível erro de dados');
          recommendations.push('Validar informações com fornecedor');
        }

        if (recommendations.length === 0) {
          recommendations.push('Preço dentro dos parâmetros normais');
        }

        // Calcular score de confiança
        const confidenceScore = Math.min(0.95, productPrices.length / 20);

        analyses.push({
          product_name: productName,
          current_price: currentPrice,
          reference_price: avgPrice,
          variance_percentage: variancePercentage,
          risk_level: riskLevel,
          analysis_type: analysisType,
          confidence_score: confidenceScore,
          recommendations,
          data_points: productPrices.length,
          last_updated: new Date().toISOString()
        });
      }

      // Filtrar por tipo de análise se especificado
      let filteredAnalyses = analyses;
      if (analysisType !== 'all') {
        filteredAnalyses = analyses.filter(a => 
          a.analysis_type.toLowerCase() === analysisType.toLowerCase()
        );
      }

      // Filtrar por nível de risco se especificado
      if (riskFilter !== 'all') {
        filteredAnalyses = filteredAnalyses.filter(a => 
          a.risk_level.toLowerCase() === riskFilter.toLowerCase()
        );
      }

      setCriticalAnalyses(filteredAnalyses);
      
      toast.success(`Análise crítica concluída para ${filteredAnalyses.length} produtos`);
    } catch (error) {
      console.error('Erro na análise crítica:', error);
      toast.error('Erro ao realizar análise crítica de preços');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return <XCircle className="w-4 h-4" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM': return <AlertCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'PRICE_SPIKE': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'PRICE_DROP': return <TrendingDown className="w-4 h-4 text-blue-500" />;
      case 'MARKET_ANOMALY': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-50';
      case 'ERROR': return 'border-l-orange-500 bg-orange-50';
      case 'WARNING': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise Crítica de Preços</h2>
          <p className="text-muted-foreground">
            Detecção de anomalias e análise de riscos em preços
          </p>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">
            <Calculator className="w-4 h-4 mr-2" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Eye className="w-4 h-4 mr-2" />
            Monitoramento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          {/* Controles de Análise */}
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros de Análise Crítica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="text-sm font-medium">Tipo de Análise</label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="outlier">Outliers</SelectItem>
                      <SelectItem value="trend">Tendências</SelectItem>
                      <SelectItem value="market">Mercado</SelectItem>
                      <SelectItem value="historical">Histórico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível de Risco</label>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="low">Baixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={performCriticalAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Calculator className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Iniciar Análise
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados da Análise */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Resultados da Análise Crítica
                {criticalAnalyses.length > 0 && (
                  <Badge variant="secondary">
                    {criticalAnalyses.length} produtos analisados
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criticalAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {criticalAnalyses.map((analysis, index) => (
                    <Card key={index} className={`border-l-4 ${getRiskColor(analysis.risk_level).split(' ')[2]}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-lg">{analysis.product_name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge className={getRiskColor(analysis.risk_level)}>
                                {getRiskIcon(analysis.risk_level)}
                                <span className="ml-1">{analysis.risk_level}</span>
                              </Badge>
                              <Badge variant="outline">
                                {analysis.analysis_type}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold">
                                R$ {analysis.current_price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Preço Atual</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold">
                                R$ {analysis.reference_price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">Preço Referência</div>
                            </div>
                            
                            <div className="text-center">
                              <div className={`text-lg font-bold ${
                                analysis.variance_percentage > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {analysis.variance_percentage > 0 ? '+' : ''}{analysis.variance_percentage.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Variação</div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold">
                                {Math.round(analysis.confidence_score * 100)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Confiança</div>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium mb-2">Recomendações:</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {analysis.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {analysis.data_points} pontos de dados • 
                            Última atualização: {new Date(analysis.last_updated).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma análise crítica realizada ainda</p>
                  <p className="text-sm">Configure os parâmetros e clique em "Iniciar Análise"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Preços Ativos
                {activeAlerts && (
                  <Badge variant="secondary">
                    {activeAlerts.length} alertas
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAlerts && activeAlerts.length > 0 ? (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <Alert key={alert.id} className={`border-l-4 ${getAlertSeverityColor(alert.severity)}`}>
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.alert_type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{alert.product_name}</h4>
                            <Badge variant="outline" className={`${
                              alert.severity === 'CRITICAL' ? 'text-red-600' :
                              alert.severity === 'ERROR' ? 'text-orange-600' :
                              alert.severity === 'WARNING' ? 'text-yellow-600' : 'text-blue-600'
                            }`}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <AlertDescription className="mb-2">
                            {alert.message}
                          </AlertDescription>
                          <div className="text-sm text-muted-foreground">
                            Valor atual: R$ {alert.current_value.toFixed(2)} • 
                            Limite: R$ {alert.threshold_value.toFixed(2)} • 
                            {new Date(alert.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta ativo</p>
                  <p className="text-sm">Sistema monitorando preços automaticamente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Monitoramento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Configurações de monitoramento</p>
                <p className="text-sm">Em desenvolvimento - configuração de limites e alertas personalizados</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
