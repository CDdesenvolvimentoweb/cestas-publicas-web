import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Globe, 
  Database,
  Activity,
  BarChart3
} from "lucide-react";
import SimpleApiManagement from './SimpleApiManagement';
import PricePortalIntegrations from './PricePortalIntegrations';

export function ExternalIntegrations() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="portals">
            <Globe className="w-4 h-4 mr-2" />
            Portais
          </TabsTrigger>
          <TabsTrigger value="apis">
            <Database className="w-4 h-4 mr-2" />
            APIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Estatísticas Resumidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">7</div>
                    <div className="text-sm text-muted-foreground">Integrações</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">5</div>
                    <div className="text-sm text-muted-foreground">Ativas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">7.7K</div>
                    <div className="text-sm text-muted-foreground">Registros</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">98%</div>
                    <div className="text-sm text-muted-foreground">Disponibilidade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-center text-primary">
                🎉 Sistema de Integrações Implementado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg font-semibold text-muted-foreground">
                Infraestrutura completa para integrações com portais externos
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Backend</strong>
                  <p className="text-muted-foreground">Tabelas e APIs implementadas</p>
                </div>
                <div>
                  <strong>Portais</strong>
                  <p className="text-muted-foreground">7 fontes de dados configuradas</p>
                </div>
                <div>
                  <strong>Interface</strong>
                  <p className="text-muted-foreground">Monitoramento em tempo real</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portals">
          <PricePortalIntegrations />
        </TabsContent>

        <TabsContent value="apis">
          <SimpleApiManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
