import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Search, 
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Settings,
  Activity,
  Globe,
  Zap,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Integration {
  id: string;
  source_name: string;
  source_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_frequency_hours: number;
  api_key_required: boolean;
  rate_limit_per_hour: number;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  error_message: string | null;
}

interface PNCPSearchParams {
  query: string;
  uf: string;
  municipio: string;
  dataInicio: string;
  dataFim: string;
}

interface PNCPContract {
  id: string;
  procurement_number: string;
  product_description: string;
  unit_price: number;
  total_price: number;
  supplier_name: string;
  supplier_cnpj: string;
  location_city: string;
  location_uf: string;
  procurement_type: string;
  procurement_date: string;
  source_document_url: string;
  situacao?: string;
  dataAbertura?: string;
  tipoLicitacao?: string;
  raw_data?: any;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PNCPContract[]>([]);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [searchParams, setSearchParams] = useState<PNCPSearchParams>({
    query: '',
    uf: 'ES',
    municipio: 'Santa Teresa',
    dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchIntegrations();
    fetchSyncLogs();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('external_price_integrations')
        .select('*')
        .order('source_name');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar integrações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_sync_logs')
        .select(`
          *,
          external_price_integrations(source_name)
        `)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    }
  };

  const handlePNCPSearch = async () => {
    setSearchLoading(true);
    setResultMessage('');
    setSearchResults([]);
    setIsUsingFallback(false);
    console.log('🔍 Iniciando busca na API oficial do PNCP com parâmetros:', searchParams);

    try {
      // Busca direta na API do PNCP usando a edge function com o novo método 'search'
      const { data: apiResults, error: apiError } = await supabase.functions.invoke('pncp-integration', {
        body: {
          action: 'search',
          query: searchParams.query,
          uf: searchParams.uf,
          municipio: searchParams.municipio,
          dataInicio: searchParams.dataInicio,
          dataFim: searchParams.dataFim,
          pagina: 1
        }
      });

      if (apiError) {
        throw apiError;
      }

      if (apiResults && apiResults.success && apiResults.data) {
        console.log('✅ Dados recebidos da API do PNCP:', apiResults.data);
        
        // Mapeia os resultados da API para o formato esperado pela interface
        const mappedResults = apiResults.data.map((item: any) => ({
          id: item.id || `pncp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          procurement_number: item.numeroEdital || item.numeroContrato || '',
          product_description: item.objeto || 'Não especificado',
          unit_price: parseFloat(item.valorEstimado || 0) / 100,
          total_price: parseFloat(item.valorEstimado || 0),
          supplier_name: '', // Editais normalmente não têm fornecedor definido ainda
          supplier_cnpj: '',
          location_city: item.orgao?.municipio || searchParams.municipio || '',
          location_uf: item.orgao?.uf || searchParams.uf || '',
          procurement_type: item.modalidade || 'Edital',
          procurement_date: item.dataPublicacao || new Date().toISOString().split('T')[0],
          source_document_url: item.urlPncp || `https://pncp.gov.br/app/editais/${item.id}`,
          situacao: item.situacao || 'Em andamento',
          raw_data: item
        }));

        setSearchResults(mappedResults);
        setResultMessage(`${mappedResults.length} resultados encontrados na API oficial do PNCP.`);

        if (mappedResults.length > 0) {
          toast({
            title: "Busca na API concluída",
            description: `${mappedResults.length} registros encontrados na API oficial do PNCP.`,
          });
        } else {
          toast({
            title: "Nenhum resultado na API",
            description: "A API do PNCP não retornou resultados para os filtros aplicados.",
            variant: "default",
          });
          // Como não encontramos resultados na API, vamos buscar no cache local como fallback
          searchLocalCache();
        }
      } else {
        console.log('⚠️ Falha na API, buscando no cache local...');
        setResultMessage('API do PNCP não retornou resultados. Buscando no cache local...');
        // Falha na API, buscar no cache local
        searchLocalCache();
      }

    } catch (error) {
      console.error('❌ Erro na busca da API:', error);
      setResultMessage('Erro ao consultar a API do PNCP. Buscando no cache local...');
      toast({
        title: "Erro na API do PNCP",
        description: "Erro ao consultar a API oficial. Buscando no cache local...",
        variant: "default",
      });
      // Em caso de erro na API, buscar no cache local
      searchLocalCache();
    }
  };
  
