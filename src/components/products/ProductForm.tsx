import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  specification: z.string().optional(),
  anvisa_code: z.string().optional(),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  measurement_unit_id: z.string().min(1, 'Unidade de medida é obrigatória'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  code?: string;
  parent_category?: {
    name: string;
  };
}

interface MeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
}

export const ProductForm = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      specification: '',
      anvisa_code: '',
      category_id: '',
      measurement_unit_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchMeasurementUnits();
      if (product) {
        form.reset({
          name: product.name || '',
          code: product.code || '',
          description: product.description || '',
          specification: product.specification || '',
          anvisa_code: product.anvisa_code || '',
          category_id: product.category_id || '',
          measurement_unit_id: product.measurement_unit_id || '',
          is_active: product.is_active ?? true,
        });
      } else {
        form.reset({
          name: '',
          code: '',
          description: '',
          specification: '',
          anvisa_code: '',
          category_id: '',
          measurement_unit_id: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, product, form]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          id,
          name,
          code,
          parent_category:parent_id (
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias",
        description: error.message,
      });
    }
  };

  const fetchMeasurementUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('measurement_units')
        .select('id, name, abbreviation')
        .order('name');

      if (error) throw error;
      setMeasurementUnits(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar unidades de medida",
        description: error.message,
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Convert empty strings to null for optional fields
      const cleanData = {
        name: data.name,
        category_id: data.category_id,
        measurement_unit_id: data.measurement_unit_id,
        is_active: data.is_active,
        code: data.code || null,
        description: data.description || null,
        specification: data.specification || null,
        anvisa_code: data.anvisa_code || null,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(cleanData)
          .eq('id', product.id);

        if (error) throw error;

        toast({
          title: "Produto atualizado",
          description: "O produto foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(cleanData);

        if (error) throw error;

        toast({
          title: "Produto criado",
          description: "O produto foi criado com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: product ? "Erro ao atualizar" : "Erro ao criar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryDisplayName = (category: Category) => {
    if (category.parent_category) {
      return `${category.parent_category.name} → ${category.name}`;
    }
    return category.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar' : 'Novo'} Produto
          </DialogTitle>
          <DialogDescription>
            {product 
              ? 'Atualize as informações do produto.'
              : 'Preencha os dados para criar um novo produto.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Paracetamol 500mg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: MED001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anvisa_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ANVISA</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {getCategoryDisplayName(category)}
                              {category.code && ` (${category.code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurement_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {measurementUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name} ({unit.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição geral do produto"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especificação Técnica</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Especificações técnicas detalhadas do produto"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Produto Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Produtos inativos não aparecerão na seleção para cestas
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : (product ? 'Atualizar' : 'Criar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};