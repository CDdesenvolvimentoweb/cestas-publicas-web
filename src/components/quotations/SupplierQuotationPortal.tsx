import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Calendar, 
  Building, 
  Mail, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Calculator,
  FileText,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface BasketItem {
  id: string;
  quantity: number;
  lot_number?: number;
  observations?: string;
  catalog_products: {
    id: string;
    name: string;
    description: string;
    measurement_unit: string;
    tce_code?: string;
    specification?: string;
  };
}

interface QuotationData {
  id: string;
  quotation_id: string;
  supplier_id: string;
  access_token: string;
  status: string;
  total_value?: number;
  delivery_days?: number;
  observations?: string;
  submitted_at?: string;
  supplier_quotations: {
    id: string;
    deadline: string;
    message?: string;
    status: string;
    price_baskets: {
      id: string;
      name: string;
      description?: string;
      reference_date: string;
      management_units: {
        name: string;
        email?: string;
        phone?: string;
      };
      basket_items: BasketItem[];
    };
  };
  suppliers: {
    company_name: string;
    email: string;
    phone?: string;
    cnpj?: string;
  };
}

interface QuotationItemForm {
  basket_item_id: string;
  unit_price: number;
  total_price: number;
  delivery_days?: number;
  observations?: string;
}

export function SupplierQuotationPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [quotationItems, setQuotationItems] = useState<QuotationItemForm[]>([]);
  const [generalObservations, setGeneralObservations] = useState('');
  const [deliveryDays, setDeliveryDays] = useState<number>(30);
  
  // Buscar dados da cotação
  const { data: quotationData, isLoading, error } = useQuery({
    queryKey: ['supplier-quotation', token],
    queryFn: async () => {
      if (!token) throw new Error('Token não fornecido');
      
      const { data, error } = await supabase
        .from('supplier_quotation_responses')
        .select(`
          id,
          quotation_id,
          supplier_id,
          access_token,
          status,
          total_value,
          delivery_days,
          observations,
          submitted_at,
          supplier_quotations (
            id,
            deadline,
            message,
            status,
            price_baskets (
              id,
              name,
              description,
              reference_date,
              management_units (
                name,
                email,
                phone
              ),
              basket_items (
                id,
                quantity,
                lot_number,
                observations,
                product_id
              )
            )
          ),
          suppliers (
            company_name,
            email,
            phone,
            cnpj
          )
        `)
        .eq('access_token', token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token
  });

  // Buscar produtos dos itens da cesta
  const { data: products } = useQuery({
    queryKey: ['basket-products', quotationData?.supplier_quotations?.price_baskets?.basket_items],
    queryFn: async () => {
      if (!quotationData?.supplier_quotations?.price_baskets?.basket_items) return [];
      
      const productIds = quotationData.supplier_quotations.price_baskets.basket_items
        .map((item: any) => item.product_id)
        .filter(Boolean);
      
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('catalog_products')
        .select(`
          id, 
          name, 
          description, 
          tce_code, 
          specification,
          measurement_units (
            name,
            symbol
          )
        `)
        .in('id', productIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!quotationData?.supplier_quotations?.price_baskets?.basket_items
  });

  // Inicializar formulário com dados da cesta
  useEffect(() => {
    if (quotationData?.supplier_quotations?.price_baskets?.basket_items) {
      const initialItems = quotationData.supplier_quotations.price_baskets.basket_items.map((item: any) => ({
        basket_item_id: item.id,
        unit_price: 0,
        total_price: 0,
        delivery_days: deliveryDays,
        observations: ''
      }));
      setQuotationItems(initialItems);
    }
  }, [quotationData, deliveryDays]);

  // Mutação para submeter cotação
  const submitQuotationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('quotation-system', {
        body: {
          action: 'process_supplier_response',
          access_token: token,
          quotation_items: quotationItems.filter(item => item.unit_price > 0),
          general_observations: generalObservations,
          delivery_days: deliveryDays
        }
      });

      if (error) throw error;
      return data;
    }
  });

  const handleItemChange = (index: number, field: keyof QuotationItemForm, value: any) => {
    const updatedItems = [...quotationItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calcular preço total automaticamente
    if (field === 'unit_price') {
      const item = quotationData?.supplier_quotations?.price_baskets?.basket_items?.[index];
      if (item) {
        updatedItems[index].total_price = value * item.quantity;
      }
    }
    
    setQuotationItems(updatedItems);
  };

  const calculateTotalQuotation = () => {
    return quotationItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleSubmitQuotation = async () => {
    try {
      await submitQuotationMutation.mutateAsync();
      alert('Cotação enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
      alert('Erro ao enviar cotação. Tente novamente.');
    }
  };

  // Função auxiliar para obter produto por ID
  const getProductById = (productId: string) => {
    return products?.find(p => p.id === productId);
  };

  if (!token) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Token de acesso não fornecido. Verifique o link recebido por email.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados da cotação...</p>
        </div>
      </div>
    );
  }

  if (error || !quotationData) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados da cotação. Verifique se o link é válido e não expirou.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isExpired = new Date(quotationData?.supplier_quotations?.deadline || '') < new Date();
  const isSubmitted = quotationData?.status === 'submitted';

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Portal de Cotação</h1>
        <p className="text-muted-foreground">
          Sistema de Cestas de Preços Públicas - Prefeitura Municipal de Santa Teresa/ES
        </p>
      </div>

      {/* Status da Cotação */}
      {isSubmitted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Cotação já foi enviada em {format(new Date(quotationData.submitted_at!), "PPP 'às' HH:mm", { locale: ptBR })}.
            Você pode visualizar os dados enviados abaixo.
          </AlertDescription>
        </Alert>
      )}

      {isExpired && !isSubmitted && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O prazo para envio desta cotação expirou em {format(new Date(quotationData?.supplier_quotations?.deadline || ''), "PPP 'às' HH:mm", { locale: ptBR })}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações da Cotação */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Dados da Cotação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Órgão</Label>
                <p className="text-sm">{quotationData?.supplier_quotations?.price_baskets?.management_units?.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Cesta de Preços</Label>
                <p className="text-sm">{quotationData?.supplier_quotations?.price_baskets?.name}</p>
                {quotationData?.supplier_quotations?.price_baskets?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {quotationData.supplier_quotations.price_baskets.description}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Data de Referência</Label>
                <p className="text-sm">
                  {format(new Date(quotationData?.supplier_quotations?.price_baskets?.reference_date || ''), "PPP", { locale: ptBR })}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Prazo para Resposta</Label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(quotationData?.supplier_quotations?.deadline || ''), "PPP 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Seu Fornecimento</Label>
                <p className="text-sm">{quotationData?.suppliers?.company_name}</p>
                <p className="text-xs text-muted-foreground">{quotationData?.suppliers?.email}</p>
              </div>
            </CardContent>
          </Card>

          {!isSubmitted && !isExpired && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Resumo da Cotação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total de Itens:</span>
                    <span className="text-sm font-medium">
                      {quotationData.supplier_quotations.price_baskets.basket_items?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Itens Cotados:</span>
                    <span className="text-sm font-medium">
                      {quotationItems.filter(item => item.unit_price > 0).length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Valor Total:</span>
                    <span>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(calculateTotalQuotation())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Formulário de Cotação */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Itens para Cotação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isSubmitted && !isExpired && (
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-days">Prazo de Entrega (dias)</Label>
                      <Input
                        id="delivery-days"
                        type="number"
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(Number(e.target.value))}
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="general-observations">Observações Gerais</Label>
                    <Textarea
                      id="general-observations"
                      value={generalObservations}
                      onChange={(e) => setGeneralObservations(e.target.value)}
                      placeholder="Informações adicionais sobre a cotação, condições de pagamento, etc."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {quotationData.supplier_quotations.price_baskets.basket_items.map((item: any, index: number) => {
                  const product = getProductById(item.product_id);
                  return (
                  <Card key={item.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                        {/* Informações do Item */}
                        <div className="lg:col-span-3">
                          <Label className="font-medium">{product?.name || 'Produto não encontrado'}</Label>
                          {product?.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.description}
                            </p>
                          )}
                          {product?.specification && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Especificação:</strong> {product.specification}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span><strong>Qtd:</strong> {item.quantity} {product?.measurement_units?.symbol || product?.measurement_units?.name || ''}</span>
                            {product?.tce_code && (
                              <span><strong>Código TCE:</strong> {product.tce_code}</span>
                            )}
                            {item.lot_number && (
                              <span><strong>Lote:</strong> {item.lot_number}</span>
                            )}
                          </div>
                          {item.observations && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Obs:</strong> {item.observations}
                            </p>
                          )}
                        </div>

                        {/* Campos de Cotação */}
                        {!isSubmitted && !isExpired ? (
                          <>
                            <div>
                              <Label htmlFor={`unit-price-${index}`}>Preço Unitário (R$)</Label>
                              <Input
                                id={`unit-price-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={quotationItems[index]?.unit_price || ''}
                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <Label>Preço Total (R$)</Label>
                              <Input
                                value={new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(quotationItems[index]?.total_price || 0)}
                                readOnly
                                className="bg-muted"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`item-observations-${index}`}>Observações</Label>
                              <Input
                                id={`item-observations-${index}`}
                                value={quotationItems[index]?.observations || ''}
                                onChange={(e) => handleItemChange(index, 'observations', e.target.value)}
                                placeholder="Marca, modelo, etc."
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label>Preço Unitário</Label>
                              <p className="text-sm font-medium">
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(quotationItems[index]?.unit_price || 0)}
                              </p>
                            </div>
                            <div>
                              <Label>Preço Total</Label>
                              <p className="text-sm font-medium">
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(quotationItems[index]?.total_price || 0)}
                              </p>
                            </div>
                            <div>
                              <Label>Observações</Label>
                              <p className="text-sm">{quotationItems[index]?.observations || '-'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>

              {!isSubmitted && !isExpired && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-bold">
                      Total Geral: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(calculateTotalQuotation())}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitQuotation}
                      disabled={
                        submitQuotationMutation.isPending || 
                        quotationItems.filter(item => item.unit_price > 0).length === 0
                      }
                      size="lg"
                    >
                      {submitQuotationMutation.isPending ? (
                        'Enviando...'
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Cotação
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
