'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Session } from '@/lib/api/sessions';

interface SessionCardProps {
  session: Session;
  role: 'user' | 'pro';
  onAction?: (sessionId: string, action: string) => void;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  SUBMITTED: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-200 text-red-900',
};

const statusLabels = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  SUBMITTED: 'Soumise',
  COMPLETED: 'Terminée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  DISPUTED: 'Litige',
};

export function SessionCard({ session, role, onAction }: SessionCardProps) {
  const statusColor = statusColors[session.status] || 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[session.status] || session.status;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {session.campaign?.title || 'Campagne'}
            </CardTitle>
            <CardDescription>
              {role === 'user' ? (
                <>Postulé le {formatDate(session.appliedAt)}</>
              ) : (
                <>Testeur: {session.tester?.firstName} {session.tester?.lastName}</>
              )}
            </CardDescription>
          </div>
          <Badge className={statusColor}>{statusLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {session.acceptedAt && (
            <p className="text-sm text-muted-foreground">
              Acceptée le {formatDate(session.acceptedAt)}
            </p>
          )}
          {session.completedAt && (
            <p className="text-sm text-muted-foreground">
              Terminée le {formatDate(session.completedAt)}
            </p>
          )}
          {session.rating && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Note:</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < session.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link href={role === 'user' ? `/sessions/${session.id}` : `/pro/sessions/${session.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Voir détails
          </Button>
        </Link>

        {role === 'pro' && session.status === 'PENDING' && (
          <Button
            variant="default"
            onClick={() => onAction?.(session.id, 'accept')}
            className="flex-1"
          >
            Accepter
          </Button>
        )}

        {role === 'user' && session.status === 'ACCEPTED' && (
          <Link href={`/sessions/${session.id}`} className="flex-1">
            <Button variant="default" className="w-full">
              Soumettre achat
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
