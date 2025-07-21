import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProductCategoryForm } from '@/components/products/ProductCategoryForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ProductCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  parent_id?: string;
  parent_category?: {
    name: string;
  };
  subcategories_count?: number;
}

export const ProductCategories = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          id,
          name,
          code,
          description,
          is_active,
          parent_id,
          parent_category:parent_id (
            name
          )
        `)
        .order('name');

      if (error) throw error;

      // Count subcategories for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('product_categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', category.id);
          
          return {
            ...category,
            subcategories_count: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if category has subcategories or products
      const { count: subcategoriesCount } = await supabase
        .from('product_categories')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', id);

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if ((subcategoriesCount || 0) > 0 || (productsCount || 0) > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Esta categoria possui subcategorias ou produtos vinculados.",
        });
        setDeleteConfirm(null);
        return;
      }

      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter(category => category.id !== id));
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir categoria",
        description: error.message,
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate main categories and subcategories
  const mainCategories = filteredCategories.filter(cat => !cat.parent_id);
  const subcategories = filteredCategories.filter(cat => cat.parent_id);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Categorias de Produtos</h1>
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
        <h1 className="text-2xl font-bold text-foreground">Categorias de Produtos</h1>
        <Button onClick={handleCreate} className="hover-scale">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">{filteredCategories.length} categorias</Badge>
      </div>

      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Tente ajustar os termos de busca" 
                  : "Comece criando uma nova categoria de produtos"}
              </p>
            </div>
            {!searchTerm && (
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Categoria
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Categories */}
          {mainCategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Categorias Principais
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mainCategories.map((category) => (
                  <Card key={category.id} className="hover-scale">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {category.code && (
                            <Badge variant="outline" className="text-xs">
                              {category.code}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {category.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <span>{category.subcategories_count} subcategorias</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          className="flex-1"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Subcategories */}
          {subcategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Subcategorias
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subcategories.map((category) => (
                  <Card key={category.id} className="hover-scale border-l-4 border-l-primary/30">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          {category.parent_category && (
                            <p className="text-sm text-muted-foreground">
                              ↳ {category.parent_category.name}
                            </p>
                          )}
                          {category.code && (
                            <Badge variant="outline" className="text-xs">
                              {category.code}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {category.description}
                        </p>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          className="flex-1"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ProductCategoryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        category={editingCategory}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Excluir Categoria"
        description="Esta ação não pode ser desfeita. Certifique-se de que não há subcategorias ou produtos vinculados."
      />
    </div>
  );
};