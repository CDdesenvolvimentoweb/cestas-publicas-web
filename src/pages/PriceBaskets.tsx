import { useState, useEffect } from 'react';
import { Plus, Eye, Copy, Calendar, Package, Calculator, Users, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BasketWizard } from '@/components/baskets/BasketWizard';
import { BasketDetails } from '@/components/baskets/BasketDetails';

interface PriceBasket {
  id: string;
  name: string;
  description?: string;
  reference_date: string;
  calculation_type: 'media' | 'mediana' | 'menor_preco';
  is_finalized: boolean;
  created_at: string;
  management_units: {
    name: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
  basket_items_count?: number;
}

export const PriceBaskets = () => {
  const [baskets, setBaskets] = useState<PriceBasket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedBasket, setSelectedBasket] = useState<PriceBasket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchBaskets();
  }, []);

  const fetchBaskets = async () => {
    try {
      const { data, error } = await supabase
        .from('price_baskets')
        .select(`
          id,
          name,
          description,
          reference_date,
          calculation_type,
          is_finalized,
          created_at,
          management_units (
            name
          ),
          profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get item counts for each basket
      const basketsWithCounts = await Promise.all(
        (data || []).map(async (basket: any) => {
          const { count } = await supabase
            .from('basket_items')
            .select('*', { count: 'exact', head: true })
            .eq('basket_id', basket.id);
          
          return {
            ...basket,
            basket_items_count: count || 0,
          } as PriceBasket;
        })
      );

      setBaskets(basketsWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar cestas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBasket = () => {
    setIsWizardOpen(true);
  };

  const handleDuplicateBasket = async (basket: PriceBasket) => {
    try {
      // Create new basket
      const { data: newBasket, error: basketError } = await supabase
        .from('price_baskets')
        .insert({
          name: `${basket.name} (Cópia)`,
          description: basket.description,
          reference_date: new Date().toISOString().split('T')[0],
          calculation_type: basket.calculation_type,
          is_finalized: false,
          management_unit_id: profile?.management_unit_id,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (basketError) throw basketError;

      // Copy basket items
      const { data: originalItems, error: itemsError } = await supabase
        .from('basket_items')
        .select('*')
        .eq('basket_id', basket.id);

      if (itemsError) throw itemsError;

      if (originalItems && originalItems.length > 0) {
        const newItems = originalItems.map(item => ({
          basket_id: newBasket.id,
          product_id: item.product_id,
          quantity: item.quantity,
          lot_number: item.lot_number,
          observations: item.observations,
        }));

        const { error: insertError } = await supabase
          .from('basket_items')
          .insert(newItems);

        if (insertError) throw insertError;
      }

      toast({
        title: "Cesta duplicada",
        description: "A cesta foi duplicada com sucesso.",
      });

      fetchBaskets();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao duplicar cesta",
        description: error.message,
      });
    }
  };

  const handleViewBasket = (basket: PriceBasket) => {
    setSelectedBasket(basket);
    setIsDetailsOpen(true);
  };

  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case 'media': return 'Média';
      case 'mediana': return 'Mediana';
      case 'menor_preco': return 'Menor Preço';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cestas de Preços</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Cestas de Preços</h1>
        <Button onClick={handleCreateBasket} className="hover-scale">
          <Plus className="w-4 h-4 mr-2" />
          Nova Cesta
        </Button>
      </div>

      {baskets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma cesta de preços encontrada</h3>
              <p className="text-muted-foreground">
                Comece criando sua primeira cesta de preços para pesquisa de mercado
              </p>
            </div>
            <Button onClick={handleCreateBasket} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Cesta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {baskets.map((basket) => (
            <Card key={basket.id} className="hover-scale">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-2">{basket.name}</CardTitle>
                    {basket.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {basket.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={basket.is_finalized ? "default" : "secondary"}>
                    {basket.is_finalized ? (
                      <><FileCheck className="w-3 h-3 mr-1" />Finalizada</>
                    ) : (
                      'Em Andamento'
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(basket.reference_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{basket.basket_items_count} itens</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="w-4 h-4 text-muted-foreground" />
                    <span>Cálculo: {getCalculationTypeLabel(basket.calculation_type)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{basket.management_units?.name || 'N/A'}</span>
                  </div>

                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <strong>Criado por:</strong> {basket.profiles?.full_name || 'N/A'}
                    <br />
                    <strong>Em:</strong> {formatDate(basket.created_at)}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewBasket(basket)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  {!basket.is_finalized && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateBasket(basket)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BasketWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false);
          fetchBaskets();
        }}
      />

      <BasketDetails
        basket={selectedBasket}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedBasket(null);
        }}
        onUpdate={fetchBaskets}
      />
    </div>
  );
};