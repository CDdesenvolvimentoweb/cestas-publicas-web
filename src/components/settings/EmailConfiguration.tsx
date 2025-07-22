import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, TestTube, Mail, Settings } from 'lucide-react';

interface EmailSettings {
  sendgrid: {
    api_key: string;
    from_email: string;
    from_name: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
  };
}

export default function EmailConfiguration() {
  const [provider, setProvider] = useState<string>('sendgrid');
  const [settings, setSettings] = useState<EmailSettings>({
    sendgrid: {
      api_key: '',
      from_email: 'noreply@santateresa.es.gov.br',
      from_name: 'Sistema de Cestas - Prefeitura de Santa Teresa'
    },
    smtp: {
      host: '',
      port: 465,
      secure: true,
      username: '',
      password: '',
      from_email: 'noreply@santateresa.es.gov.br',
      from_name: 'Sistema de Cestas - Prefeitura de Santa Teresa'
    }
  });
  const [testEmail, setTestEmail] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações atuais
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['email_provider', 'email_settings']);

      if (error) throw error;

      const providerSetting = data.find(s => s.key === 'email_provider');
      const emailSettings = data.find(s => s.key === 'email_settings');

      if (providerSetting) setProvider(providerSetting.value);
      if (emailSettings) setSettings(emailSettings.value);

      return { provider: providerSetting?.value, settings: emailSettings?.value };
    }
  });

  // Salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        {
          key: 'email_provider',
          value: provider,
          description: 'Provedor de email (sendgrid, smtp, ses)'
        },
        {
          key: 'email_settings',
          value: settings,
          description: 'Configurações de email por provedor'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({
        title: 'Sucesso',
        description: 'Configurações de email salvas com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });

  // Testar email
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      if (!testEmail) {
        throw new Error('Digite um email para teste');
      }

      const { data, error } = await supabase.functions.invoke('quotation-system', {
        body: {
          action: 'test_email',
          email: testEmail
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Email de teste enviado!',
        description: `Email enviado para ${testEmail}. Verifique sua caixa de entrada.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro no teste',
        description: 'Erro ao enviar email de teste: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  });

  const handleSettingsChange = (providerType: keyof EmailSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [providerType]: {
        ...prev[providerType],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-6 h-6" />
        <div>
          <h2 className="text-2xl font-bold">Configurações de Email</h2>
          <p className="text-muted-foreground">Configure o serviço de email para o sistema de cotações</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Provedor de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione o provedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="smtp">SMTP Customizado</SelectItem>
                <SelectItem value="mock">Mock (Desenvolvimento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={provider} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="mock">Mock</TabsTrigger>
            </TabsList>

            <TabsContent value="sendgrid" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key do SendGrid</Label>
                  <Input
                    type="password"
                    value={settings.sendgrid.api_key}
                    onChange={(e) => handleSettingsChange('sendgrid', 'api_key', e.target.value)}
                    placeholder="SG.xxxxx..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Remetente</Label>
                  <Input
                    value={settings.sendgrid.from_email}
                    onChange={(e) => handleSettingsChange('sendgrid', 'from_email', e.target.value)}
                    placeholder="noreply@santateresa.es.gov.br"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome do Remetente</Label>
                <Input
                  value={settings.sendgrid.from_name}
                  onChange={(e) => handleSettingsChange('sendgrid', 'from_name', e.target.value)}
                  placeholder="Sistema de Cestas - Prefeitura de Santa Teresa"
                />
              </div>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Host SMTP</Label>
                  <Input
                    value={settings.smtp.host}
                    onChange={(e) => handleSettingsChange('smtp', 'host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                  <p className="text-xs text-muted-foreground">Exemplo: smtp.gmail.com, smtp.outlook.com</p>
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    type="number"
                    value={settings.smtp.port}
                    onChange={(e) => handleSettingsChange('smtp', 'port', parseInt(e.target.value))}
                    placeholder="465"
                  />
                  <p className="text-xs text-muted-foreground">Use 465 para SSL ou 587 para TLS</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800">Configuração Recomendada</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Para Gmail: Host: smtp.gmail.com, Porta: 465, SSL habilitado. 
                  Você pode precisar gerar uma senha de aplicativo se tiver 2FA ativado.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    value={settings.smtp.username}
                    onChange={(e) => handleSettingsChange('smtp', 'username', e.target.value)}
                    placeholder="usuario@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={settings.smtp.password}
                    onChange={(e) => handleSettingsChange('smtp', 'password', e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">Para Gmail, use senha de aplicativo</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Remetente</Label>
                  <Input
                    value={settings.smtp.from_email}
                    onChange={(e) => handleSettingsChange('smtp', 'from_email', e.target.value)}
                    placeholder="noreply@santateresa.es.gov.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Remetente</Label>
                  <Input
                    value={settings.smtp.from_name}
                    onChange={(e) => handleSettingsChange('smtp', 'from_name', e.target.value)}
                    placeholder="Sistema de Cestas - Prefeitura de Santa Teresa"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mock" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800">Modo de Desenvolvimento</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  No modo Mock, os emails não são enviados realmente. As mensagens aparecem apenas no console do servidor.
                  Use este modo apenas durante o desenvolvimento.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Teste de Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Teste de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Email para teste</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending || !testEmail}
              >
                {testEmailMutation.isPending ? 'Enviando...' : 'Testar Email'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Um email de teste será enviado para verificar se as configurações estão funcionando corretamente.
          </p>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-4">
        <Button
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saveSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
