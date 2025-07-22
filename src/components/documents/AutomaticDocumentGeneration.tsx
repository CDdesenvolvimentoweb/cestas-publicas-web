import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Upload,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Paperclip,
  Search,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface AutoDocument {
  id: string;
  document_type: 'PRICE_RESEARCH' | 'MARKET_ANALYSIS' | 'SUPPLIER_PROPOSAL' | 'TECHNICAL_SPECIFICATION' | 'COMPLIANCE_REPORT';
  title: string;
  description: string;
  content: any;
  status: 'GENERATING' | 'READY' | 'ERROR';
  created_at: string;
  generated_for: string; // Product or quotation ID
  file_url?: string;
  metadata: any;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: AutoDocument['document_type'];
  template_content: string;
  required_fields: string[];
  output_format: 'PDF' | 'DOCX' | 'HTML';
}

export default function AutomaticDocumentGeneration() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoDocuments, setAutoDocuments] = useState<AutoDocument[]>([]);

  // Templates disponíveis
  const documentTemplates: DocumentTemplate[] = [
    {
      id: 'price-research',
      name: 'Pesquisa de Preços',
      description: 'Relatório completo de pesquisa de preços de mercado',
      type: 'PRICE_RESEARCH',
      template_content: 'Template para pesquisa de preços com análise comparativa',
      required_fields: ['product_name', 'date_range', 'sources'],
      output_format: 'PDF'
    },
    {
      id: 'market-analysis',
      name: 'Análise de Mercado',
      description: 'Análise detalhada do comportamento do mercado',
      type: 'MARKET_ANALYSIS',
      template_content: 'Template para análise de mercado com tendências',
      required_fields: ['product_category', 'period', 'suppliers'],
      output_format: 'PDF'
    },
    {
      id: 'supplier-proposal',
      name: 'Proposta de Fornecedor',
      description: 'Documento de proposta comercial para fornecedores',
      type: 'SUPPLIER_PROPOSAL',
      template_content: 'Template para proposta comercial',
      required_fields: ['supplier_info', 'products', 'terms'],
      output_format: 'DOCX'
    },
    {
      id: 'technical-spec',
      name: 'Especificação Técnica',
      description: 'Documento de especificações técnicas de produtos',
      type: 'TECHNICAL_SPECIFICATION',
      template_content: 'Template para especificações técnicas',
      required_fields: ['product_details', 'standards', 'requirements'],
      output_format: 'PDF'
    },
    {
      id: 'compliance-report',
      name: 'Relatório de Conformidade',
      description: 'Relatório de conformidade com normas e regulamentações',
      type: 'COMPLIANCE_REPORT',
      template_content: 'Template para relatório de conformidade',
      required_fields: ['compliance_items', 'verification_date', 'responsible'],
      output_format: 'PDF'
    }
  ];

  // Buscar produtos disponíveis
  const { data: availableProducts } = useQuery({
    queryKey: ['products-for-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar documentos gerados
  const { data: generatedDocuments } = useQuery({
    queryKey: ['generated-documents'],
    queryFn: async () => {
      // Simular documentos gerados (em produção, isso viria de uma tabela real)
      const documents: AutoDocument[] = [
        {
          id: '1',
          document_type: 'PRICE_RESEARCH',
          title: 'Pesquisa de Preços - Arroz Tipo 1',
          description: 'Relatório completo de pesquisa de preços para arroz tipo 1',
          content: {},
          status: 'READY',
          created_at: new Date().toISOString(),
          generated_for: 'product-1',
          file_url: '/documents/price-research-arroz.pdf',
          metadata: {
            sources: ['PNCP', 'BPS', 'Painel de Preços'],
            date_range: '2025-01-01 to 2025-01-22',
            total_prices: 45
          }
        },
        {
          id: '2',
          document_type: 'MARKET_ANALYSIS',
          title: 'Análise de Mercado - Produtos Alimentícios',
          description: 'Análise detalhada do mercado de produtos alimentícios básicos',
          content: {},
          status: 'READY',
          created_at: new Date().toISOString(),
          generated_for: 'category-1',
          file_url: '/documents/market-analysis-food.pdf',
          metadata: {
            category: 'Alimentícios',
            suppliers: 15,
            price_variation: '12.5%'
          }
        },
        {
          id: '3',
          document_type: 'COMPLIANCE_REPORT',
          title: 'Relatório de Conformidade - Q1 2025',
          description: 'Relatório de conformidade regulatória do primeiro trimestre',
          content: {},
          status: 'GENERATING',
          created_at: new Date().toISOString(),
          generated_for: 'quarterly-report',
          metadata: {
            compliance_score: '95%',
            items_checked: 120,
            non_conformities: 6
          }
        }
      ];
      
      return documents;
    }
  });

  // Função para gerar documento automático
  const generateDocument = async () => {
    if (!selectedTemplate || !documentTitle) {
      toast.error('Selecione um template e informe o título do documento');
      return;
    }

    setIsGenerating(true);

    try {
      const template = documentTemplates.find(t => t.id === selectedTemplate);
      if (!template) throw new Error('Template não encontrado');

      // Simular geração de documento
      const newDocument: AutoDocument = {
        id: `doc-${Date.now()}`,
        document_type: template.type,
        title: documentTitle,
        description: documentDescription || `Documento gerado automaticamente: ${template.name}`,
        content: {
          template_id: template.id,
          generated_at: new Date().toISOString(),
          product_id: selectedProduct,
          // Dados simulados baseados no template
          data: template.type === 'PRICE_RESEARCH' ? {
            product_name: availableProducts?.find(p => p.id === selectedProduct)?.name || 'Produto Selecionado',
            total_sources: 4,
            price_range: 'R$ 45,20 - R$ 89,50',
            average_price: 'R$ 67,35',
            recommended_price: 'R$ 65,00'
          } : template.type === 'MARKET_ANALYSIS' ? {
            market_trend: 'Estável com tendência de alta',
            competition_level: 'Moderado',
            seasonal_factors: 'Baixa sazonalidade',
            risk_assessment: 'Risco baixo a moderado'
          } : {}
        },
        status: 'GENERATING',
        created_at: new Date().toISOString(),
        generated_for: selectedProduct || 'manual-generation',
        metadata: {
          template_used: template.name,
          output_format: template.output_format,
          required_fields_filled: template.required_fields.length
        }
      };

      // Simular tempo de geração
      setTimeout(() => {
        newDocument.status = 'READY';
        newDocument.file_url = `/documents/${template.id}-${Date.now()}.${template.output_format.toLowerCase()}`;
        
        setAutoDocuments(prev => [newDocument, ...prev]);
        toast.success('Documento gerado com sucesso!');
        setIsGenerating(false);
        
        // Limpar formulário
        setDocumentTitle('');
        setDocumentDescription('');
        setSelectedProduct('');
      }, 3000);
      
      // Adicionar documento com status "GENERATING"
      setAutoDocuments(prev => [newDocument, ...prev]);
      
      toast.info('Gerando documento... Isso pode levar alguns minutos.');
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento automático');
      setIsGenerating(false);
    }
  };

  const downloadDocument = (doc: AutoDocument) => {
    if (doc.status !== 'READY' || !doc.file_url) {
      toast.error('Documento ainda não está pronto para download');
      return;
    }

    // Simular download
    toast.success(`Download iniciado: ${doc.title}`);
  };

  const getStatusColor = (status: AutoDocument['status']) => {
    switch (status) {
      case 'READY': return 'text-green-600 bg-green-50';
      case 'GENERATING': return 'text-yellow-600 bg-yellow-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: AutoDocument['status']) => {
    switch (status) {
      case 'READY': return <CheckCircle className="w-4 h-4" />;
      case 'GENERATING': return <Clock className="w-4 h-4 animate-spin" />;
      case 'ERROR': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getDocumentTypeLabel = (type: AutoDocument['document_type']) => {
    const labels = {
      'PRICE_RESEARCH': 'Pesquisa de Preços',
      'MARKET_ANALYSIS': 'Análise de Mercado',
      'SUPPLIER_PROPOSAL': 'Proposta Comercial',
      'TECHNICAL_SPECIFICATION': 'Especificação Técnica',
      'COMPLIANCE_REPORT': 'Relatório de Conformidade'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos Comprobatórios Automáticos</h2>
          <p className="text-muted-foreground">
            Geração automática de documentos oficiais e comprobatórios
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <FileText className="w-4 h-4 mr-2" />
            Gerar Documento
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Eye className="w-4 h-4 mr-2" />
            Documentos Gerados
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Paperclip className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geração de Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {documentTemplates.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto (Opcional)</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum produto específico</SelectItem>
                      {availableProducts?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Título do Documento</label>
                  <Input
                    placeholder="Ex: Pesquisa de Preços - Janeiro 2025"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Período de Referência</label>
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (Opcional)</label>
                <Textarea
                  placeholder="Descrição adicional para o documento..."
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={generateDocument}
                  disabled={isGenerating || !selectedTemplate || !documentTitle}
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Gerar Documento
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos Gerados
                {(generatedDocuments?.length || 0) + autoDocuments.length > 0 && (
                  <Badge variant="secondary">
                    {(generatedDocuments?.length || 0) + autoDocuments.length} documentos
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {[...autoDocuments, ...(generatedDocuments || [])].length > 0 ? (
                <div className="space-y-4">
                  {[...autoDocuments, ...(generatedDocuments || [])].map((doc) => (
                    <Card key={doc.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{doc.title}</h4>
                              <Badge className={getStatusColor(doc.status)}>
                                {getStatusIcon(doc.status)}
                                <span className="ml-1">{doc.status}</span>
                              </Badge>
                              <Badge variant="outline">
                                {getDocumentTypeLabel(doc.document_type)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {doc.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                              </div>
                              
                              {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {Object.keys(doc.metadata).length} metadados
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={doc.status !== 'READY'}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button 
                              size="sm"
                              onClick={() => downloadDocument(doc)}
                              disabled={doc.status !== 'READY'}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum documento gerado ainda</p>
                  <p className="text-sm">Use a aba "Gerar Documento" para criar documentos automáticos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTemplates.map((template) => (
                  <Card key={template.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="outline">{template.output_format}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Campos Obrigatórios:</div>
                          <div className="flex flex-wrap gap-1">
                            {template.required_fields.map((field, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          Usar Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
