'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLogStats, LogStats } from '@/lib/api/logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function LogStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getLogStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
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

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Statistiques indisponibles</h2>
        <Button onClick={() => router.push('/admin/logs')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/logs')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux logs
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Statistiques des logs</h1>
        <p className="text-muted-foreground">
          Analyse de l'activité système
        </p>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                Total logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Erreurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.byLevel.ERROR || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.byLevel.WARNING || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.byLevel.SUCCESS || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By Level */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution par niveau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.byLevel).map(([level, count]) => {
                const percentage = (count / stats.totalLogs) * 100;
                const colors: Record<string, string> = {
                  INFO: 'bg-blue-500',
                  SUCCESS: 'bg-green-500',
                  WARNING: 'bg-yellow-500',
                  ERROR: 'bg-red-500',
                  DEBUG: 'bg-purple-500',
                };

                return (
                  <div key={level}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{level}</span>
                      <span className="text-muted-foreground">
                        {count.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[level] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([category, count]) => {
                  const percentage = (count / stats.totalLogs) * 100;

                  return (
                    <div key={category}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">
                          {count.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top endpoints with errors */}
        {stats.topErrorEndpoints && stats.topErrorEndpoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Endpoints avec le plus d'erreurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topErrorEndpoints.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div>
                      <div className="font-mono text-sm">{item.endpoint}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.method || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">{item.count}</div>
                      <div className="text-xs text-red-700">erreurs</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity by hour */}
        {stats.activityByHour && (
          <Card>
            <CardHeader>
              <CardTitle>Activité par heure (dernières 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.activityByHour)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .slice(0, 24)
                  .map(([hour, count]) => {
                    const maxCount = Math.max(...Object.values(stats.activityByHour!));
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={hour} className="flex items-center gap-3">
                        <div className="w-16 text-sm text-muted-foreground">{hour}h</div>
                        <div className="flex-1 h-8 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center px-2"
                            style={{ width: `${percentage}%` }}
                          >
                            {count > 0 && (
                              <span className="text-xs text-white font-medium">
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
