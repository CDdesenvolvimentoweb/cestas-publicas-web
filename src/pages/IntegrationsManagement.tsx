import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  Activity
} from 'lucide-react';

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
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  error_message: string | null;
}

const IntegrationsManagement: React.FC = () => {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async (): Promise<Integration[]> => {
      const { data, error } = await supabase
        .from('external_price_integrations')
        .select('*')
        .order('source_name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch sync logs
  const { data: syncLogs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async (): Promise<SyncLog[]> => {
      const { data, error } = await supabase
        .from('integration_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Toggle integration status
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('external_price_integrations')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Status da integração atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar integração: ${error.message}`);
    }
  });

  // Manual sync trigger
  const manualSyncMutation = useMutation({
    mutationFn: async (integrationId?: string) => {
      const { data, error } = await supabase.functions.invoke('price-sync-v2', {
        body: { integration_id: integrationId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      toast.success('Sincronização iniciada');
    },
    onError: (error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    }
  });

  const getStatusBadge = (integration: Integration) => {
    if (!integration.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    
    if (!integration.last_sync_at) {
      return <Badge variant="outline">Nunca sincronizado</Badge>;
    }
    
    const lastSync = new Date(integration.last_sync_at);
    const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo > integration.sync_frequency_hours * 2) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    
    return <Badge variant="default">Ativo</Badge>;
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Nunca';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Há menos de 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} dias`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Integrações</h1>
          <p className="text-muted-foreground">
            Configure e monitore as integrações com portais externos
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => manualSyncMutation.mutate()}
            disabled={manualSyncMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${manualSyncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar Tudo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="logs">Logs de Sincronização</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {integrationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations?.map((integration) => (
                <Card key={integration.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{integration.source_name}</CardTitle>
                        <CardDescription className="text-sm">
                          {integration.source_url}
                        </CardDescription>
                      </div>
                      {getStatusBadge(integration)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Última Sync</Label>
                        <p className="font-medium">{formatLastSync(integration.last_sync_at)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Frequência</Label>
                        <p className="font-medium">{integration.sync_frequency_hours}h</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={integration.is_active}
                          onCheckedChange={(checked) => 
                            toggleIntegrationMutation.mutate({
                              id: integration.id,
                              is_active: checked
                            })
                          }
                          disabled={toggleIntegrationMutation.isPending}
                        />
                        <Label className="text-sm">
                          {integration.is_active ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => manualSyncMutation.mutate(integration.id)}
                          disabled={!integration.is_active || manualSyncMutation.isPending}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        
                        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedIntegration(integration)}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Configurar {selectedIntegration?.source_name}</DialogTitle>
                            </DialogHeader>
                            <IntegrationConfigForm 
                              integration={selectedIntegration}
                              onClose={() => setIsConfigDialogOpen(false)}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {integration.api_key_required && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Esta integração requer configuração de API Key
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <SyncLogsTable logs={syncLogs || []} />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <IntegrationStatistics integrations={integrations || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Additional components would be implemented here:
// - IntegrationConfigForm
// - SyncLogsTable  
// - IntegrationStatistics

export default IntegrationsManagement;