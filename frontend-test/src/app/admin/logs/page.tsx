'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLogs, Log, LogLevel, LogCategory } from '@/lib/api/logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Eye, BarChart3, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, [page, levelFilter, categoryFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs({
        level: levelFilter !== 'all' ? (levelFilter as LogLevel) : undefined,
        category: categoryFilter !== 'all' ? (categoryFilter as LogCategory) : undefined,
        search: searchQuery || undefined,
        page,
        limit: 50,
      });

      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
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

  if (loading && logs.length === 0) {
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
            <h1 className="text-3xl font-bold mb-2">Logs système</h1>
            <p className="text-muted-foreground">
              Consultez l'historique d'activité du système
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/logs/stats')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiques
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/logs/cleanup')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Nettoyage
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Recherche</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Message, endpoint, user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="WARNING">WARNING</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="AUTH">AUTH</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="PRODUCT">PRODUCT</SelectItem>
                  <SelectItem value="CAMPAIGN">CAMPAIGN</SelectItem>
                  <SelectItem value="SESSION">SESSION</SelectItem>
                  <SelectItem value="PAYMENT">PAYMENT</SelectItem>
                  <SelectItem value="NOTIFICATION">NOTIFICATION</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun log trouvé</h3>
              <p className="text-muted-foreground">
                Essayez de modifier vos filtres
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>{getLevelBadge(log.level)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2">{log.message}</div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.userId ? log.userId.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.endpoint || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/admin/logs/${log.id}`)}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
