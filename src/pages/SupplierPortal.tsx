import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Building2, Calendar, Clock, DollarSign, 
  Package, CheckCircle, AlertCircle, FileText,
  Save, Send
} from 'lucide-react';

interface QuoteData {
  id: string;
  basket_id: string;
  supplier_id: string;
  due_date: string;
  status: string;
  created_at: string;
  basket: {
    name: string;
    description: string;
    reference_date: string;
    management_unit: {
      name: string;
      city: {
        name: string;
        state: {
          name: string;
        };
      };
    };
  };
  supplier: {
    company_name: string;
    cnpj: string;
  };
  quote_items: Array<{
    id: string;
    unit_price?: number;
    total_price?: number;
    brand?: string;
    anvisa_registration?: string;
    observations?: string;
    basket_item: {
      id: string;
      quantity: number;
      observations?: string;
      product: {
        id: string;
        name: string;
        code?: string;
        anvisa_code?: string;
        description?: string;
        measurement_unit: {
          name: string;
          symbol: string;
        };
      };
    };
  }>;
}

export const SupplierPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchQuoteData();
    }
  }, [token]);

  const fetchQuoteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se o token é válido
      const { data: tokenData, error: tokenError } = await supabase
        .from('supplier_quote_tokens')
        .select('quote_id, expires_at, is_used')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Token inválido ou expirado');
      }

      if (tokenData.is_used) {
        throw new Error('Este link já foi utilizado');
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Este link expirou');
      }

      // Buscar dados da cotação
      const { data: quote, error: quoteError } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          basket:price_baskets (
            name,
            description,
            reference_date,
            management_unit:management_units (
              name,
              city:cities (
                name,
                state:states (
                  name
                )
              )
            )
          ),
          supplier:suppliers (
            company_name,
            cnpj
          ),
          quote_items (
            *,
            basket_item:basket_items (
              *,
              product:products (
                *,
                measurement_unit:measurement_units (
                  name,
                  symbol
                )
              )
            )
          )
        `)
        .eq('id', tokenData.quote_id)
        .single();

      if (quoteError) throw quoteError;
      setQuoteData(quote);

    } catch (error: any) {
      console.error('Erro ao carregar dados da cotação:', error);
      setError(error.message || 'Erro ao carregar cotação');
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteItem = (itemId: string, field: string, value: any) => {
    if (!quoteData) return;

    setQuoteData({
      ...quoteData,
      quote_items: quoteData.quote_items.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              [field]: value,
              // Calcular total_price automaticamente
              total_price: field === 'unit_price' 
                ? (value || 0) * item.basket_item.quantity 
                : item.total_price
            }
          : item
      )
    });
  };

  const saveProgress = async () => {
    if (!quoteData) return;

    try {
      setSaving(true);

      // Atualizar itens da cotação
      for (const item of quoteData.quote_items) {
        if (item.unit_price !== undefined || item.brand || item.anvisa_registration || item.observations) {
          const { error } = await supabase
            .from('quote_items')
            .update({
              unit_price: item.unit_price,
              total_price: item.total_price,
              brand: item.brand,
              anvisa_registration: item.anvisa_registration,
              observations: item.observations,
            })
            .eq('id', item.id);

          if (error) throw error;
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Progresso salvo com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar progresso',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const submitQuote = async () => {
    if (!quoteData) return;

    try {
      setSubmitting(true);

      // Validar se todos os itens têm preços
      const itemsWithoutPrice = quoteData.quote_items.filter(item => !item.unit_price);
      if (itemsWithoutPrice.length > 0) {
        toast({
          title: 'Atenção',
          description: 'Todos os itens devem ter preços informados',
          variant: 'destructive',
        });
        return;
      }

      // Salvar todos os itens
      await saveProgress();

      // Atualizar status da cotação
      const { error } = await supabase
        .from('supplier_quotes')
        .update({
          status: 'respondida',
          responded_at: new Date().toISOString(),
        })
        .eq('id', quoteData.id);

      if (error) throw error;

      // Marcar token como usado
      await supabase
        .from('supplier_quote_tokens')
        .update({ is_used: true })
        .eq('token', token);

      toast({
        title: 'Sucesso',
        description: 'Cotação enviada com sucesso!',
      });

      // Atualizar estado local
      setQuoteData({
        ...quoteData,
        status: 'respondida'
      });

    } catch (error: any) {
      console.error('Erro ao enviar cotação:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar cotação',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTotalQuote = () => {
    if (!quoteData) return 0;
    return quoteData.quote_items.reduce((total, item) => {
      return total + (item.total_price || 0);
    }, 0);
  };

  const getItemsWithPrice = () => {
    if (!quoteData) return 0;
    return quoteData.quote_items.filter(item => item.unit_price).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Carregando cotação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quoteData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Cotação não encontrada'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(quoteData.due_date) < new Date();
  const isSubmitted = quoteData.status === 'respondida';
  const canEdit = !isExpired && !isSubmitted;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <Building2 className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Portal do Fornecedor</h1>
              <p className="opacity-90">Sistema de Cotações Eletrônicas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Quote Status Alert */}
        {isSubmitted && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Cotação enviada com sucesso! Obrigado pela sua participação.
            </AlertDescription>
          </Alert>
        )}

        {isExpired && !isSubmitted && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O prazo para esta cotação expirou em {new Date(quoteData.due_date).toLocaleDateString('pt-BR')}.
            </AlertDescription>
          </Alert>
        )}

        {/* Quote Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {quoteData.basket.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{quoteData.basket.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Ref: {new Date(quoteData.basket.reference_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Prazo: {new Date(quoteData.due_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Órgão Solicitante</h4>
                <p className="text-sm text-muted-foreground">
                  {quoteData.basket.management_unit.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quoteData.basket.management_unit.city.name}/{quoteData.basket.management_unit.city.state.name}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{quoteData.supplier.company_name}</p>
                <p className="text-sm text-muted-foreground">CNPJ: {quoteData.supplier.cnpj}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total de Itens:</span>
                  <Badge variant="outline">{quoteData.quote_items.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Itens Cotados:</span>
                  <Badge variant="outline">{getItemsWithPrice()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Valor Total:</span>
                  <span className="font-semibold">{formatCurrency(getTotalQuote())}</span>
                </div>
              </div>

              {canEdit && (
                <div className="space-y-2 pt-4">
                  <Button 
                    onClick={saveProgress} 
                    disabled={saving}
                    variant="outline" 
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Progresso'}
                  </Button>
                  <Button 
                    onClick={submitQuote} 
                    disabled={submitting || getItemsWithPrice() === 0}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Enviando...' : 'Enviar Cotação'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens da Cotação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quoteData.quote_items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.basket_item.product.name}</h4>
                      {item.basket_item.product.code && (
                        <p className="text-sm text-muted-foreground">
                          Código: {item.basket_item.product.code}
                        </p>
                      )}
                      {item.basket_item.product.anvisa_code && (
                        <p className="text-sm text-muted-foreground">
                          ANVISA: {item.basket_item.product.anvisa_code}
                        </p>
                      )}
                      {item.basket_item.product.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {item.basket_item.product.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">Item {index + 1}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium">Quantidade</label>
                      <Input 
                        value={item.basket_item.quantity}
                        readOnly
                        className="bg-muted"
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.basket_item.product.measurement_unit.name}
                      </span>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Preço Unitário *</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unit_price || ''}
                        onChange={(e) => updateQuoteItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        disabled={!canEdit}
                        className={!canEdit ? 'bg-muted' : ''}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Marca</label>
                      <Input
                        placeholder="Marca do produto"
                        value={item.brand || ''}
                        onChange={(e) => updateQuoteItem(item.id, 'brand', e.target.value)}
                        disabled={!canEdit}
                        className={!canEdit ? 'bg-muted' : ''}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Registro ANVISA</label>
                      <Input
                        placeholder="Número do registro"
                        value={item.anvisa_registration || ''}
                        onChange={(e) => updateQuoteItem(item.id, 'anvisa_registration', e.target.value)}
                        disabled={!canEdit}
                        className={!canEdit ? 'bg-muted' : ''}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      placeholder="Observações sobre o produto..."
                      value={item.observations || ''}
                      onChange={(e) => updateQuoteItem(item.id, 'observations', e.target.value)}
                      disabled={!canEdit}
                      className={!canEdit ? 'bg-muted' : ''}
                    />
                  </div>

                  {item.unit_price && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">Total do Item:</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(item.total_price || 0)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {quoteData.quote_items.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">Valor Total da Cotação:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(getTotalQuote())}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};