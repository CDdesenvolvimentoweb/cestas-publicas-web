import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Settings, 
  Download, 
  RefreshCw, 
  Globe, 
  Database,
  Check,
  X,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PricePortalIntegrations() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const queryClient = useQueryClient();

  // Buscar integrações configuradas
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['price-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_price_integrations')
        .select('*')
        .order('source_name');

      if (error) throw error;
      return data || [];
    }
  });

  // Buscar logs de sincronização
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['integration-sync-logs', selectedIntegration],
    queryFn: async () => {
      if (!selectedIntegration) return [];

      const { data, error } = await supabase
        .from('integration_sync_logs')
        .select('*')
        .eq('integration_source_id', selectedIntegration)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIntegration
  });

  // Executar sincronização manual
  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      // Aqui seria a chamada para uma Edge Function que faz a sincronização
      const { data, error } = await supabase.functions.invoke('sync-price-integration', {
        body: { integration_id: integrationId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Sincronização iniciada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['integration-sync-logs'] });
    },
    onError: (error: any) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    }
  });

  // Toggle ativo/inativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('external_price_integrations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-integrations'] });
      toast.success('Status da integração atualizado!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  const handleSync = useCallback((integrationId: string) => {
    syncMutation.mutate(integrationId);
  }, [syncMutation]);

  const handleToggleActive = useCallback((integration: any) => {
    toggleActiveMutation.mutate({
      id: integration.id,
      isActive: integration.is_active
    });
  }, [toggleActiveMutation]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'success': { variant: 'default' as const, color: 'bg-green-500', label: 'Sucesso' },
      'error': { variant: 'destructive' as const, color: 'bg-red-500', label: 'Erro' },
      'running': { variant: 'secondary' as const, color: 'bg-blue-500', label: 'Executando' },
      'pending': { variant: 'outline' as const, color: 'bg-yellow-500', label: 'Pendente' }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Integrações de Preços
          </h2>
          <p className="text-muted-foreground">
            Gerencie conexões com portais externos de preços públicos
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrações Ativas</TabsTrigger>
          <TabsTrigger value="logs">Logs de Sincronização</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{integration.source_name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(integration)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {integration.is_active ? (
                        <Pause className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {integration.is_active ? (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URL:</span>
                      <span className="truncate max-w-32" title={integration.source_url}>
                        {integration.source_url}
                      </span>
                    </div>
                    
                    {integration.last_sync_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última Sync:</span>
                        <span className="text-xs">
                          {format(new Date(integration.last_sync_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    )}

                    {integration.sync_frequency_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequência:</span>
                        <span className="text-xs">
                          {integration.sync_frequency_hours}h
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(integration.id)}
                      disabled={syncMutation.isPending || !integration.is_active}
                      className="flex-1"
                    >
                      {syncMutation.isPending ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      Sincronizar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIntegration(integration.id)}
                    >
                      <Activity className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {integrations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-40">
                <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Nenhuma integração configurada</p>
                <p className="text-sm text-muted-foreground text-center">
                  Configure integrações com portais externos para coleta automática de preços
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {selectedIntegration ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Logs de Sincronização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(log.status || 'pending')}
                          <span className="text-sm text-muted-foreground">
                            {log.sync_type}
                          </span>
                        </div>
                        
                        {log.started_at && (
                          <p className="text-xs text-muted-foreground">
                            Iniciado: {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </p>
                        )}
                        
                        {log.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Concluído: {format(new Date(log.completed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-sm">
                        {log.records_processed && (
                          <p>Processados: {log.records_processed}</p>
                        )}
                        {log.records_inserted && (
                          <p className="text-green-600">Inseridos: {log.records_inserted}</p>
                        )}
                        {log.records_updated && (
                          <p className="text-blue-600">Atualizados: {log.records_updated}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {syncLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>Nenhum log de sincronização encontrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Database className="w-4 h-4" />
              <AlertDescription>
                Selecione uma integração para visualizar os logs de sincronização.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações de Integração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="w-4 h-4" />
                <AlertDescription>
                  As configurações de integração são gerenciadas através do banco de dados.
                  Entre em contato com o administrador do sistema para adicionar novas integrações.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
