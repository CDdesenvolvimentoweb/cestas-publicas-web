import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  quote_reminders: boolean;
  quote_responses: boolean;
  system_updates: boolean;
}

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    quote_reminders: true,
    quote_responses: true,
    system_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
    setupRealtimeSubscription();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar notificações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          toast({
            title: (payload.new as Notification).title,
            description: (payload.new as Notification).message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id_param: notificationId
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao marcar notificação como lida',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      for (const id of unreadIds) {
        await markAsRead(id);
      }

      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ...preferences,
          ...newPreferences,
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, ...newPreferences }));
      toast({
        title: 'Sucesso',
        description: 'Preferências atualizadas com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar preferências',
        variant: 'destructive',
      });
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    if (activeTab === 'quotes') {
      return notifications.filter(n => n.type.includes('quote'));
    }
    return notifications;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quote_request': return 'bg-blue-500';
      case 'quote_response': return 'bg-green-500';
      case 'quote_reminder': return 'bg-yellow-500';
      case 'system': return 'bg-gray-500';
      case 'report_ready': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Carregando notificações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">
              Não lidas {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="quotes">Cotações</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <NotificationList 
              notifications={getFilteredNotifications()}
              onMarkAsRead={markAsRead}
              getTypeColor={getTypeColor}
            />
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            <NotificationList 
              notifications={getFilteredNotifications()}
              onMarkAsRead={markAsRead}
              getTypeColor={getTypeColor}
            />
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            <NotificationList 
              notifications={getFilteredNotifications()}
              onMarkAsRead={markAsRead}
              getTypeColor={getTypeColor}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferências de Notificação</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications}
                    onChange={(e) => updatePreferences({ email_notifications: e.target.checked })}
                    className="rounded"
                  />
                  <span>Notificações por email</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.quote_reminders}
                    onChange={(e) => updatePreferences({ quote_reminders: e.target.checked })}
                    className="rounded"
                  />
                  <span>Lembretes de cotação</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.quote_responses}
                    onChange={(e) => updatePreferences({ quote_responses: e.target.checked })}
                    className="rounded"
                  />
                  <span>Respostas de cotação</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.system_updates}
                    onChange={(e) => updatePreferences({ system_updates: e.target.checked })}
                    className="rounded"
                  />
                  <span>Atualizações do sistema</span>
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  getTypeColor: (type: string) => string;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  getTypeColor,
}) => {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma notificação encontrada
      </div>
    );
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.is_read 
                ? 'bg-muted/50' 
                : 'bg-background border-primary/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getTypeColor(notification.type)}`} />
                  <h4 className="font-medium">{notification.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </div>
              
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};