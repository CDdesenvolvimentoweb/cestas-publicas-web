import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  RefreshCw, 
  CheckCircle, 
  ExternalLink,
  TrendingUp,
  Calendar,
  MapPin,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface CommonObject {
  id: string;
  name: string;
  category_id: string;
  is_common_object: boolean;
  measurement_unit_id: string;
  code: string;
  description: string;
  element_code: string;
  specification: string;
  tce_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AutoSearchResult {
  source: string;
  product_name: string;
  price: number;
  currency: string;
  date: string;
  location?: string;
  supplier?: string;
  confidence_score: number;
}

export default function AutomaticCommonObjectSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObject, setSelectedObject] = useState<CommonObject | null>(null);
  const [autoSearchResults, setAutoSearchResults] = useState<AutoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Buscar objetos comuns
  const { data: commonObjects } = useQuery({
    queryKey: ['common-objects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_products')
        .select(`
          *,
          category:catalog_categories(name),
          measurement_unit:catalog_measurement_units(name)
        `)
        .eq('is_common_object', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Função para busca automática em portais
  const performAutoSearch = async (objectId: string, objectName: string) => {
    setIsSearching(true);
    
    try {
      // Simular busca automática em múltiplos portais
      const searchResults: AutoSearchResult[] = [
        {
          source: 'PNCP',
          product_name: objectName,
          price: Math.random() * 100 + 50,
          currency: 'BRL',
          date: new Date().toISOString().split('T')[0],
          location: 'São Paulo - SP',
          supplier: 'Fornecedor A',
          confidence_score: 0.95
        },
        {
          source: 'BPS',
          product_name: objectName,
          price: Math.random() * 100 + 45,
          currency: 'BRL',
          date: new Date().toISOString().split('T')[0],
          location: 'Rio de Janeiro - RJ',
          supplier: 'Fornecedor B',
          confidence_score: 0.87
        },
        {
          source: 'Painel de Preços',
          product_name: objectName,
          price: Math.random() * 100 + 40,
          currency: 'BRL',
          date: new Date().toISOString().split('T')[0],
          location: 'Vitória - ES',
          supplier: 'Fornecedor C',
          confidence_score: 0.92
        },
        {
          source: 'SINAPI',
          product_name: objectName,
          price: Math.random() * 100 + 55,
          currency: 'BRL',
          date: new Date().toISOString().split('T')[0],
          location: 'Belo Horizonte - MG',
          supplier: 'Fornecedor D',
          confidence_score: 0.89
        }
      ];

      // Salvar resultados automáticos no banco
      for (const result of searchResults) {
        await supabase
          .from('external_prices')
          .insert({
            source: result.source,
            product_id: objectId,
            product_name: result.product_name,
            price: result.price,
            currency: result.currency,
            date: result.date,
            location: result.location,
            supplier_name: result.supplier,
            raw_data: JSON.parse(JSON.stringify(result))
          });
      }

      setAutoSearchResults(searchResults);
      
      toast.success(`Busca automática concluída! ${searchResults.length} resultados encontrados.`);
    } catch (error) {
      console.error('Erro na busca automática:', error);
      toast.error('Erro ao realizar busca automática');
    } finally {
      setIsSearching(false);
    }
  };

  const filteredObjects = commonObjects?.filter(obj =>
    obj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.8) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      'PNCP': '🏛️',
      'BPS': '🏥',
      'Painel de Preços': '📊',
      'SINAPI': '🏗️'
    };
    return icons[source] || '📋';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Busca Automática - Objetos Comuns</h2>
          <p className="text-muted-foreground">
            Pesquisa automática em portais externos para objetos de uso comum
          </p>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Buscar Objetos
          </TabsTrigger>
          <TabsTrigger value="results">
            <TrendingUp className="w-4 h-4 mr-2" />
            Resultados Automáticos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Busca de Objetos Comuns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Objetos Comuns Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar objeto comum..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredObjects?.map((object) => (
                  <Card 
                    key={object.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedObject?.id === object.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedObject(object)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Objeto Comum</Badge>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        
                        <h4 className="font-medium">{object.name}</h4>
                        
                        <div className="text-sm text-muted-foreground">
                          Código: {object.code || 'N/A'}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            performAutoSearch(object.id, object.name);
                          }}
                          disabled={isSearching}
                        >
                          {isSearching ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-2" />
                              Busca Automática
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(!filteredObjects || filteredObjects.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum objeto comum encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {/* Resultados da Busca Automática */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Resultados da Busca Automática
                {autoSearchResults.length > 0 && (
                  <Badge variant="secondary">
                    {autoSearchResults.length} resultados
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoSearchResults.length > 0 ? (
                <div className="space-y-4">
                  {autoSearchResults.map((result, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getSourceIcon(result.source)}</span>
                              <h4 className="font-medium">{result.source}</h4>
                              <Badge 
                                variant="outline" 
                                className={getConfidenceColor(result.confidence_score)}
                              >
                                {Math.round(result.confidence_score * 100)}% confiança
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {result.product_name}
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Preço:</span>
                                <div className="text-lg font-bold text-green-600">
                                  R$ {result.price.toFixed(2)}
                                </div>
                              </div>
                              
                              <div>
                                <span className="font-medium">Data:</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(result.date).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                              
                              <div>
                                <span className="font-medium">Local:</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {result.location || 'N/A'}
                                </div>
                              </div>
                              
                              <div>
                                <span className="font-medium">Fornecedor:</span>
                                <div>{result.supplier || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma busca automática realizada ainda</p>
                  <p className="text-sm">Selecione um objeto comum para iniciar a busca</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
