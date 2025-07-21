import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'servidor', 'fornecedor'], {
    required_error: 'Selecione um papel',
  }),
  management_unit_id: z.string().uuid('Selecione uma unidade gestora').optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSuccess?: () => void;
}

interface ManagementUnit {
  id: string;
  name: string;
}

export const UserForm = ({ onSuccess }: UserFormProps) => {
  const [loading, setLoading] = useState(false);
  const [managementUnits, setManagementUnits] = useState<ManagementUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      full_name: '',
      cpf: '',
      phone: '',
      role: 'servidor',
    },
  });

  useEffect(() => {
    fetchManagementUnits();
  }, []);

  const fetchManagementUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('management_units')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setManagementUnits(data || []);
    } catch (error) {
      console.error('Erro ao carregar unidades gestoras:', error);
      toast.error('Erro ao carregar unidades gestoras');
    } finally {
      setLoadingUnits(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      // Para fornecedores, não é obrigatório ter unidade gestora
      if (data.role !== 'fornecedor' && !data.management_unit_id) {
        toast.error('Unidade gestora é obrigatória para este tipo de usuário');
        return;
      }

      // Criar o usuário no Supabase Auth primeiro
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: 'TempPassword123!', // Senha temporária
        email_confirm: true,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário no sistema de autenticação');
      }

      // Criar o perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: data.full_name,
          cpf: data.cpf || null,
          phone: data.phone || null,
          role: data.role,
          management_unit_id: data.management_unit_id || null,
          is_active: true,
        });

      if (profileError) throw profileError;

      toast.success('Usuário criado com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="usuario@exemplo.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome completo do usuário" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF (Opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="000.000.000-00" />
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
                <FormLabel>Telefone (Opcional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(00) 00000-0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Papel no Sistema</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="servidor">Servidor Público</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="management_unit_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Unidade Gestora
                  {form.watch('role') === 'fornecedor' && ' (Opcional)'}
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingUnits ? "Carregando..." : "Selecione a unidade"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {managementUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Usuário
          </Button>
        </div>
      </form>
    </Form>
  );
};