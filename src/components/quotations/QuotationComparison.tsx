import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trophy, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface QuotationComparisonProps {
  basketId?: string;
  onClose: () => void;
}

export const QuotationComparison = ({ basketId, onClose }: QuotationComparisonProps) => {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalQuotes: 0,
    lowestTotal: 0,
    highestTotal: 0,
    averageTotal: 0,
  });

  useEffect(() => {
    if (basketId) {
      fetchComparisons();
    }
  }, [basketId]);

  const fetchComparisons = async () => {
    if (!basketId) return;
    
    try {
      setLoading(true);
      
      // Fetch all quotes for this basket with their items
      const { data: quotes } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          supplier:suppliers(company_name, trade_name),
          quote_items(
            *,
            basket_item:basket_items(
              *,
              product:products(name, measurement_unit:measurement_units(abbreviation))
            )
          )
        `)
        .eq('basket_id', basketId as string)
        .eq('status', 'respondida');

      if (!quotes) return;

      // Calculate totals and build comparison data
      const comparisonData = quotes.map(quote => {
        const total = quote.quote_items?.reduce((sum, item) => 
          sum + (Number(item.total_price) || 0), 0) || 0;
        
        return {
          ...quote,
          calculatedTotal: total,
          itemsCount: quote.quote_items?.length || 0,
        };
      });

      // Calculate summary statistics
      const totals = comparisonData.map(q => q.calculatedTotal);
      const summaryData = {
        totalQuotes: totals.length,
        lowestTotal: Math.min(...totals),
        highestTotal: Math.max(...totals),
        averageTotal: totals.reduce((sum, total) => sum + total, 0) / totals.length,
      };

      setComparisons(comparisonData);
      setSummary(summaryData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar comparação de cotações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportComparison = async () => {
    if (!basketId) return;
    
    try {
      const { data, error } = await supabase
        .rpc('generate_quotation_report', {
          basket_id_param: basketId
        });

      if (error) throw error;

      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-cotacoes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório exportado",
        description: "O relatório foi baixado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório: " + error.message,
        variant: "destructive",
      });
    }
  };

  const findBestPrice = (itemName: string) => {
    let bestPrice = Infinity;
    let bestSupplier = "";

    comparisons.forEach(quote => {
      quote.quote_items?.forEach(item => {
        if (item.basket_item?.product?.name === itemName) {
          const price = parseFloat(item.unit_price) || 0;
          if (price < bestPrice && price > 0) {
            bestPrice = price;
            bestSupplier = quote.supplier?.company_name || "";
          }
        }
      });
    });

    return { price: bestPrice === Infinity ? 0 : bestPrice, supplier: bestSupplier };
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando comparação...</div>;
  }

  if (comparisons.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Nenhuma cotação respondida encontrada para esta cesta.</p>
      </div>
    );
  }

  // Get all unique items from all quotes
  const allItems = Array.from(new Set(
    comparisons.flatMap(quote => 
      quote.quote_items?.map(item => item.basket_item?.product?.name) || []
    )
  ));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Menor Total</p>
                <p className="font-bold text-green-600">
                  R$ {summary.lowestTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Maior Total</p>
                <p className="font-bold text-red-600">
                  R$ {summary.highestTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Média</p>
                <p className="font-bold text-blue-600">
                  R$ {summary.averageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cotações</p>
                <p className="font-bold">{summary.totalQuotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Comparação Detalhada</CardTitle>
            <Button onClick={exportComparison} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Total Geral</TableHead>
                <TableHead>Itens Cotados</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons
                .sort((a, b) => a.calculatedTotal - b.calculatedTotal)
                .map((quote, index) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                        <div>
                          <div className="font-medium">{quote.supplier?.company_name}</div>
                          <div className="text-sm text-muted-foreground">{quote.supplier?.trade_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${index === 0 ? 'text-green-600' : ''}`}>
                        R$ {quote.calculatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>{quote.itemsCount}</TableCell>
                    <TableCell>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index === 0 ? "Melhor Oferta" : "Cotado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Best Prices by Item */}
      <Card>
        <CardHeader>
          <CardTitle>Melhores Preços por Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Melhor Preço</TableHead>
                <TableHead>Fornecedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map(itemName => {
                const bestPrice = findBestPrice(itemName);
                return (
                  <TableRow key={itemName}>
                    <TableCell className="font-medium">{itemName}</TableCell>
                    <TableCell className="text-green-600 font-bold">
                      R$ {bestPrice.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{bestPrice.supplier}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};