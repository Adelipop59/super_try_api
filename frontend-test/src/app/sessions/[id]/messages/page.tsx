'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { getMessages, sendMessage, Message } from '@/lib/api/messages';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, User } from 'lucide-react';
import { toast } from 'sonner';

export default function UserSessionMessagesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      const [sessionData, messagesData] = await Promise.all([
        getSession(sessionId),
        getMessages(sessionId),
      ]);

      setSession(sessionData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const messagesData = await getMessages(sessionId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(sessionId, { content: newMessage.trim() });
      setNewMessage('');
      await loadMessages();
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
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

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Session introuvable</h2>
        <Button onClick={() => router.push('/sessions')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/sessions/${sessionId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la session
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discussion avec le vendeur</h1>
            <p className="text-muted-foreground">
              Campagne: {session.campaignId.substring(0, 30)}...
            </p>
          </div>
          {getStatusBadge(session.status)}
        </div>
      </div>

      <div className="max-w-4xl">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Messages</CardTitle>
              <span className="text-sm text-muted-foreground">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Messages list */}
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">
                    Aucun message pour le moment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Commencez la conversation avec le vendeur
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        } rounded-lg p-4`}
                      >
                        {/* Sender info */}
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {isOwnMessage ? 'Vous' : 'Vendeur'}
                          </span>
                        </div>

                        {/* Message content */}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>

                        {/* Timestamp */}
                        <div
                          className={`text-xs mt-2 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {message.isRead && isOwnMessage && (
                            <span className="ml-2">✓✓ Lu</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSend} className="space-y-3">
              <Textarea
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne
                </p>
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Session info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Informations de la session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Statut</div>
                <div className="mt-1">{getStatusBadge(session.status)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Produit</div>
                <div className="font-medium">{session.productId.substring(0, 20)}...</div>
              </div>
              {session.acceptedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Acceptée le</div>
                  <div className="font-medium">
                    {new Date(session.acceptedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
              {session.completedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Terminée le</div>
                  <div className="font-medium">
                    {new Date(session.completedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/sessions/${sessionId}`)}
              >
                Voir les détails de la session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
