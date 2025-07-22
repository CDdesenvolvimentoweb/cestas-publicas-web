import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Zap, Brain, Database, CheckCircle, Globe } from "lucide-react"
import { ExternalIntegrations } from '@/components/integrations/ExternalIntegrations';

export default function Integrations() {
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

      <Tabs defaultValue="external" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external">
            <Globe className="w-4 h-4 mr-2" />
            Integrações Externas
          </TabsTrigger>
          <TabsTrigger value="infrastructure">
            <Database className="w-4 h-4 mr-2" />
            Infraestrutura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="space-y-6">
          <ExternalIntegrations />
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
                  <li>✓ Edge Function price-sync</li>
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
                  <li>✓ Edge Function workflow-engine</li>
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
                  <li>✓ Edge Function ai-suggestions</li>
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
              <CardTitle className="text-center text-primary">🎉 Sistema de Integrações Implementado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg font-semibold text-muted-foreground">
                Infraestrutura completa para integrações com portais externos
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Backend SQL</strong>
                  <p className="text-muted-foreground">Tabelas e políticas RLS implementadas</p>
                </div>
                <div>
                  <strong>Integrações</strong>
                  <p className="text-muted-foreground">7 portais principais configurados</p>
                </div>
                <div>
                  <strong>Interface</strong>
                  <p className="text-muted-foreground">Sistema de monitoramento e controle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
