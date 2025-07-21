import { useState } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRight, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  reference_date: z.date({
    required_error: "Data de referência é obrigatória",
  }),
  calculation_type: z.enum(['media', 'mediana', 'menor_preco'], {
    required_error: "Tipo de cálculo é obrigatório",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface BasketWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BasketWizard = ({
  isOpen,
  onClose,
  onSuccess,
}: BasketWizardProps) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [createdBasketId, setCreatedBasketId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      reference_date: new Date(),
      calculation_type: 'media',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const cleanData = {
        name: data.name,
        description: data.description || null,
        reference_date: data.reference_date.toISOString().split('T')[0],
        calculation_type: data.calculation_type,
        is_finalized: false,
        management_unit_id: profile?.management_unit_id,
        created_by: profile?.id,
      };

      const { data: basket, error } = await supabase
        .from('price_baskets')
        .insert(cleanData)
        .select()
        .single();

      if (error) throw error;

      setCreatedBasketId(basket.id);
      setStep(2);

      toast({
        title: "Cesta criada",
        description: "Agora você pode adicionar produtos à cesta.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar cesta",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCreatedBasketId(null);
    form.reset();
    onClose();
  };

  const handleFinish = () => {
    onSuccess();
    handleClose();
  };

  const calculationTypes = [
    {
      value: 'media',
      label: 'Média Aritmética',
      description: 'Calcula a média dos preços coletados'
    },
    {
      value: 'mediana',
      label: 'Mediana',
      description: 'Utiliza o valor mediano dos preços'
    },
    {
      value: 'menor_preco',
      label: 'Menor Preço',
      description: 'Considera sempre o menor preço encontrado'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {step === 1 ? 'Nova Cesta de Preços' : 'Adicionar Produtos'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Defina as informações básicas da cesta de preços.'
              : 'Agora você pode adicionar produtos à sua cesta.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Cesta *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Cesta Básica - Janeiro 2024" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição opcional da cesta de preços"
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
                name="reference_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Referência *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calculation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cálculo *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de cálculo" />
                        </SelectTrigger>
                        <SelectContent>
                          {calculationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{type.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {type.description}
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

              <div className="flex justify-end space-x-4 pt-4">
                <Button variant="outline" onClick={handleClose} type="button">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : (
                    <>
                      Criar Cesta
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Cesta criada com sucesso!</h3>
              <p className="text-muted-foreground">
                Sua cesta foi criada e agora você pode adicionar produtos.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handleFinish}>
                Finalizar
              </Button>
              <Button onClick={handleFinish}>
                Ir para a Cesta
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};