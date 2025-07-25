
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client'; // Importa o cliente Supabase
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// A interface agora reflete a estrutura da sua tabela `external_price_data`
interface PriceDataItem {
  id: string;
  product_name: string;
  price: number;
  reference_date: string;
  source_location: string;
}

// A função de busca agora consulta o Supabase
const searchLocalPncpData = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from('external_price_data')
    .select('id, product_name, price, reference_date, source_location')
    .textSearch('product_name', searchTerm, { type: 'websearch' })
    .limit(50);

  if (error) {
    throw new Error(`Erro ao buscar no Supabase: ${error.message}`);
  }

  return data || [];
};

export function PncpSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<PriceDataItem[]>([]);

  const mutation = useMutation({
    mutationFn: searchLocalPncpData,
    onSuccess: (data) => {
      setItems(data);
    },
    onError: (error) => {
      console.error('Erro na busca local:', error);
      // Exibir erro para o usuário
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      mutation.mutate(searchTerm);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesquisa de Preços no Banco de Dados Local</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Digite o nome do item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Buscando...' : 'Buscar'}
          </Button>
        </form>

        {mutation.isSuccess && items.length === 0 && (
          <p>Nenhum resultado encontrado para "{searchTerm}".</p>
        )}

        {items.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">Resultados:</h3>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b py-2">
                  <p><strong>Descrição:</strong> {item.product_name}</p>
                  <p><strong>Preço:</strong> R$ {item.price.toFixed(2)}</p>
                  <p><strong>Data de Referência:</strong> {new Date(item.reference_date).toLocaleDateString()}</p>
                  <p><strong>Fonte:</strong> {item.source_location}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
