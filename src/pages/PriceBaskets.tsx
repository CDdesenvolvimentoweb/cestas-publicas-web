import { useState, useEffect } from 'react';
import { Plus, Eye, Copy, Calendar, Package, Calculator, Users, FileCheck, Search, Filter, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BasketWizard } from '@/components/baskets/BasketWizard';
import { BasketDetails } from '@/components/baskets/BasketDetails';
import { RegionalFilter } from '@/components/baskets/RegionalFilter';
import { CMEDSearch } from '@/components/price-analysis/CMEDSearch';
import { ComplianceReport } from '@/components/reports/ComplianceReport';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [regionalFilters, setRegionalFilters] = useState({
    selectedCities: [] as string[],
    includeRegional: true,
    radiusKm: 50
  });
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
          created_by,
          management_units (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get item counts and creator info for each basket
      const basketsWithCounts = await Promise.all(
        (data || []).map(async (basket: any) => {
          const { count } = await supabase
            .from('basket_items')
            .select('*', { count: 'exact', head: true })
            .eq('basket_id', basket.id);

          // Get creator profile info
          let creatorName = 'N/A';
          if (basket.created_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', basket.created_by)
              .single();
            
            if (profile) {
              creatorName = profile.full_name;
            }
          }
          
          return {
            ...basket,
            basket_items_count: count || 0,
            profiles: { full_name: creatorName },
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
      const { data: newBasketId, error } = await supabase.rpc('duplicate_basket', {
        source_basket_id: basket.id,
        new_name: `${basket.name} (Cópia)`,
        new_description: `Cópia da cesta: ${basket.description || ''}`
      });

      if (error) throw error;

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

  // Filter baskets based on search term
  const filteredBaskets = baskets.filter(basket =>
    basket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    basket.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Sistema de Cestas de Preços</h1>
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
        <div>
          <h1 className="text-3xl font-bold">Sistema de Cestas de Preços</h1>
          <p className="text-muted-foreground">
            Sistema especializado para elaboração de cestas de preços em conformidade com o edital
          </p>
        </div>
        <Button onClick={handleCreateBasket} className="hover-scale">
          <Plus className="w-4 h-4 mr-2" />
          Nova Cesta de Preços
        </Button>
      </div>

      <Tabs defaultValue="cestas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cestas">Cestas de Preços</TabsTrigger>
          <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="conformidade">Conformidade</TabsTrigger>
        </TabsList>

        <TabsContent value="cestas" className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar cestas de preços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avançados
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
          </div>

          {filteredBaskets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">
                    {searchTerm ? 'Nenhuma cesta encontrada' : 'Nenhuma cesta de preços encontrada'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Tente usar termos diferentes na busca.' 
                      : 'Comece criando sua primeira cesta de preços para pesquisa de mercado'
                    }
                  </p>
                </div>
                <Button onClick={handleCreateBasket} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  {searchTerm ? 'Nova Cesta' : 'Criar Primeira Cesta'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBaskets.map((basket) => (
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
                          'Em Elaboração'
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
                        Ver Detalhes
                      </Button>
                      {basket.is_finalized && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* Implementar análise */}}
                        >
                          <BarChart3 className="w-3 h-3" />
                        </Button>
                      )}
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
        </TabsContent>

        <TabsContent value="ferramentas" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <RegionalFilter onFiltersChange={setRegionalFilters} />
            <Card>
              <CardHeader>
                <CardTitle>Pesquisa Rápida de Preços</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Realize consultas rápidas sem necessidade de criar uma cesta completa.
                  Ideal para verificações pontuais de preços de mercado.
                </p>
                <Button className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Iniciar Pesquisa Rápida
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="consultas" className="space-y-4">
          <div className="grid gap-6">
            <CMEDSearch />
            <Card>
              <CardHeader>
                <CardTitle>Histórico Municipal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Consulte preços praticados anteriormente pelo município em licitações passadas.
                </p>
                <Button className="w-full" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Histórico de Licitações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conformidade" className="space-y-4">
          <ComplianceReport basketId={selectedBasket?.id || ''} />
        </TabsContent>
      </Tabs>

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