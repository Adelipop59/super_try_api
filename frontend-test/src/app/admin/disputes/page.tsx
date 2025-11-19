'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDisputes, resolveDispute, Dispute } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState<'FAVOR_TESTER' | 'FAVOR_SELLER' | 'PARTIAL'>('FAVOR_TESTER');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch (error) {
      console.error('Failed to load disputes:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;

    if (!resolutionNotes.trim()) {
      toast.error('Veuillez ajouter des notes de résolution');
      return;
    }

    try {
      await resolveDispute(selectedDispute.id, {
        resolution,
        resolutionNotes,
      });
      toast.success('Litige résolu avec succès');
      loadDisputes();
      setShowResolveDialog(false);
      setSelectedDispute(null);
      setResolutionNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la résolution');
    }
  };

  const openResolveDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolution('FAVOR_TESTER');
    setResolutionNotes('');
    setShowResolveDialog(true);
  };

  const pendingDisputes = disputes.filter(d => d.status === 'PENDING');
  const resolvedDisputes = disputes.filter(d => d.status === 'RESOLVED');

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
        <h1 className="text-3xl font-bold mb-2">Gestion des litiges</h1>
        <p className="text-muted-foreground">
          Résolvez les conflits entre vendeurs et testeurs
        </p>
      </div>

      {/* Alert for pending disputes */}
      {pendingDisputes.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  {pendingDisputes.length} litige{pendingDisputes.length > 1 ? 's' : ''} en attente
                </p>
                <p className="text-sm text-red-700">
                  Ces litiges nécessitent votre attention immédiate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingDisputes.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Résolus ({resolvedDisputes.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Litiges en attente</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDisputes.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun litige en attente</h3>
                  <p className="text-muted-foreground">
                    Tous les litiges ont été résolus
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Testeur</TableHead>
                        <TableHead>Vendeur</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Date création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDisputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-mono text-sm">
                            {dispute.sessionId.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm">
                            {dispute.testerId}
                          </TableCell>
                          <TableCell className="text-sm">
                            {dispute.sellerId}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate">{dispute.reason}</div>
                            {dispute.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {dispute.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(dispute.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/sessions/${dispute.sessionId}`)}
                                title="Voir session"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openResolveDialog(dispute)}
                              >
                                Résoudre
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolved Tab */}
        <TabsContent value="resolved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Litiges résolus</CardTitle>
            </CardHeader>
            <CardContent>
              {resolvedDisputes.length === 0 ? (
                <div className="py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun litige résolu</h3>
                  <p className="text-muted-foreground">
                    Les litiges résolus apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Testeur</TableHead>
                        <TableHead>Vendeur</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Résolution</TableHead>
                        <TableHead>Date résolution</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resolvedDisputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-mono text-sm">
                            {dispute.sessionId.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm">
                            {dispute.testerId}
                          </TableCell>
                          <TableCell className="text-sm">
                            {dispute.sellerId}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate">{dispute.reason}</div>
                          </TableCell>
                          <TableCell>
                            {dispute.resolution === 'FAVOR_TESTER' && (
                              <Badge className="bg-blue-100 text-blue-800">
                                En faveur testeur
                              </Badge>
                            )}
                            {dispute.resolution === 'FAVOR_SELLER' && (
                              <Badge className="bg-green-100 text-green-800">
                                En faveur vendeur
                              </Badge>
                            )}
                            {dispute.resolution === 'PARTIAL' && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Partiel
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {dispute.resolvedAt
                              ? new Date(dispute.resolvedAt).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/sessions/${dispute.sessionId}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
            <DialogDescription>
              Décidez de la résolution et ajoutez vos notes
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Dispute details */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4 space-y-2">
                  <div>
                    <span className="text-sm font-medium">Raison :</span>
                    <p className="text-sm text-muted-foreground">{selectedDispute.reason}</p>
                  </div>
                  {selectedDispute.description && (
                    <div>
                      <span className="text-sm font-medium">Description :</span>
                      <p className="text-sm text-muted-foreground">
                        {selectedDispute.description}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-sm font-medium">Testeur :</span>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedDispute.testerId}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Vendeur :</span>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedDispute.sellerId}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resolution */}
              <div className="space-y-2">
                <Label>Décision *</Label>
                <Select value={resolution} onValueChange={(value: any) => setResolution(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAVOR_TESTER">
                      En faveur du testeur
                    </SelectItem>
                    <SelectItem value="FAVOR_SELLER">
                      En faveur du vendeur
                    </SelectItem>
                    <SelectItem value="PARTIAL">
                      Résolution partielle (compromis)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution notes */}
              <div className="space-y-2">
                <Label>Notes de résolution *</Label>
                <Textarea
                  placeholder="Expliquez votre décision et les actions à prendre..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Ces notes seront visibles par le testeur et le vendeur
                </p>
              </div>

              {/* Resolution explanation */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900">
                    <strong>Conséquences de la résolution :</strong>
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    {resolution === 'FAVOR_TESTER' && (
                      <>
                        <li>Le testeur recevra sa récompense</li>
                        <li>La session sera marquée comme COMPLETED</li>
                        <li>Le vendeur recevra une notification</li>
                      </>
                    )}
                    {resolution === 'FAVOR_SELLER' && (
                      <>
                        <li>Le testeur ne recevra pas de récompense</li>
                        <li>La session sera marquée comme REJECTED</li>
                        <li>Le testeur recevra une notification</li>
                      </>
                    )}
                    {resolution === 'PARTIAL' && (
                      <>
                        <li>Une résolution partielle sera appliquée</li>
                        <li>Les deux parties seront notifiées</li>
                        <li>Précisez les détails dans les notes</li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResolveDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button onClick={handleResolve} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Résoudre le litige
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
