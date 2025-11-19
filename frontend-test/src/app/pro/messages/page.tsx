'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, Session } from '@/lib/api/sessions';
import { getMessages, Message } from '@/lib/api/messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface SessionWithMessages {
  session: Session;
  lastMessage?: Message;
  unreadCount: number;
}

export default function ProMessagesPage() {
  const router = useRouter();
  const [sessionsWithMessages, setSessionsWithMessages] = useState<SessionWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessionsWithMessages();
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadSessionsWithMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadSessionsWithMessages = async () => {
    try {
      // Get all sessions for the seller
      const sessions = await getSessions();

      // For each session, get the messages
      const sessionsData = await Promise.all(
        sessions.map(async (session) => {
          try {
            const messages = await getMessages(session.id);
            const unreadCount = messages.filter((msg) => !msg.isRead && msg.senderId !== session.sellerId).length;

            return {
              session,
              lastMessage: messages[messages.length - 1],
              unreadCount,
            };
          } catch (error) {
            return {
              session,
              unreadCount: 0,
            };
          }
        })
      );

      // Sort by last message date or session date
      sessionsData.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt || a.session.appliedAt;
        const dateB = b.lastMessage?.createdAt || b.session.appliedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setSessionsWithMessages(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessionsWithMessages.filter((item) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.session.campaignId.toLowerCase().includes(query) ||
      item.session.testerId.toLowerCase().includes(query)
    );
  });

  const totalUnread = sessionsWithMessages.reduce((sum, item) => sum + item.unreadCount, 0);

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
        <h1 className="text-3xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">
          Toutes vos conversations avec les testeurs
        </p>
      </div>

      {/* Unread count */}
      {totalUnread > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">
                  {totalUnread} message{totalUnread > 1 ? 's' : ''} non lu{totalUnread > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par campagne ou testeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sessions list */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({filteredSessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune conversation</h3>
              <p className="text-muted-foreground">
                Les conversations avec vos testeurs apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((item) => (
                <div
                  key={item.session.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                    item.unreadCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                  onClick={() => router.push(`/pro/sessions/${item.session.id}/messages`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          Testeur: {item.session.testerId.substring(0, 12)}...
                        </h3>
                        {item.unreadCount > 0 && (
                          <Badge className="bg-blue-600 text-white">
                            {item.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        Campagne: {item.session.campaignId.substring(0, 20)}...
                      </p>

                      {item.lastMessage ? (
                        <div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {item.lastMessage.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.lastMessage.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aucun message
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      <Badge
                        className={
                          item.session.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.session.status === 'ACCEPTED' ||
                              item.session.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : item.session.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {item.session.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
