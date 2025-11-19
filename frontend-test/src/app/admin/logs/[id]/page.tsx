'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLog, Log, LogLevel } from '@/lib/api/logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const logId = params.id as string;

  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLog();
  }, [logId]);

  const loadLog = async () => {
    try {
      const data = await getLog(logId);
      setLog(data);
    } catch (error) {
      console.error('Failed to load log:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: LogLevel) => {
    const colors: Record<LogLevel, string> = {
      INFO: 'bg-blue-100 text-blue-800',
      SUCCESS: 'bg-green-100 text-green-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
      DEBUG: 'bg-purple-100 text-purple-800',
    };

    return <Badge className={colors[level]}>{level}</Badge>;
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

  if (!log) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Log introuvable</h2>
        <Button onClick={() => router.push('/admin/logs')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/logs')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux logs
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Détail du log</h1>
          {getLevelBadge(log.level)}
          <Badge variant="outline">{log.category}</Badge>
        </div>
        <p className="text-muted-foreground">
          {new Date(log.createdAt).toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
      </div>

      <div className="space-y-6">
        {/* Message */}
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{log.message}</p>
          </CardContent>
        </Card>

        {/* Technical details */}
        <Card>
          <CardHeader>
            <CardTitle>Détails techniques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">ID du log</div>
                <div className="font-mono text-sm">{log.id}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Timestamp</div>
                <div className="font-mono text-sm">
                  {new Date(log.createdAt).toISOString()}
                </div>
              </div>

              {log.userId && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Utilisateur
                  </div>
                  <div className="font-mono text-sm">{log.userId}</div>
                </div>
              )}

              {log.endpoint && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Endpoint</div>
                  <div className="font-mono text-sm">{log.endpoint}</div>
                </div>
              )}

              {log.method && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Méthode HTTP</div>
                  <Badge>{log.method}</Badge>
                </div>
              )}

              {log.statusCode && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Code statut
                  </div>
                  <Badge
                    className={
                      log.statusCode >= 200 && log.statusCode < 300
                        ? 'bg-green-100 text-green-800'
                        : log.statusCode >= 400
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {log.statusCode}
                  </Badge>
                </div>
              )}

              {log.duration && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Durée</div>
                  <div className="text-sm">{log.duration}ms</div>
                </div>
              )}

              {log.ipAddress && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Adresse IP
                  </div>
                  <div className="font-mono text-sm">{log.ipAddress}</div>
                </div>
              )}

              {log.userAgent && (
                <div className="col-span-2">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User Agent
                  </div>
                  <div className="text-sm text-muted-foreground break-all">{log.userAgent}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional details JSON */}
        {log.details && Object.keys(log.details).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Détails supplémentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
