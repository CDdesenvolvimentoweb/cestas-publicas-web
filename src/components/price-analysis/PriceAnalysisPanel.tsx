import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PriceAnalysisItem {
  id: string;
  price_source: string;
  original_price: number;
  price_deviation_percentage: number;
  is_excluded_from_average: boolean;
  exclusion_reason: string;
}

interface PriceAnalysisPanelProps {
  basketId: string;
  basketItemId: string;
  prices: Array<{
    source: string;
    price: number;
    date?: string;
  }>;
  onExcludePrice: (source: string, exclude: boolean, reason?: string) => void;
}

export const PriceAnalysisPanel: React.FC<PriceAnalysisPanelProps> = ({
  basketId,
  basketItemId,
  prices,
  onExcludePrice
}) => {
  const [analysis, setAnalysis] = useState<PriceAnalysisItem[]>([]);
  const [exclusionReason, setExclusionReason] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calcular estatísticas
  const activePrices = prices.filter(p => 
    !analysis.find(a => a.price_source === p.source && a.is_excluded_from_average)
  );
  
  const mean = activePrices.reduce((sum, p) => sum + p.price, 0) / activePrices.length;
  const sortedPrices = activePrices.map(p => p.price).sort((a, b) => a - b);
  const median = sortedPrices.length % 2 === 0
    ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
    : sortedPrices[Math.floor(sortedPrices.length / 2)];
  const min = Math.min(...activePrices.map(p => p.price));
  const max = Math.max(...activePrices.map(p => p.price));

  // Calcular desvios percentuais
  const pricesWithDeviation = prices.map(price => {
    const deviation = ((price.price - mean) / mean) * 100;
    const isOutlier = Math.abs(deviation) > 20; // Threshold de 20%
    
    return {
      ...price,
      deviation,
      isOutlier,
      isExcluded: analysis.find(a => a.price_source === price.source && a.is_excluded_from_average) || false
    };
  });

  const loadAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('price_analysis')
        .select('*')
        .eq('basket_item_id', basketItemId);

      if (error) throw error;
      setAnalysis(data || []);
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
    }
  };

  const handleExcludePrice = async (source: string, exclude: boolean) => {
    if (exclude && !exclusionReason.trim()) {
      toast({
        title: "Justificativa necessária",
        description: "Informe o motivo para excluir este preço.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (exclude) {
        // Criar registro de exclusão
        const { error } = await supabase
          .from('price_analysis')
          .upsert({
            basket_id: basketId,
            basket_item_id: basketItemId,
            price_source: source,
            original_price: prices.find(p => p.source === source)?.price || 0,
            price_deviation_percentage: pricesWithDeviation.find(p => p.source === source)?.deviation || 0,
            is_excluded_from_average: true,
            exclusion_reason: exclusionReason
          });

        if (error) throw error;
      } else {
        // Remover exclusão
        const { error } = await supabase
          .from('price_analysis')
          .delete()
          .eq('basket_item_id', basketItemId)
          .eq('price_source', source);

        if (error) throw error;
      }

      onExcludePrice(source, exclude, exclusionReason);
      setSelectedSource(null);
      setExclusionReason('');
      loadAnalysis();

      toast({
        title: exclude ? "Preço excluído" : "Preço incluído",
        description: exclude 
          ? "O preço foi excluído do cálculo da média."
          : "O preço foi incluído novamente no cálculo.",
      });
    } catch (error) {
      console.error('Erro ao atualizar análise:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a análise.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [basketItemId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Análise Crítica de Preços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Média</div>
            <div className="font-semibold">{formatCurrency(mean)}</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Mediana</div>
            <div className="font-semibold">{formatCurrency(median)}</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Menor</div>
            <div className="font-semibold text-green-600">{formatCurrency(min)}</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-xs text-muted-foreground">Maior</div>
            <div className="font-semibold text-red-600">{formatCurrency(max)}</div>
          </div>
        </div>

        {/* Lista de preços com análise */}
        <div className="space-y-2">
          {pricesWithDeviation.map((price) => (
            <div key={price.source} className={`border rounded-lg p-3 ${
              price.isExcluded ? 'bg-muted/50 opacity-60' : ''
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{price.source}</span>
                    {price.isOutlier && !price.isExcluded && (
                      <Badge variant="destructive" className="text-xs">
                        Outlier
                      </Badge>
                    )}
                    {price.isExcluded && (
                      <Badge variant="outline" className="text-xs">
                        Excluído
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {price.date && `Data: ${new Date(price.date).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(price.price)}</div>
                  <div className={`text-xs flex items-center gap-1 ${
                    price.deviation > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {price.deviation > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(price.deviation).toFixed(1)}%
                  </div>
                </div>

                <div className="ml-4">
                  {!price.isExcluded ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSource(price.source)}
                      disabled={loading}
                    >
                      Excluir
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExcludePrice(price.source, false)}
                      disabled={loading}
                    >
                      Incluir
                    </Button>
                  )}
                </div>
              </div>

              {price.isExcluded && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>Motivo:</strong> {
                    analysis.find(a => a.price_source === price.source)?.exclusion_reason
                  }
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dialog de exclusão */}
        {selectedSource && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong>Excluir preço de: {selectedSource}</strong>
                </div>
                <Textarea
                  placeholder="Informe o motivo para excluir este preço (obrigatório)"
                  value={exclusionReason}
                  onChange={(e) => setExclusionReason(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleExcludePrice(selectedSource, true)}
                    disabled={loading || !exclusionReason.trim()}
                  >
                    Confirmar Exclusão
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSource(null);
                      setExclusionReason('');
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Alertas automáticos */}
        {pricesWithDeviation.some(p => p.isOutlier && !p.isExcluded) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Foram detectados preços com desvio superior a 20% da média. 
              Recomenda-se análise individual para verificar a pertinência destes valores.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};