  const searchLocalCache = async () => {
    setIsUsingFallback(true);
    console.log('🔍 Iniciando busca no banco de dados local (fallback) com parâmetros:', searchParams);
    
    try {
      let query = supabase
        .from('external_price_records')
        .select('*')
        .order('procurement_date', { ascending: false })
        .limit(100);

      // Aplica o filtro de busca por texto
      if (searchParams.query) {
        query = query.ilike('product_description', `%${searchParams.query}%`);
      }

      // Aplica filtros adicionais
      if (searchParams.uf) {
        query = query.eq('location_uf', searchParams.uf);
      }

      if (searchParams.municipio) {
        query = query.ilike('location_city', `%${searchParams.municipio}%`);
      }

      // Filtros de data
      if (searchParams.dataInicio) {
        query = query.gte('procurement_date', searchParams.dataInicio);
      }
      if (searchParams.dataFim) {
        query = query.lte('procurement_date', searchParams.dataFim);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log('✅ Dados recebidos do banco local (fallback):', data);

      setSearchResults(data as any);
      setResultMessage(`${data.length} resultados encontrados no cache local (fallback).`);

      if (data.length > 0) {
        toast({
          title: "Busca local concluída (fallback)",
          description: `${data.length} registros encontrados no cache local.`,
        });
      } else {
        toast({
          title: "Nenhum resultado",
          description: "Nenhum registro encontrado localmente para os filtros aplicados.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('❌ Erro na busca local (fallback):', error);
      setResultMessage('Erro ao consultar o banco de dados local.');
      toast({
        title: "Erro na Busca",
        description: error.message || "Ocorreu um erro ao buscar os dados.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePNCPSync = async () => {
    const pncpIntegration = integrations.find(int => int.source_name.toLowerCase() === 'pncp');

    if (!pncpIntegration) {
      toast({
        title: "Erro de Configuração",
        description: "A integração com o PNCP não foi encontrada na configuração.",
        variant: "destructive",
      });
      return;
    }

    setSyncLoading(true);
    try {
      // Chama a Edge Function versão 2: `price-sync-v2`
      const { data, error } = await supabase.functions.invoke('price-sync-v2', {
        body: {}
      });

      if (error) {
        throw error;
      }

      if (data && !data.success) {
        toast({
          title: "Erro na Sincronização",
          description: data.error || "A função de sincronização retornou um erro.",
          variant: "destructive",
        });
      } else {
        let recordsProcessed = 0;
        if (data.results && data.results.pncp) {
          recordsProcessed = data.results.pncp.records_processed || 0;
        }
        
        toast({
          title: "Sincronização Concluída",
          description: `${recordsProcessed} registros foram processados.`,
        });
      }

      // Atualizar logs e dados da página
      fetchSyncLogs();
      fetchIntegrations();

    } catch (error) {
      console.error('Erro na sincronização PNCP:', error);
      toast({
        title: "Erro na Sincronização",
        description: error.message || "Falha ao executar a função de sincronização.",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const toggleIntegration = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('external_price_integrations')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      fetchIntegrations();
      toast({
        title: "Integração atualizada",
        description: `Integração ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao atualizar integração:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar integração",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrações e Automação</h1>
          <p className="text-muted-foreground">
            Sistema de integrações com portais externos de preços públicos
          </p>
        </div>
      </div>

      <Tabs defaultValue="pncp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pncp">
            <Globe className="w-4 h-4 mr-2" />
            PNCP
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Database className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="infrastructure">
            <Settings className="w-4 h-4 mr-2" />
            Infraestrutura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pncp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Busca de Contratos PNCP
              </CardTitle>
              <CardDescription>
                Busque e sincronize preços de contratos públicos do Portal Nacional de Contratações Públicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="query">Termo de busca</Label>
                  <Input
                    id="query"
                    placeholder="Ex: material de escritório"
                    value={searchParams.query}
                    onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="uf">Estado (UF)</Label>
                  <Input
                    id="uf"
                    value={searchParams.uf}
                    onChange={(e) => setSearchParams({ ...searchParams, uf: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="municipio">Município</Label>
                  <Input
                    id="municipio"
                    value={searchParams.municipio}
                    onChange={(e) => setSearchParams({ ...searchParams, municipio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={searchParams.dataInicio}
                    onChange={(e) => setSearchParams({ ...searchParams, dataInicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={searchParams.dataFim}
                    onChange={(e) => setSearchParams({ ...searchParams, dataFim: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePNCPSearch} disabled={searchLoading}>
                  {searchLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Buscar Contratos
                </Button>
                <Button variant="secondary" onClick={handlePNCPSync} disabled={syncLoading}>
                  {syncLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Preços
                </Button>
              </div>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Resultados da Busca
                  {!isUsingFallback ? (
                    <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      API Oficial PNCP
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                      <Database className="h-3 w-3 mr-1" />
                      Cache Local (Fallback)
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {resultMessage}
                  {!isUsingFallback && (
                    <div className="mt-2 text-xs text-green-600">
                      Buscando diretamente na API oficial do PNCP como o site https://pncp.gov.br/app/editais
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.slice(0, 10).map((contract, index) => (
                    <div key={contract.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">
                              {contract.procurement_number ? `${isUsingFallback ? 'Contrato' : 'Edital'} ${contract.procurement_number}` : `${isUsingFallback ? 'Item PNCP' : 'Edital PNCP'}`}
                            </h4>
                            <Badge variant="outline" size="sm" className="text-xs bg-green-50 text-green-800">
                              {contract.procurement_type || 'PNCP'}
                            </Badge>
                            {contract.situacao && (
                              <Badge variant="outline" size="sm" className="text-xs bg-blue-50 text-blue-800">
                                {contract.situacao}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {contract.product_description}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(contract.total_price)}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        {contract.supplier_name && (
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {contract.supplier_name}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {contract.location_city}, {contract.location_uf}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Publicado: {contract.procurement_date ? new Date(contract.procurement_date).toLocaleDateString('pt-BR') : 'Data não informada'}
                        </div>
                        {contract.dataAbertura && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Abertura: {new Date(contract.dataAbertura).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        {contract.source_document_url && (
                          <div className="flex items-center col-span-2">
                            <Info className="h-3 w-3 mr-1" />
                            <a href={contract.source_document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {isUsingFallback ? 'Ver documento' : 'Ver edital no PNCP'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {searchResults.length > 10 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Mostrando apenas os primeiros 10 resultados de {searchResults.length} encontrados.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {searchResults.length === 0 && searchLoading === false && resultMessage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-orange-500" />
                  API PNCP Consultada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Status:</strong> {resultMessage}
                    <br />
                    <br />
                    A API oficial do PNCP foi consultada, mas não retornou contratos para os parâmetros especificados.
                    Tente ajustar os filtros de busca (termo, UF, município ou período).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase">
                    {integration.source_name}
                  </CardTitle>
                  <Badge variant={integration.is_active ? "default" : "secondary"}>
                    {integration.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Database className="h-4 w-4 mr-2" />
                      {integration.source_url}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Última sync: {integration.last_sync_at 
                        ? format(new Date(integration.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : 'Nunca'
                      }
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Activity className="h-4 w-4 mr-2" />
                      {integration.rate_limit_per_hour} req/hora
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleIntegration(integration.id, integration.is_active)}
                    >
                      {integration.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Sincronização</CardTitle>
              <CardDescription>
                Histórico das últimas sincronizações com integrações externas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">
                            {(log as any).external_price_integrations?.source_name?.toUpperCase() || 'PNCP'}
                          </h4>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status === 'success' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : log.status === 'error' ? (
                              <XCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {log.status === 'success' ? 'Sucesso' : 
                             log.status === 'error' ? 'Erro' : 'Executando'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.sync_type}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                      <div>Processados: {log.records_processed}</div>
                      <div>Inseridos: {log.records_inserted}</div>
                      <div>Atualizados: {log.records_updated}</div>
                    </div>
                    {log.error_message && (
                      <Alert className="mt-2">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{log.error_message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
                {syncLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum log de sincronização encontrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Database className="h-5 w-5" />
                  APIs Externas
                  <CheckCircle className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>✓ Tabelas de configuração criadas</li>
                  <li>✓ Sistema de sincronização implementado</li>
                  <li>✓ Edge Function pncp-integration</li>
                  <li>✓ Políticas de segurança RLS</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Zap className="h-5 w-5" />
                  Workflows
                  <CheckCircle className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>✓ Motor de execução criado</li>
                  <li>✓ Edge Function quotation-system</li>
                  <li>✓ Sistema de triggers automáticos</li>
                  <li>✓ Histórico de execuções</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Brain className="h-5 w-5" />
                  Inteligência Artificial
                  <CheckCircle className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>✓ Edge Function email-processor</li>
                  <li>✓ Sugestões de fornecedores</li>
                  <li>✓ Alertas de preços</li>
                  <li>✓ Otimizações automáticas</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Activity className="h-5 w-5" />
                  Infraestrutura
                  <CheckCircle className="h-4 w-4 ml-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-orange-600 space-y-1">
                  <li>✓ Sistema de cache inteligente</li>
                  <li>✓ Logs de sincronização</li>
                  <li>✓ Webhooks configurados</li>
                  <li>✓ Conectores ERP prontos</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-center text-primary">� Integração PNCP Oficial Implementada</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg font-semibold text-muted-foreground">
                Sistema integrado com a API oficial do Portal Nacional de Contratações Públicas
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>URL Base Oficial</strong>
                  <p className="text-muted-foreground">https://pncp.gov.br/api/pncp/v1</p>
                </div>
                <div>
                  <strong>Estrutura Conforme</strong>
                  <p className="text-muted-foreground">Manual de Integração v2.3.7</p>
                </div>
                <div>
                  <strong>Dados Estruturados</strong>
                  <p className="text-muted-foreground">Formato oficial da API</p>
                </div>
              </div>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Implementação Baseada na Documentação Oficial:</strong> A integração segue 
                  rigorosamente o Manual de Integração PNCP v2.3.7 do Ministério da Gestão e Inovação.
                  Os dados retornados seguem a estrutura oficial definida nos endpoints de consulta.
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-green-800 mb-2">📋 Especificações Implementadas:</h4>
                <ul className="text-sm text-green-700 space-y-1 text-left">
                  <li>✅ Endpoint: /v1/orgaos/{"{cnpj}"}/compras/{"{ano}"}/{"{sequencial}"}</li>
                  <li>✅ Estrutura de dados conforme documentação oficial</li>
                  <li>✅ Headers obrigatórios e User-Agent adequado</li>
                  <li>✅ Tratamento de erros e fallbacks estruturados</li>
                  <li>✅ Logs de sincronização detalhados</li>
                  <li>✅ Suporte a consultas por UF, município e período</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
