import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Tag, Ruler, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProductForm } from '@/components/products/ProductForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductRequestForm } from '@/components/products/ProductRequestForm';
import { ProductRequestsList } from '@/components/products/ProductRequestsList';

interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  specification?: string;
  anvisa_code?: string;
  is_active: boolean;
  category_id: string;
  measurement_unit_id: string;
  product_categories: {
    name: string;
    code?: string;
  };
  measurement_units: {
    name: string;
    abbreviation: string;
  };
}

interface DuplicateProduct {
  id: string;
  name: string;
  code?: string;
  anvisa_code?: string;
  match_type: 'name' | 'code' | 'anvisa_code' | 'partial';
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateProduct[]>([]);
  const [activeTab, setActiveTab] = useState("products");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          code,
          description,
          specification,
          anvisa_code,
          is_active,
          category_id,
          measurement_unit_id,
          product_categories (
            name,
            code
          ),
          measurement_units (
            name,
            abbreviation
          )
        `)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkForDuplicates = async (name: string, code?: string, anvisaCode?: string, excludeId?: string) => {
    try {
      const { data, error } = await supabase.rpc('check_product_duplication', {
        product_name_param: name,
        product_code_param: code || null,
        anvisa_code_param: anvisaCode || null,
        exclude_id: excludeId || null
      });

      if (error) throw error;
      
      const duplicatesList = Array.isArray(data) ? data.filter(Boolean) : [];
      setDuplicates(duplicatesList as unknown as DuplicateProduct[]);
      
      return duplicatesList.length > 0;
    } catch (error) {
      console.error("Error checking duplicates:", error);
      return false;
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setDuplicates([]);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDuplicates([]);
    setIsFormOpen(true);
  };

  const handleRequestProduct = () => {
    setShowRequestForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if product is used in baskets
      const { count: basketItemsCount } = await supabase
        .from('basket_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id);

      if ((basketItemsCount || 0) > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Este produto está sendo usado em cestas de preços.",
        });
        setDeleteConfirm(null);
        return;
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(product => product.id !== id));
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: error.message,
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setShowRequestForm(false);
    setEditingProduct(null);
    setDuplicates([]);
    fetchProducts();
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_categories.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.anvisa_code?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Produtos</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Catálogo de Produtos</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="requests">Solicitações de Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">

          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRequestProduct} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Solicitar Produto
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          </div>

          {duplicates.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Produtos similares encontrados:</p>
                  {duplicates.map((dup) => (
                    <div key={dup.id} className="text-sm">
                      <strong>{dup.name}</strong>
                      {dup.code && <span> - Código: {dup.code}</span>}
                      {dup.anvisa_code && <span> - ANVISA: {dup.anvisa_code}</span>}
                      <Badge variant="outline" className="ml-2">
                        {dup.match_type === 'name' && 'Nome igual'}
                        {dup.match_type === 'code' && 'Código igual'}
                        {dup.match_type === 'anvisa_code' && 'Código ANVISA igual'}
                        {dup.match_type === 'partial' && 'Nome similar'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? "Tente ajustar os termos de busca" : "Comece criando seu primeiro produto"}
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </CardContent>
            </Card>
          ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover-scale">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {product.code && (
                        <Badge variant="outline" className="text-xs">
                          {product.code}
                        </Badge>
                      )}
                      {product.anvisa_code && (
                        <Badge variant="secondary" className="text-xs">
                          ANVISA: {product.anvisa_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span>{product.product_categories.name}</span>
                      {product.product_categories.code && (
                        <Badge variant="outline" className="text-xs">
                          {product.product_categories.code}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <span>{product.measurement_units.name} ({product.measurement_units.abbreviation})</span>
                    </div>
                  </div>

                  {product.specification && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <strong>Especificação:</strong>
                      <p className="line-clamp-2">{product.specification}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="flex-1"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(product.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          <ProductRequestsList />
        </TabsContent>
      </Tabs>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
            setDuplicates([]);
          }}
          onSuccess={handleFormSuccess}
          onCheckDuplicates={checkForDuplicates}
          duplicates={duplicates}
        />
      )}

      {showRequestForm && (
        <ProductRequestForm
          onClose={() => setShowRequestForm(false)}
          onSuccess={handleFormSuccess}
          onCheckDuplicates={checkForDuplicates}
          duplicates={duplicates}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Desativar Produto"
        description="Tem certeza que deseja desativar este produto? Esta ação não pode ser desfeita."
      />
    </div>
  );
};