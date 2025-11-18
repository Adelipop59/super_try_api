'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, Session } from '@/lib/api/sessions';
import { SessionCard } from '@/components/SessionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByStatus = (statuses: string[]) => {
    return sessions.filter(s => statuses.includes(s.status));
  };

  const pendingSessions = filterByStatus(['PENDING']);
  const activeSessions = filterByStatus(['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED']);
  const completedSessions = filterByStatus(['COMPLETED']);
  const rejectedSessions = filterByStatus(['REJECTED', 'CANCELLED', 'DISPUTED']);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes Sessions</h1>
        <p className="text-muted-foreground">
          Suivez vos candidatures et gérez vos tests en cours
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            En attente ({pendingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Actives ({activeSessions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({completedSessions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Refusées ({rejectedSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingSessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune candidature en attente</h3>
                <p className="text-muted-foreground">
                  Vos candidatures apparaîtront ici une fois que vous aurez postulé à des campagnes
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingSessions.map(session => (
                <SessionCard key={session.id} session={session} role="user" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune session active</h3>
                <p className="text-muted-foreground">
                  Vos sessions acceptées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSessions.map(session => (
                <SessionCard key={session.id} session={session} role="user" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune session terminée</h3>
                <p className="text-muted-foreground">
                  Vos tests complétés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedSessions.map(session => (
                <SessionCard key={session.id} session={session} role="user" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune session refusée</h3>
                <p className="text-muted-foreground">
                  Les sessions refusées ou annulées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedSessions.map(session => (
                <SessionCard key={session.id} session={session} role="user" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
