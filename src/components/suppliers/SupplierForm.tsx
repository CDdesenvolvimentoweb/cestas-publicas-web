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
  company_name: z.string().min(1, 'Razão social é obrigatória'),
  trade_name: z.string().optional(),
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  city_id: z.string().optional(),
  municipal_registration: z.string().optional(),
  state_registration: z.string().optional(),
  zip_code: z.string().optional(),
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

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: any;
}

export const SupplierForm = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierFormProps) => {
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      trade_name: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      city_id: '',
      municipal_registration: '',
      state_registration: '',
      zip_code: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchStates();
      if (supplier) {
        form.reset({
          company_name: supplier.company_name || '',
          trade_name: supplier.trade_name || '',
          cnpj: supplier.cnpj || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          website: supplier.website || '',
          city_id: supplier.city_id || '',
          municipal_registration: supplier.municipal_registration || '',
          state_registration: supplier.state_registration || '',
          zip_code: supplier.zip_code || '',
          is_active: supplier.is_active ?? true,
        });
        if (supplier.city_id) {
          fetchStateOfCity(supplier.city_id);
        }
      } else {
        form.reset({
          company_name: '',
          trade_name: '',
          cnpj: '',
          email: '',
          phone: '',
          address: '',
          website: '',
          city_id: '',
          municipal_registration: '',
          state_registration: '',
          zip_code: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, supplier, form]);

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
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, state_id')
        .eq('state_id', stateId)
        .order('name');

      if (error) throw error;
      setCities(data || []);
    } catch (error: any) {
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
        company_name: data.company_name, // required
        cnpj: data.cnpj, // required
        email: data.email, // required
        is_active: data.is_active, // required with default
        trade_name: data.trade_name || null,
        phone: data.phone || null,
        address: data.address || null,
        website: data.website || null,
        city_id: data.city_id || null,
        municipal_registration: data.municipal_registration || null,
        state_registration: data.state_registration || null,
        zip_code: data.zip_code || null,
      };

      if (supplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(cleanData)
          .eq('id', supplier.id);

        if (error) throw error;

        toast({
          title: "Fornecedor atualizado",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(cleanData);

        if (error) throw error;

        toast({
          title: "Fornecedor cadastrado",
          description: "O fornecedor foi cadastrado com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: supplier ? "Erro ao atualizar" : "Erro ao cadastrar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar' : 'Novo'} Fornecedor
          </DialogTitle>
          <DialogDescription>
            {supplier 
              ? 'Atualize as informações do fornecedor.'
              : 'Preencha os dados para cadastrar um novo fornecedor.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Empresa ABC Ltda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trade_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: ABC Materiais" {...field} />
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
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="contato@empresa.com" {...field} />
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
                name="website"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Site</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipal_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Municipal</FormLabel>
                    <FormControl>
                      <Input placeholder="000000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state_registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input placeholder="000000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormLabel>Localização</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
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
                              <SelectValue placeholder="Cidade" />
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

                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="CEP" {...field} />
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
                        placeholder="Endereço completo da empresa"
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Fornecedor Ativo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Fornecedores inativos não podem receber cotações
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
                {loading ? 'Salvando...' : (supplier ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};