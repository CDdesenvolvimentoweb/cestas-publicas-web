import { useState, useEffect } from "react";
import { Search, Clock, CheckCircle, XCircle, Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

interface ProductRequest {
  id: string;
  product_name: string;
  product_code?: string;
  anvisa_code?: string;
  description?: string;
  specification?: string;
  justification: string;
  status: string;
  admin_response?: string;
  created_at: string;
  reviewed_at?: string;
  requester_id: string;
  management_unit_id: string;
  category_id?: string;
  measurement_unit_id?: string;
  requester: {
    full_name: string;
  };
  management_units: {
    name: string;
  };
  product_categories?: {
    name: string;
  };
  measurement_units?: {
    name: string;
    symbol: string;
  };
}

export function ProductRequestsList() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Query simplificada para evitar problemas de relacionamento
      const { data, error } = await supabase
        .from("product_requests")
        .select(`
          *,
          requester:profiles(full_name),
          management_units(name),
          product_categories(name),
          measurement_units(name, symbol)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Requests data:", data);
      setRequests(data as any || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading(true);
      const { data, error } = await supabase.rpc('approve_product_request', {
        request_id: requestId,
        admin_response_param: adminResponse || null
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação aprovada e produto criado com sucesso",
      });

      fetchRequests();
      setSelectedRequest(null);
      setAdminResponse("");
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar solicitação",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!adminResponse.trim()) {
      toast({
        title: "Erro",
        description: "Motivo da rejeição é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase.rpc('reject_product_request', {
        request_id: requestId,
        admin_response_param: adminResponse
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação rejeitada com sucesso",
      });

      fetchRequests();
      setSelectedRequest(null);
      setAdminResponse("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar solicitação",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge variant="default" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="secondary" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter((request) =>
    request.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.management_units?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando solicitações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar solicitações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">{filteredRequests.length} solicitações</Badge>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma solicitação encontrada</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "Tente ajustar os termos de busca" : "Não há solicitações de produtos no momento"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{request.product_name}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {request.product_code && (
                        <Badge variant="outline">Código: {request.product_code}</Badge>
                      )}
                      {request.anvisa_code && (
                        <Badge variant="secondary">ANVISA: {request.anvisa_code}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(request.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Solicitado por:</p>
                    <p className="font-medium">{request.requester?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unidade:</p>
                    <p className="font-medium">{request.management_units?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data:</p>
                    <p className="font-medium">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {request.product_categories && (
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria:</p>
                      <p className="font-medium">{request.product_categories.name}</p>
                    </div>
                  )}
                </div>
                
                {request.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Descrição:</p>
                    <p className="text-sm line-clamp-2">{request.description}</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Justificativa:</p>
                  <p className="text-sm line-clamp-2">{request.justification}</p>
                </div>

                {request.admin_response && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Resposta do Administrador:</p>
                    <p className="text-sm">{request.admin_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRequest && (
        <Dialog open onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedRequest.product_name}</h3>
                <div className="flex gap-2 mt-2">
                  {selectedRequest.product_code && (
                    <Badge variant="outline">Código: {selectedRequest.product_code}</Badge>
                  )}
                  {selectedRequest.anvisa_code && (
                    <Badge variant="secondary">ANVISA: {selectedRequest.anvisa_code}</Badge>
                  )}
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Solicitado por:</p>
                  <p className="font-medium">{selectedRequest.requester?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidade:</p>
                  <p className="font-medium">{selectedRequest.management_units?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data:</p>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Revisado em:</p>
                    <p className="font-medium">{new Date(selectedRequest.reviewed_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>

              {selectedRequest.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição:</p>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.specification && (
                <div>
                  <p className="text-sm text-muted-foreground">Especificação:</p>
                  <p className="text-sm">{selectedRequest.specification}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Justificativa:</p>
                <p className="text-sm">{selectedRequest.justification}</p>
              </div>

              {selectedRequest.admin_response && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Resposta do Administrador:</p>
                  <p className="text-sm">{selectedRequest.admin_response}</p>
                </div>
              )}

              {isAdmin && selectedRequest.status === 'pendente' && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="text-sm font-medium">Resposta do Administrador:</label>
                    <Textarea
                      placeholder="Comentários sobre a decisão (opcional para aprovação, obrigatório para rejeição)"
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}