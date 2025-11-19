'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { getMessages, sendMessage, markMessageAsRead, Message } from '@/lib/api/messages';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

export default function SessionChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    // Set up polling for new messages
    const interval = setInterval(() => {
      loadMessages();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
    markUnreadMessages();
  }, [messages]);

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

  const markUnreadMessages = async () => {
    if (!user) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.isRead && msg.senderId !== user.id
    );

    for (const msg of unreadMessages) {
      try {
        await markMessageAsRead(sessionId, msg.id);
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(sessionId, {
        content: messageText.trim(),
      });

      setMessageText('');
      loadMessages();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
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
        <Button onClick={() => router.push('/pro/sessions')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/pro/sessions/${sessionId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la session
        </Button>

        <h1 className="text-3xl font-bold">Conversation</h1>
        <p className="text-muted-foreground">
          Discutez avec le testeur au sujet de cette session
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="border-b">
            <CardTitle>Messages</CardTitle>
          </CardHeader>

          {/* Messages list */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground">Aucun message</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Commencez la conversation
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isMine = user && message.senderId === user.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.attachmentUrl && (
                        <a
                          href={message.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs underline mt-1 block ${
                            isMine ? 'text-blue-100' : 'text-blue-600'
                          }`}
                        >
                          📎 Pièce jointe
                        </a>
                      )}
                      <div
                        className={`text-xs mt-1 ${
                          isMine ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {isMine && message.isRead && ' • Lu'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message input */}
          <div className="border-t p-4">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Écrivez votre message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !messageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Utilisez cette messagerie pour échanger avec le testeur sur la session
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
