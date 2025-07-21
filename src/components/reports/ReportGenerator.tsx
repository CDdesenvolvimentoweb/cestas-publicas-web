import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Download, Clock, CheckCircle, 
  AlertCircle, Filter, Calendar, Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GeneratedReport {
  id: string;
  report_type: string;
  report_name: string;
  status: 'generating' | 'completed' | 'failed';
  file_url?: string;
  created_at: string;
  completed_at?: string;
}

interface ReportFilters {
  report_type: string;
  management_unit_id?: string;
  start_date?: string;
  end_date?: string;
  format: 'pdf' | 'excel' | 'csv';
}

export const ReportGenerator = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    report_type: '',
    format: 'pdf'
  });
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports((data || []) as GeneratedReport[]);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar relatórios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!filters.report_type) {
      toast({
        title: 'Atenção',
        description: 'Selecione o tipo de relatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      const { data, error } = await supabase.functions.invoke('report-generator', {
        body: {
          report_type: filters.report_type,
          parameters: {
            management_unit_id: filters.management_unit_id,
            start_date: filters.start_date,
            end_date: filters.end_date,
          },
          format: filters.format
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Relatório está sendo gerado. Você será notificado quando estiver pronto.',
      });

      // Atualizar lista de relatórios
      await fetchReports();

      // Limpar filtros
      setFilters({
        report_type: '',
        format: 'pdf'
      });

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao gerar relatório',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (report: GeneratedReport) => {
    if (!report.file_url) {
      toast({
        title: 'Erro',
        description: 'Arquivo não disponível',
        variant: 'destructive',
      });
      return;
    }

    // Simular download
    toast({
      title: 'Download',
      description: 'Iniciando download do relatório...',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating': return 'secondary';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'generating': return 'Gerando';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'basket_analysis': return 'Análise de Cesta';
      case 'supplier_performance': return 'Performance de Fornecedores';
      case 'price_trends': return 'Tendências de Preços';
      case 'quotation_summary': return 'Resumo de Cotações';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerador de Relatórios</h1>
        <p className="text-muted-foreground">
          Gere relatórios personalizados sobre cotações, fornecedores e tendências de preços
        </p>
      </div>

      {/* Formulário de Geração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Novo Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="report_type">Tipo de Relatório *</Label>
              <Select 
                value={filters.report_type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, report_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basket_analysis">Análise de Cesta</SelectItem>
                  <SelectItem value="supplier_performance">Performance de Fornecedores</SelectItem>
                  <SelectItem value="price_trends">Tendências de Preços</SelectItem>
                  <SelectItem value="quotation_summary">Resumo de Cotações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="format">Formato</Label>
              <Select 
                value={filters.format} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, format: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="end_date">Data Final</Label>
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={generateReport} 
              disabled={generating || !filters.report_type}
              className="min-w-32"
            >
              {generating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Relatórios Gerados</span>
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum relatório encontrado</p>
              <p className="text-sm">Gere seu primeiro relatório usando o formulário acima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(report.status)}
                    <div>
                      <h4 className="font-medium">{report.report_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {getReportTypeLabel(report.report_type)}
                        </Badge>
                        <Badge variant={getStatusColor(report.status) as any}>
                          {getStatusLabel(report.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Criado {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                        {report.completed_at && (
                          <> • Concluído {formatDistanceToNow(new Date(report.completed_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.status === 'generating' && (
                      <div className="flex items-center gap-2">
                        <Progress value={45} className="w-20" />
                        <span className="text-sm text-muted-foreground">45%</span>
                      </div>
                    )}
                    
                    {report.status === 'completed' && report.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}

                    {report.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateReport()}
                      >
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};