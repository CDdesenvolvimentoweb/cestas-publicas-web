import React, { useState } from 'react';
import { Search, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CMEDProduct {
  id: string;
  registro_anvisa: string;
  principio_ativo: string;
  produto_descricao: string;
  apresentacao_descricao: string;
  preco_maximo_consumidor: number;
  preco_maximo_governo: number;
  data_atualizacao: string;
}

export const CMEDSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'registro' | 'principio' | 'produto'>('produto');
  const [results, setResults] = useState<CMEDProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      let query = supabase.from('cmed_products').select('*');

      switch (searchType) {
        case 'registro':
          query = query.ilike('registro_anvisa', `%${searchQuery}%`);
          break;
        case 'principio':
          query = query.textSearch('principio_ativo', searchQuery, {
            type: 'websearch',
            config: 'portuguese'
          });
          break;
        case 'produto':
          query = query.textSearch('produto_descricao', searchQuery, {
            type: 'websearch',
            config: 'portuguese'
          });
          break;
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      setResults(data || []);
      
      if (!data?.length) {
        toast({
          title: "Nenhum resultado encontrado",
          description: "Tente usar termos diferentes na busca.",
        });
      }
    } catch (error) {
      console.error('Erro na busca CMED:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível consultar a tabela CMED.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <FileText className="h-5 w-5" />
          Consulta CMED - ANVISA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex gap-1">
            {(['produto', 'principio', 'registro'] as const).map((type) => (
              <Button
                key={type}
                variant={searchType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType(type)}
              >
                {type === 'produto' && 'Produto'}
                {type === 'principio' && 'Princípio Ativo'}
                {type === 'registro' && 'Registro ANVISA'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={`Buscar por ${searchType === 'produto' ? 'nome do produto' : 
                         searchType === 'principio' ? 'princípio ativo' : 'registro ANVISA'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((product) => (
              <div key={product.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{product.produto_descricao}</h4>
                    <p className="text-xs text-muted-foreground">{product.apresentacao_descricao}</p>
                    <p className="text-xs font-mono">{product.principio_ativo}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {product.registro_anvisa}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="space-x-4">
                    <span>
                      <strong>PMC:</strong> {formatCurrency(product.preco_maximo_consumidor)}
                    </span>
                    <span>
                      <strong>PMVG:</strong> {formatCurrency(product.preco_maximo_governo)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(product.data_atualizacao).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Buscando na tabela CMED...
          </div>
        )}
      </CardContent>
    </Card>
  );
};