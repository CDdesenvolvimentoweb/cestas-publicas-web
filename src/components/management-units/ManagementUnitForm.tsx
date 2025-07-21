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
  cnpj: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  city_id: z.string().min(1, 'Cidade é obrigatória'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface State {
  id: string;
  name: string;
  code: string;
}

interface City {
  id: string;
  name: string;
  state_id: string;
}

interface ManagementUnitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit?: any;
}

export const ManagementUnitForm = ({
  isOpen,
  onClose,
  onSuccess,
  unit,
}: ManagementUnitFormProps) => {
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      address: '',
      phone: '',
      email: '',
      city_id: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchStates();
      if (unit) {
        form.reset({
          name: unit.name || '',
          cnpj: unit.cnpj || '',
          address: unit.address || '',
          phone: unit.phone || '',
          email: unit.email || '',
          city_id: unit.city_id || '',
          is_active: unit.is_active ?? true,
        });
        // Se está editando, buscar o estado da cidade atual
        if (unit.city_id) {
          fetchStateOfCity(unit.city_id);
        }
      } else {
        form.reset({
          name: '',
          cnpj: '',
          address: '',
          phone: '',
          email: '',
          city_id: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, unit, form]);

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar estados",
        description: error.message,
      });
    }
  };

  const fetchStateOfCity = async (cityId: string) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('state_id')
        .eq('id', cityId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedState(data.state_id);
        fetchCitiesByState(data.state_id);
      }
    } catch (error: any) {
      console.error('Erro ao buscar estado da cidade:', error);
    }
  };

  const fetchCitiesByState = async (stateId: string) => {
    try {
      console.log('Buscando cidades do estado:', stateId);
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, state_id')
        .eq('state_id', stateId)
        .order('name');

      console.log('Resultado da busca de cidades:', { data, error });
      if (error) throw error;
      setCities(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar cidades:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar cidades",
        description: error.message,
      });
    }
  };

  const handleStateChange = (stateId: string) => {
    setSelectedState(stateId);
    form.setValue('city_id', '');
    setCities([]);
    if (stateId) {
      fetchCitiesByState(stateId);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Keep required fields as-is, only convert optional fields to null
      const cleanData = {
        name: data.name, // required
        city_id: data.city_id, // required
        is_active: data.is_active, // required with default
        cnpj: data.cnpj || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
      };

      if (unit) {
        const { error } = await supabase
          .from('management_units')
          .update(cleanData)
          .eq('id', unit.id);

        if (error) throw error;

        toast({
          title: "Unidade gestora atualizada",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('management_units')
          .insert(cleanData);

        if (error) throw error;

        toast({
          title: "Unidade gestora criada",
          description: "A unidade gestora foi criada com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: unit ? "Erro ao atualizar" : "Erro ao criar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {unit ? 'Editar' : 'Nova'} Unidade Gestora
          </DialogTitle>
          <DialogDescription>
            {unit 
              ? 'Atualize as informações da unidade gestora.'
              : 'Preencha os dados para criar uma nova unidade gestora.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome da Unidade *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Secretaria Municipal de Saúde" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contato@prefeitura.gov.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormLabel>Localização *</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormField
                    control={form.control}
                    name="city_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedState}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a cidade" />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((city) => (
                                <SelectItem key={city.id} value={city.id}>
                                  {city.name}
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
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Endereço completo da unidade gestora"
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
                      <FormLabel>Unidade Ativa</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Unidades inativas não podem criar cestas de preços
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
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : (unit ? 'Atualizar' : 'Criar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};