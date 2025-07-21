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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  product_id: z.string().min(1, 'Produto é obrigatório'),
  quantity: z.number().min(0.001, 'Quantidade deve ser maior que zero'),
  lot_number: z.number().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Product {
  id: string;
  name: string;
  code?: string;
  product_categories: {
    name: string;
  };
  measurement_units: {
    name: string;
    abbreviation: string;
  };
}

interface BasketItemFormProps {
  basketId: string;
  item?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BasketItemForm = ({
  basketId,
  item,
  isOpen,
  onClose,
  onSuccess,
}: BasketItemFormProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: '',
      quantity: 1,
      lot_number: undefined,
      observations: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (item) {
        form.reset({
          product_id: item.products.id,
          quantity: item.quantity,
          lot_number: item.lot_number || undefined,
          observations: item.observations || '',
        });
      } else {
        form.reset({
          product_id: '',
          quantity: 1,
          lot_number: undefined,
          observations: '',
        });
      }
    }
  }, [isOpen, item, form]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          code,
          product_categories (
            name
          ),
          measurement_units (
            name,
            abbreviation
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message,
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const cleanData = {
        basket_id: basketId,
        product_id: data.product_id,
        quantity: data.quantity,
        lot_number: data.lot_number || null,
        observations: data.observations || null,
      };

      if (item) {
        const { error } = await supabase
          .from('basket_items')
          .update(cleanData)
          .eq('id', item.id);

        if (error) throw error;

        toast({
          title: "Item atualizado",
          description: "O item foi atualizado com sucesso.",
        });
      } else {
        // Check if product already exists in basket
        const { data: existingItem, error: checkError } = await supabase
          .from('basket_items')
          .select('id')
          .eq('basket_id', basketId)
          .eq('product_id', data.product_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingItem) {
          toast({
            variant: "destructive",
            title: "Produto já existe",
            description: "Este produto já foi adicionado à cesta. Edite o item existente.",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('basket_items')
          .insert(cleanData);

        if (error) throw error;

        toast({
          title: "Item adicionado",
          description: "O item foi adicionado à cesta com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: item ? "Erro ao atualizar" : "Erro ao adicionar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === form.watch('product_id'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Editar' : 'Adicionar'} Item à Cesta
          </DialogTitle>
          <DialogDescription>
            {item 
              ? 'Atualize as informações do item.'
              : 'Selecione um produto e defina a quantidade.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!item} // Don't allow changing product when editing
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {product.name}
                                {product.code && ` (${product.code})`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {product.product_categories.name} • {product.measurement_units.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantidade *
                      {selectedProduct && (
                        <span className="text-muted-foreground ml-1">
                          ({selectedProduct.measurement_units.abbreviation})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Lote</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o item (marca, especificações, etc.)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : (item ? 'Atualizar' : 'Adicionar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};