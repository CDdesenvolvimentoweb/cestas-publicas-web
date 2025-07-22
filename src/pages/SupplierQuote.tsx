import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const SupplierQuote = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [quote, setQuote] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (token) {
      fetchQuoteData();
    }
  }, [token]);

  const fetchQuoteData = async () => {
    try {
      setLoading(true);
      
      // First verify the token
      const { data: tokenData } = await supabase
        .from('supplier_quote_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (!tokenData || tokenData.expires_at < new Date().toISOString() || tokenData.is_used) {
        throw new Error('Token inválido ou expirado');
      }

      // Fetch quote data
      const { data: quoteData } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          basket:price_baskets(name, reference_date, description),
          supplier:suppliers(company_name, trade_name)
        `)
        .eq('id', tokenData.quote_id)
        .single();

      // Fetch basket items
      const { data: basketItems } = await supabase
        .from('basket_items')
        .select(`
          *,
          product:products(
            name, 
            description, 
            code,
            measurement_unit:measurement_units(name, symbol)
          )
        `)
        .eq('basket_id', quoteData.basket_id);

      // Check if quote items already exist
      const { data: existingQuoteItems } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteData.id);

      // Initialize quote items with existing data or empty values
      const initialQuoteItems = basketItems.map(basketItem => {
        const existingItem = existingQuoteItems?.find(qi => qi.basket_item_id === basketItem.id);
        return {
          basket_item_id: basketItem.id,
          basket_item: basketItem,
          unit_price: existingItem?.unit_price || '',
          total_price: existingItem?.total_price || '',
          brand: existingItem?.brand || '',
          anvisa_registration: existingItem?.anvisa_registration || '',
          observations: existingItem?.observations || '',
        };
      });

      setQuote(quoteData);
      setQuoteItems(initialQuoteItems);
      setSubmitted(quoteData.status === 'respondida');
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Token inválido ou cotação não encontrada",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteItem = (basketItemId: string, field: string, value: string) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.basket_item_id === basketItemId) {
        const updated = { ...item, [field]: value };
        
        // Auto calculate total price when unit price or quantity changes
        if (field === 'unit_price') {
          const unitPrice = parseFloat(value) || 0;
          const quantity = item.basket_item?.quantity || 1;
          updated.total_price = (unitPrice * quantity).toFixed(2);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const submitQuote = async () => {
    try {
      setSubmitting(true);

      // Validate that at least one item has a price
      const itemsWithPrices = quoteItems.filter(item => 
        parseFloat(item.unit_price) > 0
      );

      if (itemsWithPrices.length === 0) {
        toast({
          title: "Erro",
          description: "Informe o preço de pelo menos um item",
          variant: "destructive",
        });
        return;
      }

      // Delete existing quote items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quote.id);

      // Insert new quote items
      const quoteItemsToInsert = itemsWithPrices.map(item => ({
        quote_id: quote.id,
        basket_item_id: item.basket_item_id,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        brand: item.brand || null,
        anvisa_registration: item.anvisa_registration || null,
        observations: item.observations || null,
      }));

      const { error: insertError } = await supabase
        .from('quote_items')
        .insert(quoteItemsToInsert);

      if (insertError) throw insertError;

      // Update quote status
      const { error: updateError } = await supabase
        .from('supplier_quotes')
        .update({ 
          status: 'respondida',
          responded_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // Mark token as used
      const { error: tokenError } = await supabase
        .from('supplier_quote_tokens')
        .update({ is_used: true })
        .eq('token', token);

      if (tokenError) throw tokenError;

      setSubmitted(true);
      toast({
        title: "Sucesso",
        description: "Cotação enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar cotação",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando cotação...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cotação não encontrada</h2>
            <p className="text-muted-foreground">
              O link pode estar inválido ou expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cotação Enviada!</h2>
            <p className="text-muted-foreground">
              Sua cotação foi enviada com sucesso. Agradecemos sua participação!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quote.due_date && new Date(quote.due_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Cotação de Preços</CardTitle>
                <p className="text-muted-foreground">
                  {quote.supplier?.company_name} • {quote.basket?.name}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Cesta de Preços</Label>
                <p className="text-lg">{quote.basket?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Data de referência: {format(new Date(quote.basket.reference_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Prazo para Resposta</Label>
                <p className="text-lg">
                  {format(new Date(quote.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <Badge variant={isExpired ? "destructive" : "default"}>
                  {isExpired ? "Expirada" : "Dentro do prazo"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Aguardando resposta</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert for expired quote */}
        {isExpired && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Esta cotação expirou em {format(new Date(quote.due_date), "dd/MM/yyyy", { locale: ptBR })}. 
              Entre em contato conosco se ainda deseja participar.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Alert className="mb-6">
          <AlertDescription>
            Preencha os preços para os itens que você pode fornecer. Não é obrigatório cotar todos os itens. 
            Campos obrigatórios estão marcados com *.
          </AlertDescription>
        </Alert>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle>Itens para Cotação</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Preço Unitário *</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteItems.map((item) => (
                  <TableRow key={item.basket_item_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.basket_item?.product?.name}</div>
                        {item.basket_item?.product?.description && (
                          <div className="text-sm text-muted-foreground">
                            {item.basket_item.product.description}
                          </div>
                        )}
                        {item.basket_item?.product?.code && (
                          <div className="text-xs text-muted-foreground">
                            Código: {item.basket_item.product.code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.basket_item?.quantity}</span>
                    </TableCell>
                    <TableCell>
                      {item.basket_item?.product?.measurement_unit?.symbol}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unit_price}
                        onChange={(e) => updateQuoteItem(item.basket_item_id, 'unit_price', e.target.value)}
                        disabled={isExpired}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {item.total_price ? parseFloat(item.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Marca"
                        value={item.brand}
                        onChange={(e) => updateQuoteItem(item.basket_item_id, 'brand', e.target.value)}
                        disabled={isExpired}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        placeholder="Observações"
                        value={item.observations}
                        onChange={(e) => updateQuoteItem(item.basket_item_id, 'observations', e.target.value)}
                        disabled={isExpired}
                        className="w-40 h-16"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Total Summary */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Geral:</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {quoteItems
                  .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {!isExpired && (
          <div className="mt-6 text-center">
            <Button 
              onClick={submitQuote} 
              disabled={submitting}
              size="lg"
              className="min-w-48"
            >
              {submitting ? "Enviando..." : "Enviar Cotação"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Ao enviar, você confirma que os dados estão corretos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};