import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Calendar, 
  Calculator, 
  Users, 
  Plus, 
  Trash2, 
  Edit,
  FileCheck,
  Send,
  BarChart3,
  TrendingUp,
  Hash,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BasketItemForm } from './BasketItemForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface BasketItem {
  id: string;
  quantity: number;
  lot_number?: number;
  observations?: string;
  products: {
    id: string;
    name: string;
    code?: string;
    measurement_units: {
      name: string;
      abbreviation: string;
    };
    product_categories: {
      name: string;
    };
  };
}

interface BasketDetailsProps {
  basket: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface BasketStats {
  total_items: number;
  total_quantity: number;
  unique_categories: number;
  unique_suppliers: number;
}

export const BasketDetails = ({
  basket,
  isOpen,
  onClose,
  onUpdate,
}: BasketDetailsProps) => {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [stats, setStats] = useState<BasketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BasketItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (basket?.id) {
      fetchBasketItems();
      fetchBasketStats();
    }
  }, [basket?.id]);

  const fetchBasketItems = async () => {
    if (!basket?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('basket_items')
        .select(`
          id,
          quantity,
          lot_number,
          observations,
          products (
            id,
            name,
            code,
            measurement_units (
              name,
              abbreviation
            ),
            product_categories (
              name
            )
          )
        `)
        .eq('basket_id', basket.id)
        .order('created_at');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar itens",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBasketStats = async () => {
    if (!basket?.id) return;

    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('calculate_basket_statistics', {
        basket_id_param: basket.id
      });

      if (error) throw error;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setStats(data as unknown as BasketStats);
      }
    } catch (error: any) {
      console.error('Error fetching basket stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemFormOpen(true);
  };

  const handleEditItem = (item: BasketItem) => {
    setEditingItem(item);
    setIsItemFormOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('basket_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
      toast({
        title: "Item removido",
        description: "O item foi removido da cesta com sucesso.",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover item",
        description: error.message,
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFinalizeBasket = async () => {
    try {
      const { error } = await supabase
        .from('price_baskets')
        .update({ is_finalized: true })
        .eq('id', basket.id);

      if (error) throw error;

      toast({
        title: "Cesta finalizada",
        description: "A cesta foi finalizada e não pode mais ser editada.",
      });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao finalizar cesta",
        description: error.message,
      });
    }
  };

  const handleItemFormSuccess = () => {
    setIsItemFormOpen(false);
    setEditingItem(null);
    fetchBasketItems();
    fetchBasketStats();
    onUpdate();
  };

  const getCalculationTypeLabel = (type: string) => {
    switch (type) {
      case 'media': return 'Média Aritmética';
      case 'mediana': return 'Mediana';
      case 'menor_preco': return 'Menor Preço';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!basket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {basket.name}
              </DialogTitle>
              <DialogDescription>
                {basket.description || 'Detalhes da cesta de preços'}
              </DialogDescription>
            </div>
            <Badge variant={basket.is_finalized ? "default" : "secondary"}>
              {basket.is_finalized ? (
                <><FileCheck className="w-3 h-3 mr-1" />Finalizada</>
              ) : (
                'Em Andamento'
              )}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Itens da Cesta</h3>
              {!basket.is_finalized && (
                <Button onClick={handleAddItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">Nenhum item adicionado</h4>
                  <p className="text-muted-foreground mb-4">
                    Comece adicionando produtos à sua cesta
                  </p>
                  {!basket.is_finalized && (
                    <Button onClick={handleAddItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.products.name}</h4>
                            {item.products.code && (
                              <Badge variant="outline" className="text-xs">
                                {item.products.code}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Categoria: {item.products.product_categories.name}</p>
                            <p>
                              Quantidade: {item.quantity} {item.products.measurement_units.abbreviation}
                            </p>
                            {item.lot_number && <p>Lote: {item.lot_number}</p>}
                            {item.observations && <p>Observações: {item.observations}</p>}
                          </div>
                        </div>
                        
                        {!basket.is_finalized && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!basket.is_finalized && items.length > 0 && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={handleFinalizeBasket}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Finalizar Cesta
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Estatísticas da Cesta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                            <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Total de Itens</p>
                          <p className="text-2xl font-bold">{stats.total_items}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <Hash className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Quantidade Total</p>
                          <p className="text-2xl font-bold">{Number(stats.total_quantity).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Categorias Únicas</p>
                          <p className="text-2xl font-bold">{stats.unique_categories}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Fornecedores</p>
                          <p className="text-2xl font-bold">{stats.unique_suppliers}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Estatísticas não disponíveis
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data de Referência</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(basket.reference_date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Tipo de Cálculo</p>
                        <p className="text-sm text-muted-foreground">
                          {getCalculationTypeLabel(basket.calculation_type)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Unidade Gestora</p>
                      <p className="text-sm text-muted-foreground">
                        {basket.management_units?.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground border-t pt-4">
                    <p><strong>Criado por:</strong> {basket.profiles?.full_name}</p>
                    <p><strong>Criado em:</strong> {formatDate(basket.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <BasketItemForm
          basketId={basket.id}
          item={editingItem}
          isOpen={isItemFormOpen}
          onClose={() => setIsItemFormOpen(false)}
          onSuccess={handleItemFormSuccess}
        />

        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
          title="Remover Item"
          description="Esta ação não pode ser desfeita. O item será removido da cesta."
        />
      </DialogContent>
    </Dialog>
  );
};