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
  parent_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface ParentCategory {
  id: string;
  name: string;
}

interface ProductCategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: any;
}

export const ProductCategoryForm = ({
  isOpen,
  onClose,
  onSuccess,
  category,
}: ProductCategoryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parent_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchParentCategories();
      if (category) {
        form.reset({
          name: category.name || '',
          code: category.code || '',
          description: category.description || '',
          parent_id: category.parent_id || '',
          is_active: category.is_active ?? true,
        });
      } else {
        form.reset({
          name: '',
          code: '',
          description: '',
          parent_id: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, category, form]);

  const fetchParentCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .is('parent_id', null) // Only main categories can be parents
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setParentCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar categorias pai",
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
        is_active: data.is_active,
        code: data.code || null,
        description: data.description || null,
        parent_id: data.parent_id || null,
      };

      if (category) {
        // Don't allow a category to be its own parent or create circular references
        if (cleanData.parent_id === category.id) {
          toast({
            variant: "destructive",
            title: "Erro de validação",
            description: "Uma categoria não pode ser pai de si mesma.",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('product_categories')
          .update(cleanData)
          .eq('id', category.id);

        if (error) throw error;

        toast({
          title: "Categoria atualizada",
          description: "A categoria foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(cleanData);

        if (error) throw error;

        toast({
          title: "Categoria criada",
          description: "A categoria foi criada com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: category ? "Erro ao atualizar" : "Erro ao criar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar' : 'Nova'} Categoria de Produto
          </DialogTitle>
          <DialogDescription>
            {category 
              ? 'Atualize as informações da categoria.'
              : 'Preencha os dados para criar uma nova categoria de produtos.'
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
                  <FormLabel>Nome da Categoria *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Medicamentos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: MED" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria Pai</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar categoria pai" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
                          {parentCategories
                            .filter(parent => parent.id !== category?.id) // Don't allow self-reference
                            .map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.name}
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
                      placeholder="Descrição da categoria de produtos"
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Categoria Ativa</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Categorias inativas não aparecerão na seleção de produtos
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
                {loading ? 'Salvando...' : (category ? 'Atualizar' : 'Criar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};