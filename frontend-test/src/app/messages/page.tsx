'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, Session } from '@/lib/api/sessions';
import { getMessages, Message } from '@/lib/api/messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface SessionWithMessages {
  session: Session;
  lastMessage?: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const [sessionsWithMessages, setSessionsWithMessages] = useState<SessionWithMessages[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Filter sessions based on search
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredSessions(sessionsWithMessages);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sessionsWithMessages.filter(
        (sw) =>
          sw.session.campaignId.toLowerCase().includes(query) ||
          sw.session.productId.toLowerCase().includes(query) ||
          sw.lastMessage?.content.toLowerCase().includes(query)
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessionsWithMessages]);

  const loadData = async () => {
    try {
      // Get all sessions with messages (accepted sessions)
      const sessions = await getSessions();
      const acceptedSessions = sessions.filter(
        (s) => s.status !== 'PENDING' && s.status !== 'REJECTED'
      );

      // Load messages for each session
      const sessionsData: SessionWithMessages[] = await Promise.all(
        acceptedSessions.map(async (session) => {
          try {
            const messages = await getMessages(session.id);
            const unreadMessages = messages.filter((m) => !m.isRead && m.senderId !== session.userId);

            return {
              session,
              lastMessage: messages[messages.length - 1],
              unreadCount: unreadMessages.length,
            };
          } catch (error) {
            console.error(`Failed to load messages for session ${session.id}:`, error);
            return {
              session,
              lastMessage: undefined,
              unreadCount: 0,
            };
          }
        })
      );

      // Sort by last message date (most recent first)
      sessionsData.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt || a.session.createdAt;
        const dateB = b.lastMessage?.createdAt || b.session.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setSessionsWithMessages(sessionsData);
      setFilteredSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      SUBMITTED: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      PENDING: 'En attente',
      ACCEPTED: 'Acceptée',
      IN_PROGRESS: 'En cours',
      SUBMITTED: 'Soumise',
      COMPLETED: 'Terminée',
      REJECTED: 'Refusée',
      CANCELLED: 'Annulée',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalUnread = sessionsWithMessages.reduce((sum, sw) => sum + sw.unreadCount, 0);

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
          {totalUnread > 0
            ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}`
            : 'Toutes vos conversations avec les vendeurs'}
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversations list */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations ({filteredSessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Essayez une autre recherche'
                  : 'Vos conversations avec les vendeurs apparaîtront ici'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map(({ session, lastMessage, unreadCount }) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    unreadCount > 0 ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => router.push(`/sessions/${session.id}/messages`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Session info */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold truncate">
                            Campagne: {session.campaignId.substring(0, 30)}...
                          </h3>
                          {getStatusBadge(session.status)}
                        </div>

                        {/* Product */}
                        <div className="text-sm text-muted-foreground mb-2">
                          Produit: {session.productId.substring(0, 40)}...
                        </div>

                        {/* Last message preview */}
                        {lastMessage ? (
                          <div className="flex items-start gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm line-clamp-2 ${
                                  unreadCount > 0 ? 'font-semibold text-blue-900' : 'text-muted-foreground'
                                }`}
                              >
                                {lastMessage.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(lastMessage.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aucun message pour le moment
                          </p>
                        )}
                      </div>

                      {/* Unread badge & arrow */}
                      <div className="flex items-center gap-2 ml-4">
                        {unreadCount > 0 && (
                          <Badge className="bg-blue-600 text-white">
                            {unreadCount}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
