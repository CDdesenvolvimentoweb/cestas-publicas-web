import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Play, 
  RefreshCw, 
  Plus, 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Globe,
  Database,
  Activity,
  ExternalLink
} from 'lucide-react';

export default function SimpleApiManagement() {
  const [syncing, setSyncing] = useState<string | null>(null);

  const apis = [
    {
      id: '1',
      name: 'Painel de Preços',
      endpoint: 'https://paineldeprecos.planejamento.gov.br/api',
      description: 'Portal oficial do governo federal para consulta de preços',
      status: 'active',
      lastSync: '2024-01-15 10:30',
      recordCount: 1250
    },
    {
      id: '2',
      name: 'PNCP',
      endpoint: 'https://pncp.gov.br/api/v1',
      description: 'Portal Nacional de Contratações Públicas',
      status: 'active',
      lastSync: '2024-01-15 09:15',
      recordCount: 890
    },
    {
      id: '3',
      name: 'BPS - Banco de Preços',
      endpoint: 'https://bps.planejamento.gov.br/api',
      description: 'Banco de Preços de Serviços do Governo Federal',
      status: 'syncing',
      lastSync: '2024-01-15 11:00',
      recordCount: 675
    },
    {
      id: '4',
      name: 'SINAPI',
      endpoint: 'https://www.caixa.gov.br/sinapi/api',
      description: 'Sistema Nacional de Pesquisa de Custos',
      status: 'error',
      lastSync: '2024-01-14 16:20',
      recordCount: 450,
      error: 'Erro de autenticação'
    },
    {
      id: '5',
      name: 'CONAB',
      endpoint: 'https://www.conab.gov.br/api',
      description: 'Companhia Nacional de Abastecimento',
      status: 'active',
      lastSync: '2024-01-15 08:45',
      recordCount: 2340
    }
  ];

  const logs = [
    {
      id: '1',
      apiName: 'Painel de Preços',
      status: 'success',
      recordsProcessed: 125,
      startedAt: '2024-01-15 10:30:00',
      duration: '45s'
    },
    {
      id: '2',
      apiName: 'PNCP',
      status: 'success',
      recordsProcessed: 89,
      startedAt: '2024-01-15 09:15:00',
      duration: '32s'
    },
    {
      id: '3',
      apiName: 'BPS',
      status: 'running',
      recordsProcessed: 45,
      startedAt: '2024-01-15 11:00:00',
      duration: 'Em andamento'
    },
    {
      id: '4',
      apiName: 'SINAPI',
      status: 'error',
      recordsProcessed: 0,
      startedAt: '2024-01-14 16:20:00',
      duration: '5s',
      error: 'Falha na autenticação'
    }
  ];

  const handleSync = async (apiId: string, apiName: string) => {
    setSyncing(apiId);
    
    // Simular sincronização
    setTimeout(() => {
      setSyncing(null);
      console.log(`Sincronização concluída para ${apiName}`);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      syncing: 'secondary',
      error: 'destructive',
      success: 'default',
      running: 'secondary'
    } as const;

    const labels = {
      active: 'Ativo',
      syncing: 'Sincronizando',
      error: 'Erro',
      success: 'Concluído',
      running: 'Executando'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">APIs Externas</h2>
          <p className="text-muted-foreground">
            Gerencie conexões com APIs de preços públicos
          </p>
        </div>
        
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Configurar Nova API
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{apis.length}</div>
                <div className="text-sm text-muted-foreground">Total de APIs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {apis.filter(api => api.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Ativas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {apis.filter(api => api.status === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Com Erro</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {apis.reduce((sum, api) => sum + api.recordCount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Registros</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apis.map((api) => (
          <Card 
            key={api.id} 
            className={`relative ${
              api.status === 'error' ? 'border-red-200 bg-red-50' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{api.name}</CardTitle>
                </div>
                {getStatusIcon(api.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {api.description}
              </p>
              
              <div className="text-sm">
                <span className="font-medium">Endpoint:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {api.endpoint}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                {getStatusBadge(api.status)}
                <span className="text-sm font-medium">
                  {api.recordCount.toLocaleString()} registros
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Última sync: {api.lastSync}
              </div>
              
              {api.error && (
                <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                  {api.error}
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleSync(api.id, api.name)}
                  disabled={api.status === 'syncing' || syncing === api.id}
                >
                  {(api.status === 'syncing' || syncing === api.id) ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Sincronizando
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Sincronizar
                    </>
                  )}
                </Button>
                
                <Button size="sm" variant="outline" disabled>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Logs de Sincronização Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <div className="font-medium">{log.apiName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div>{log.recordsProcessed} registros</div>
                    <div className="text-muted-foreground">{log.duration}</div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
