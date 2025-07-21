import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { signIn, signUp } from '@/lib/auth';
import { Loader2, Calculator } from 'lucide-react';

export const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message,
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao sistema de cestas de preços.",
      });
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;
    const cpf = formData.get('cpf') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as 'admin' | 'servidor' | 'fornecedor';

    const { error } = await signUp(email, password, {
      full_name,
      cpf: cpf || undefined,
      phone: phone || undefined,
      role,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message,
      });
    } else {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Sua conta foi criada. Você já pode fazer login.",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Calculator className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Sistema de Cestas de Preços</CardTitle>
          <CardDescription>
            Plataforma para formação de preços municipais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (opcional)</Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servidor">Servidor Público</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};