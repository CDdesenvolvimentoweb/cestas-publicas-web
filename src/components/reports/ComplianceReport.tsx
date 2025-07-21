import React, { useState } from 'react';
import { FileText, Download, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ComplianceItem {
  id: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  description: string;
  evidence?: string[];
}

interface ComplianceReportProps {
  basketId: string;
}

export const ComplianceReport: React.FC<ComplianceReportProps> = ({ basketId }) => {
  const [generating, setGenerating] = useState(false);

  // Mock data - seria carregado do banco de dados
  const complianceData: ComplianceItem[] = [
    {
      id: '1',
      requirement: '2.12 - Tipos de cálculo (média, mediana, menor preço)',
      status: 'compliant',
      description: 'Sistema implementa os 3 tipos de cálculo obrigatórios',
      evidence: ['basket_calculation_types', 'price_calculation_functions']
    },
    {
      id: '2',
      requirement: '2.14 - Apresentação de preços durante formação da cesta',
      status: 'compliant',
      description: 'Sistema apresenta menor, maior, média e mediana automaticamente',
      evidence: ['price_statistics_display', 'regional_price_sources']
    },
    {
      id: '3',
      requirement: '2.29 - Integração com portais obrigatórios',
      status: 'partial',
      description: 'Integração implementada para alguns portais, outras em desenvolvimento',
      evidence: ['painel_precos_integration', 'pncp_integration']
    },
    {
      id: '4',
      requirement: '2.31 - Base de dados CMED atualizada',
      status: 'compliant',
      description: 'Tabela CMED implementada com consulta por múltiplos critérios',
      evidence: ['cmed_table_structure', 'cmed_search_functionality']
    },
    {
      id: '5',
      requirement: '2.41 - Média ponderada BPS',
      status: 'partial',
      description: 'Estrutura criada, integração com API em desenvolvimento',
      evidence: ['bps_integration_structure']
    },
    {
      id: '6',
      requirement: '2.45 - Análise crítica de preços',
      status: 'compliant',
      description: 'Ferramenta completa de análise com exclusão justificada',
      evidence: ['price_analysis_panel', 'deviation_detection']
    }
  ];

  const compliance = {
    compliant: complianceData.filter(item => item.status === 'compliant').length,
    partial: complianceData.filter(item => item.status === 'partial').length,
    non_compliant: complianceData.filter(item => item.status === 'non_compliant').length,
    total: complianceData.length
  };

  const compliancePercentage = Math.round(
    ((compliance.compliant + compliance.partial * 0.5) / compliance.total) * 100
  );

  const generateReport = async () => {
    setGenerating(true);
    // Simular geração de relatório
    setTimeout(() => {
      setGenerating(false);
      // Aqui seria feito o download do PDF
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'non_compliant':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      compliant: 'default',
      partial: 'secondary',
      non_compliant: 'destructive'
    } as const;

    const labels = {
      compliant: 'Conforme',
      partial: 'Parcial',
      non_compliant: 'Não Conforme'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Conformidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Relatório de Conformidade com o Edital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{compliance.compliant}</div>
              <div className="text-sm text-muted-foreground">Conformes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{compliance.partial}</div>
              <div className="text-sm text-muted-foreground">Parciais</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{compliance.non_compliant}</div>
              <div className="text-sm text-muted-foreground">Não Conformes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{compliancePercentage}%</div>
              <div className="text-sm text-muted-foreground">Conformidade Geral</div>
            </div>
          </div>

          <Progress value={compliancePercentage} className="h-3" />

          <div className="flex justify-end">
            <Button onClick={generateReport} disabled={generating}>
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Gerando...' : 'Gerar Relatório PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes de Conformidade */}
      <Tabs defaultValue="requirements" className="w-full">
        <TabsList>
          <TabsTrigger value="requirements">Requisitos</TabsTrigger>
          <TabsTrigger value="evidence">Evidências</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          {complianceData.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(item.status)}
                      <h4 className="font-semibold">{item.requirement}</h4>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evidências Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold mb-2">Estrutura de Banco de Dados</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Tabelas específicas para análise de preços</li>
                    <li>• Integração com tabela CMED da ANVISA</li>
                    <li>• Sistema de filtros regionais</li>
                    <li>• Documentos comprobatórios anexados</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">Funcionalidades Implementadas</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Análise crítica automática de preços</li>
                    <li>• Cálculos de média, mediana e menor preço</li>
                    <li>• Sistema de cotação eletrônica</li>
                    <li>• Relatórios de conformidade</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações para Melhoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h5 className="font-semibold">Integrações Pendentes</h5>
                  <p className="text-sm text-muted-foreground">
                    Completar integração com todos os portais obrigatórios: 
                    TCE/PR, SINAPI, CONAB, CEASA-ES, RADAR/MT
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h5 className="font-semibold">API BPS</h5>
                  <p className="text-sm text-muted-foreground">
                    Finalizar integração com a API do Banco de Preços em Saúde 
                    para obtenção automática da média ponderada
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h5 className="font-semibold">Documentação</h5>
                  <p className="text-sm text-muted-foreground">
                    Manter documentação técnica atualizada e manual do usuário 
                    detalhado para todas as funcionalidades
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};