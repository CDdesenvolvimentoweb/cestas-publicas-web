import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarIcon, 
  CheckCircle, 
  Database, 
  FileText, 
  Filter, 
  Info, 
  Loader2, 
  RefreshCw,
  Search, 
  X,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PNCPPrecos() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchParams, setSearchParams] = useState({
    dataInicial: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyyMMdd'),
    dataFinal: format(new Date(), 'yyyyMMdd'),
    cnpjOrgao: '',
    descricaoItem: '',
    ufs: ['ES'],
    municipios: []
  });
  
  const handleSync = async () => {
    setLoading(true);
    setStatusMessage('Iniciando sincronização com o PNCP...');
    setResults([]);
    
    try {
      console.log('Chamando Edge Function fetch-pncp-prices com parâmetros:', searchParams);
      
      // Chamar Edge Function para buscar preços do PNCP com tratamento especial para CORS
      const { data, error } = await supabase.functions.invoke('fetch-pncp-prices', {
        body: searchParams,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (error) {
        console.error('Erro ao chamar a função:', error);
        throw new Error(`Erro na função: ${error.message}`);
      }
      
      if (data.status === 'error') {
        throw new Error(data.error || 'Erro na sincronização');
      }
      
      // Buscar os registros inseridos
      const { data: precos, error: fetchError } = await supabase
        .from('pncp_prices')
        .select('*')
        .order('data_atualizacao', { ascending: false })
        .limit(100);
      
      if (fetchError) {
        throw new Error(`Erro ao buscar preços: ${fetchError.message}`);
      }
      
      setResults(precos || []);
      setStatusMessage(
        `Sincronização concluída: ${data.atas} atas processadas, ${data.inserted} itens inseridos.`
      );
      
      toast({
        title: 'Sincronização concluída',
        description: `${data.inserted} itens de preço inseridos de ${data.atas} atas.`,
      });
      
    } catch (error) {
      console.error('Erro na sincronização PNCP:', error);
      setStatusMessage(`Erro: ${error.message}`);
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    setLoading(true);
    setStatusMessage('Buscando preços...');
    
    try {
      // Construir query de busca
      let query = supabase
        .from('pncp_prices')
        .select('*');
      
      // Aplicar filtros
      if (searchParams.descricaoItem) {
        query = query.ilike('descricao_item', `%${searchParams.descricaoItem}%`);
      }
      
      if (searchParams.ufs && searchParams.ufs.length > 0) {
        query = query.in('uf', searchParams.ufs);
      }
      
      if (searchParams.cnpjOrgao) {
        query = query.eq('cnpj_orgao', searchParams.cnpjOrgao);
      }
      
      // Ordenar e limitar resultados
      query = query.order('data_atualizacao', { ascending: false }).limit(100);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      setResults(data || []);
      setStatusMessage(`${data?.length || 0} registros encontrados.`);
      
    } catch (error) {
      console.error('Erro na busca:', error);
      setStatusMessage(`Erro: ${error.message}`);
      toast({
        title: 'Erro na busca',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const formatarData = (dataString) => {
    if (!dataString) return 'Data não informada';
    
    try {
      const data = new Date(dataString);
      return format(data, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dataString;
    }
  };
  
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Preços PNCP</h1>
          <p className="text-muted-foreground">
            Consulte preços de Atas de Registro de Preço do Portal Nacional de Contratações Públicas
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sync">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="w-4 h-4 mr-2" />
            Consultar
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Database className="w-4 h-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronização com PNCP
              </CardTitle>
              <CardDescription>
                Sincronize preços de Atas de Registro de Preço do PNCP para consulta local
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dataInicial">Data Inicial (AAAAMMDD)</Label>
                  <Input
                    id="dataInicial"
                    placeholder="Ex: 20250101"
                    value={searchParams.dataInicial}
                    onChange={(e) => setSearchParams({ ...searchParams, dataInicial: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dataFinal">Data Final (AAAAMMDD)</Label>
                  <Input
                    id="dataFinal"
                    placeholder="Ex: 20250725"
                    value={searchParams.dataFinal}
                    onChange={(e) => setSearchParams({ ...searchParams, dataFinal: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="cnpjOrgao">CNPJ do Órgão (opcional)</Label>
                <Input
                  id="cnpjOrgao"
                  placeholder="Ex: 12345678000199"
                  value={searchParams.cnpjOrgao}
                  onChange={(e) => setSearchParams({ ...searchParams, cnpjOrgao: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se não informado, buscará atas de todos os órgãos no período
                </p>
              </div>
              
              <div>
                <Label htmlFor="descricaoItem">Descrição do Item (opcional)</Label>
                <Input
                  id="descricaoItem"
                  placeholder="Ex: material de escritório"
                  value={searchParams.descricaoItem}
                  onChange={(e) => setSearchParams({ ...searchParams, descricaoItem: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar com PNCP
                </Button>
              </div>
              
              {statusMessage && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}
              
              <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4" />
                <AlertTitle>Como funciona</AlertTitle>
                <AlertDescription className="text-sm">
                  <p>Esta ferramenta busca dados de Atas de Registro de Preço diretamente na API oficial do PNCP.</p>
                  <p className="mt-1">Os dados são armazenados localmente para consulta rápida e análise de preços.</p>
                  <p className="mt-1">Especifique um período e opcionalmente um CNPJ de órgão específico.</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Últimos Preços Sincronizados
                  <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    API Oficial PNCP
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {results.length} preços sincronizados com o PNCP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.slice(0, 10).map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">
                              {item.descricao_item}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ata PNCP: {item.ata_pncp}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatarMoeda(item.valor_unitario)}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                        <div>
                          <span className="font-medium">Órgão:</span> {item.nome_orgao}
                        </div>
                        <div>
                          <span className="font-medium">Local:</span> {item.municipio}, {item.uf}
                        </div>
                        <div>
                          <span className="font-medium">Quantidade:</span> {item.quantidade} {item.unidade}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consulta de Preços
              </CardTitle>
              <CardDescription>
                Busque preços de itens já sincronizados do PNCP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="searchDescricao">Descrição do Item</Label>
                <Input
                  id="searchDescricao"
                  placeholder="Ex: material de escritório"
                  value={searchParams.descricaoItem}
                  onChange={(e) => setSearchParams({ ...searchParams, descricaoItem: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Buscar Preços
                </Button>
              </div>
              
              {statusMessage && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados da Busca</CardTitle>
                <CardDescription>
                  {results.length} preços encontrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {item.descricao_item}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>Ata {item.numero_ata || item.ata_pncp}</span>
                          </div>
                        </div>
                        <Badge className="text-lg font-semibold">
                          {formatarMoeda(item.valor_unitario)}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                        <div>
                          <h5 className="text-sm font-medium mb-1">Detalhes do Item</h5>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="font-medium">Unidade:</span> {item.unidade}
                            </p>
                            <p>
                              <span className="font-medium">Quantidade:</span> {item.quantidade}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-1">Informações do Órgão</h5>
                          <div className="space-y-1 text-sm">
                            <p>{item.nome_orgao}</p>
                            <p>{item.municipio}, {item.uf}</p>
                            {item.cnpj_orgao && <p>CNPJ: {item.cnpj_orgao}</p>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                        <span>Atualizado em {formatarData(item.data_atualizacao)}</span>
                        <span>Data da Ata: {formatarData(item.data_ata)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <div className="text-xs text-muted-foreground">
                  Mostrando {results.length > 100 ? '100' : results.length} de {results.length} resultados
                </div>
              </CardFooter>
            </Card>
          )}
          
          {!loading && results.length === 0 && statusMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Nenhum resultado</AlertTitle>
              <AlertDescription>
                Não foram encontrados registros com os critérios especificados. Tente refinar sua busca ou sincronizar mais dados do PNCP.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Preços
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <div className="text-2xl font-bold">{results.length > 0 ? results.length : '-'}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Atas Processadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <div className="text-2xl font-bold">-</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Última Sincronização
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <div className="text-2xl font-bold">{results.length > 0 ? formatarData(results[0]?.data_atualizacao) : '-'}</div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Para ver estatísticas detalhadas, sincronize ou busque dados primeiro.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
