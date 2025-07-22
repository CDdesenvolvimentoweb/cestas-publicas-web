import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Settings, 
  Play, 
  Pause, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExternalApi {
  id: string;
  name: string;
  endpoint: string;
  auth_token?: string;
  auth_type: string;
  headers?: string;
  rate_limit: number;
  is_active: boolean;
  last_sync?: string;
  created_at: string;
}

interface SyncLog {
  id: string;
  api_id: string;
  status: string;
  records_processed: number;
  error_message?: string;
  sync_type: string;
  started_at: string;
  completed_at?: string;
  external_apis: {
    name: string;
  };
}

export default function ExternalApiManagement() {
  const [selectedApi, setSelectedApi] = useState<ExternalApi | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    auth_token: '',
    auth_type: 'Bearer',
    headers: '{}',
    rate_limit: 60,
    is_active: true
  });

  const queryClient = useQueryClient();

  // Buscar APIs externas
  const { data: apis, isLoading } = useQuery({
    queryKey: ['external-apis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_apis')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExternalApi[];
    }
  });

  // Buscar logs de sincronização
  const { data: syncLogs } = useQuery({
    queryKey: ['external-price-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_price_sync_logs')
        .select(`
          *,
          external_apis(name)
        `)
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as SyncLog[];
    }
  });

  // Salvar configuração
  const saveApiMutation = useMutation({
    mutationFn: async (api: Partial<ExternalApi>) => {
      if (api.id) {
        const { data, error } = await supabase
          .from('external_apis')
          .update(api)
          .eq('id', api.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('external_apis')
          .insert(api)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('API configurada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  // Executar sincronização
  const syncMutation = useMutation({
    mutationFn: async (apiId: string) => {
      const { data, error } = await supabase.functions.invoke('price-sync', {
        body: { api_id: apiId, sync_type: 'manual' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-price-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      toast.success(`Sincronização concluída! ${data.records_processed} registros processados.`);
    },
    onError: (error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    }
  });

  // Deletar API
  const deleteApiMutation = useMutation({
    mutationFn: async (apiId: string) => {
      const { error } = await supabase
        .from('external_apis')
        .delete()
        .eq('id', apiId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      toast.success('API removida com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      endpoint: '',
      auth_token: '',
      auth_type: 'Bearer',
      headers: '{}',
      rate_limit: 60,
      is_active: true
    });
    setSelectedApi(null);
  };

  const handleEdit = (api: ExternalApi) => {
    setSelectedApi(api);
    setFormData({
      name: api.name,
      endpoint: api.endpoint,
      auth_token: api.auth_token || '',
      auth_type: api.auth_type,
      headers: api.headers || '{}',
      rate_limit: api.rate_limit,
      is_active: api.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const api = {
      ...formData,
      ...(selectedApi && { id: selectedApi.id })
    };
    
    saveApiMutation.mutate(api);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      running: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">APIs Externas</h2>
          <p className="text-muted-foreground">
            Gerencie conexões com APIs de preços públicos
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova API
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedApi ? 'Editar API' : 'Nova API Externa'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Painel de Preços"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">URL do Endpoint</Label>
                <Input
                  id="endpoint"
                  type="url"
                  value={formData.endpoint}
                  onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="https://api.exemplo.com/v1/precos"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_type">Tipo de Autenticação</Label>
                <Select
                  value={formData.auth_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, auth_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bearer">Bearer Token</SelectItem>
                    <SelectItem value="Basic">Basic Auth</SelectItem>
                    <SelectItem value="API-Key">API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth_token">Token de Autenticação</Label>
                <Input
                  id="auth_token"
                  type="password"
                  value={formData.auth_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, auth_token: e.target.value }))}
                  placeholder="Token de acesso à API"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">Headers Personalizados (JSON)</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                  placeholder='{"Content-Type": "application/json"}'
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate_limit">Limite de Requisições/Minuto</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  value={formData.rate_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_limit: parseInt(e.target.value) }))}
                  min="1"
                  max="1000"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">API Ativa</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveApiMutation.isPending}
                  className="flex-1"
                >
                  {saveApiMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apis?.map((api) => (
          <Card key={api.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{api.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={api.is_active ? 'default' : 'secondary'}>
                    {api.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncMutation.mutate(api.id)}
                    disabled={!api.is_active || syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(api)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteApiMutation.mutate(api.id)}
                    disabled={deleteApiMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Endpoint:</span> {api.endpoint}
              </div>
              <div className="text-sm">
                <span className="font-medium">Auth:</span> {api.auth_type}
              </div>
              <div className="text-sm">
                <span className="font-medium">Rate Limit:</span> {api.rate_limit}/min
              </div>
              {api.last_sync && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Última sync:</span>{' '}
                  {new Date(api.last_sync).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(!apis || apis.length === 0) && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma API configurada ainda</p>
            <p className="text-sm">Clique em "Nova API" para começar</p>
          </div>
        )}
      </div>

      {/* Logs de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Logs de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncLogs?.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <div className="font-medium">{log.external_apis.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.started_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div>{log.records_processed} registros</div>
                    <div className="text-muted-foreground capitalize">{log.sync_type}</div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              </div>
            ))}
            
            {(!syncLogs || syncLogs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma sincronização realizada ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
