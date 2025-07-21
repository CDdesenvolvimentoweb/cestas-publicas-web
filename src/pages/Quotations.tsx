import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Send, Eye, Download, Mail, Clock, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { QuotationComparison } from "@/components/quotations/QuotationComparison";

export const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [baskets, setBaskets] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch quotations
      const { data: quotationsData } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          basket:price_baskets(name, reference_date),
          supplier:suppliers(company_name, email, trade_name)
        `)
        .order('created_at', { ascending: false });

      // Fetch baskets
      const { data: basketsData } = await supabase
        .from('price_baskets')
        .select('*')
        .eq('is_finalized', true)
        .order('reference_date', { ascending: false });

      // Fetch suppliers
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('company_name');

      setQuotations(quotationsData || []);
      setBaskets(basketsData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar cotações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'vencida': return 'bg-blue-100 text-blue-800';
      case 'respondida': return 'bg-green-100 text-green-800';
      case 'vencida': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pendente': return <Clock className="h-3 w-3" />;
      case 'vencida': return <Mail className="h-3 w-3" />;
      case 'respondida': return <Check className="h-3 w-3" />;
      case 'vencida': return <X className="h-3 w-3" />;
      default: return null;
    }
  };

  const sendQuotation = async (quotationId) => {
    try {
      // Generate token for the quotation
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('create_quote_token', { quote_uuid: quotationId });

      if (tokenError) throw tokenError;

      // Get quotation details for email
      const { data: quotation } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          basket:price_baskets(name),
          supplier:suppliers(company_name, email)
        `)
        .eq('id', quotationId)
        .single();

      if (!quotation) throw new Error('Cotação não encontrada');

      // Call edge function to send email
      const response = await fetch('/functions/v1/send-quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcnRwc3F2Y2p2bWJobnRub3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTE2OTksImV4cCI6MjA2ODY4NzY5OX0.HK-GsVokxMKd5osHeCa-22l3Ot7P3rP7KZzfcRSQHEI`,
        },
        body: JSON.stringify({
          quotationId,
          supplierEmail: quotation.supplier.email,
          supplierName: quotation.supplier.company_name,
          basketName: quotation.basket.name,
          dueDate: quotation.due_date,
          token: tokenData,
        }),
      });

      if (!response.ok) throw new Error('Erro ao enviar e-mail');

      // Update quotation status
      const { error } = await supabase
        .from('supplier_quotes')
        .update({ 
          status: 'pendente' as const,
          sent_at: new Date().toISOString(),
          access_token: tokenData
        })
        .eq('id', quotationId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cotação enviada com sucesso",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error sending quotation:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar cotação",
        variant: "destructive",
      });
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = 
      quotation.basket?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.supplier?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quotation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe as cotações enviadas aos fornecedores
          </p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Nova Cotação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Cotação</DialogTitle>
            </DialogHeader>
            <QuotationForm 
              baskets={baskets}
              suppliers={suppliers}
              onSuccess={() => {
                setShowCreateForm(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cesta ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pendente">Enviada</SelectItem>
                <SelectItem value="respondida">Respondida</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cesta</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quotation.basket?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {quotation.basket?.reference_date && 
                          format(new Date(quotation.basket.reference_date), "dd/MM/yyyy", { locale: ptBR })
                        }
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quotation.supplier?.company_name}</div>
                      <div className="text-sm text-muted-foreground">{quotation.supplier?.trade_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(quotation.status)}>
                      {getStatusIcon(quotation.status)}
                      <span className="ml-1 capitalize">{quotation.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {quotation.sent_at 
                      ? format(new Date(quotation.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {quotation.due_date 
                      ? format(new Date(quotation.due_date), "dd/MM/yyyy", { locale: ptBR })
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {quotation.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendQuotation(quotation.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedQuotation(quotation)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {quotation.status === 'respondida' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowComparison(true)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Comparação de Cotações</DialogTitle>
          </DialogHeader>
          <QuotationComparison 
            basketId={selectedQuotation?.basket_id}
            onClose={() => setShowComparison(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};