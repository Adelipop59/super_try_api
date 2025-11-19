'use client';

import { useEffect, useState } from 'react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '@/lib/api/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck, Info, AlertCircle, CheckCircle, AlertTriangle, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success('Toutes les notifications sont marquées comme lues');
      loadNotifications();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      INFO: <Info className="h-5 w-5 text-blue-600" />,
      SUCCESS: <CheckCircle className="h-5 w-5 text-green-600" />,
      WARNING: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      ERROR: <AlertCircle className="h-5 w-5 text-red-600" />,
      ANNOUNCEMENT: <Megaphone className="h-5 w-5 text-purple-600" />,
    };

    return icons[type] || <Bell className="h-5 w-5 text-gray-600" />;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      INFO: 'bg-blue-100 text-blue-800',
      SUCCESS: 'bg-green-100 text-green-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
      ANNOUNCEMENT: 'bg-purple-100 text-purple-800',
    };

    const labels: Record<string, string> = {
      INFO: 'Info',
      SUCCESS: 'Succès',
      WARNING: 'Avertissement',
      ERROR: 'Erreur',
      ANNOUNCEMENT: 'Annonce',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {labels[type] || type}
      </Badge>
    );
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadNotifications.length > 0
                ? `${unreadNotifications.length} notification${unreadNotifications.length > 1 ? 's' : ''} non lue${unreadNotifications.length > 1 ? 's' : ''}`
                : 'Aucune notification non lue'}
            </p>
          </div>

          {unreadNotifications.length > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="unread" className="w-full">
        <TabsList>
          <TabsTrigger value="unread">
            Non lues ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Toutes ({notifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Unread Tab */}
        <TabsContent value="unread" className="mt-6">
          <div className="space-y-4">
            {unreadNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Vous êtes à jour !</h3>
                  <p className="text-muted-foreground">
                    Aucune nouvelle notification
                  </p>
                </CardContent>
              </Card>
            ) : (
              unreadNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="border-l-4 border-l-blue-500 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getTypeIcon(notification.type)}</div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          {getTypeBadge(notification.type)}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-blue-600 font-medium">
                            Cliquer pour marquer comme lu
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* All Tab */}
        <TabsContent value="all" className="mt-6">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
                  <p className="text-muted-foreground">
                    Les notifications apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={notification.isRead ? 'bg-white' : 'border-l-4 border-l-blue-500 bg-blue-50'}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getTypeIcon(notification.type)}</div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className={`font-semibold ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {getTypeBadge(notification.type)}
                            {!notification.isRead && (
                              <Badge className="bg-blue-600 text-white">Nouveau</Badge>
                            )}
                          </div>
                        </div>

                        <p className={`text-sm mb-2 ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {notification.isRead && notification.readAt && (
                            <span>
                              Lu le {new Date(notification.readAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
