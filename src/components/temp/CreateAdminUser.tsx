import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CreateAdminUser = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAdminUser = async () => {
    setLoading(true);
    try {
      console.log('🔧 Criando usuário admin...');
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: 'admin@prefeituraes.com',
          password: 'P@ssw0rd2025',
          full_name: 'Administrador do Sistema',
          cpf: '00000000000',
          phone: '(27) 99999-9999'
        }
      });

      console.log('📝 Resposta da Edge Function:', data);

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "✅ Usuário admin criado!",
          description: `Admin criado com sucesso: ${data.user.email}`,
        });
        console.log('✅ Admin criado:', data.user);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('❌ Erro ao criar admin:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário admin",
        description: error.message || 'Erro interno do sistema',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Criar Usuário Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p><strong>Email:</strong> admin@prefeituraes.com</p>
          <p><strong>Senha:</strong> P@ssw0rd2025</p>
          <p><strong>Role:</strong> admin</p>
        </div>
        
        <Button 
          onClick={createAdminUser} 
          disabled={loading} 
          className="w-full"
        >
          {loading ? 'Criando...' : 'Criar Usuário Admin'}
        </Button>
      </CardContent>
    </Card>
  );
};