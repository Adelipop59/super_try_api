'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWithdrawals, processWithdrawal, Withdrawal } from '@/lib/api/wallets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Check, X, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an admin endpoint that returns all withdrawals
      const data = await getWithdrawals();
      setWithdrawals(data);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedWithdrawal) return;

    if (action === 'reject' && !notes.trim()) {
      toast.error('Veuillez indiquer une raison pour le refus');
      return;
    }

    try {
      await processWithdrawal(selectedWithdrawal.id, {
        status: action === 'approve' ? 'COMPLETED' : 'FAILED',
        adminNotes: notes,
      });
      toast.success(
        action === 'approve' ? 'Retrait approuvé' : 'Retrait refusé'
      );
      loadWithdrawals();
      setShowProcessDialog(false);
      setSelectedWithdrawal(null);
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du traitement');
    }
  };

  const openProcessDialog = (withdrawal: Withdrawal, type: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setAction(type);
    setNotes('');
    setShowProcessDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      COMPLETED: 'Complété',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      BANK_TRANSFER: 'Virement bancaire',
      GIFT_CARD: 'Carte cadeau',
    };
    return labels[method] || method;
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
  const processingWithdrawals = withdrawals.filter(w => w.status === 'PROCESSING');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'COMPLETED');
  const failedWithdrawals = withdrawals.filter(w => w.status === 'FAILED' || w.status === 'CANCELLED');

  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

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
        <h1 className="text-3xl font-bold mb-2">Gestion des retraits</h1>
        <p className="text-muted-foreground">
          Traitez les demandes de retrait des testeurs
        </p>
      </div>

      {/* Alert for pending withdrawals */}
      {pendingWithdrawals.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-semibold text-orange-900">
                  {pendingWithdrawals.length} retrait{pendingWithdrawals.length > 1 ? 's' : ''} en
                  attente
                </p>
                <p className="text-sm text-orange-700">
                  Montant total : {totalPending.toFixed(2)}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingWithdrawals.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPending.toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {processingWithdrawals.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {processingWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Complétés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedWithdrawals.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {completedWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {failedWithdrawals.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {failedWithdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}€
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            En cours ({processingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Complétés ({completedWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Échoués ({failedWithdrawals.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Retraits en attente</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingWithdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun retrait en attente</h3>
                  <p className="text-muted-foreground">
                    Toutes les demandes ont été traitées
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Détails paiement</TableHead>
                      <TableHead>Date demande</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.userId}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-lg">
                            {withdrawal.amount.toFixed(2)}€
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge>{getMethodLabel(withdrawal.method)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {withdrawal.method === 'BANK_TRANSFER' && withdrawal.iban && (
                            <div className="font-mono text-sm">{withdrawal.iban}</div>
                          )}
                          {withdrawal.method === 'GIFT_CARD' && withdrawal.giftCardType && (
                            <div className="text-sm">{withdrawal.giftCardType}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(withdrawal.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openProcessDialog(withdrawal, 'reject')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openProcessDialog(withdrawal, 'approve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Retraits en cours</CardTitle>
            </CardHeader>
            <CardContent>
              {processingWithdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun retrait en cours</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Date demande</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.userId}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {withdrawal.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge>{getMethodLabel(withdrawal.method)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Retraits complétés</CardTitle>
            </CardHeader>
            <CardContent>
              {completedWithdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun retrait complété</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Date demande</TableHead>
                      <TableHead>Date complétion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.userId}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {withdrawal.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge>{getMethodLabel(withdrawal.method)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {withdrawal.completedAt
                            ? new Date(withdrawal.completedAt).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Tab */}
        <TabsContent value="failed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Retraits échoués ou annulés</CardTitle>
            </CardHeader>
            <CardContent>
              {failedWithdrawals.length === 0 ? (
                <div className="py-16 text-center">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun retrait échoué</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.userId}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {withdrawal.amount.toFixed(2)}€
                        </TableCell>
                        <TableCell>
                          <Badge>{getMethodLabel(withdrawal.method)}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {withdrawal.adminNotes || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approuver le retrait' : 'Refuser le retrait'}
            </DialogTitle>
            <DialogDescription>
              {selectedWithdrawal && (
                <>
                  Montant : {selectedWithdrawal.amount.toFixed(2)}€ -{' '}
                  {getMethodLabel(selectedWithdrawal.method)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              {/* Payment details */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4 space-y-2">
                  <div>
                    <span className="text-sm font-medium">Utilisateur :</span>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedWithdrawal.userId}
                    </p>
                  </div>
                  {selectedWithdrawal.method === 'BANK_TRANSFER' && selectedWithdrawal.iban && (
                    <div>
                      <span className="text-sm font-medium">IBAN :</span>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedWithdrawal.iban}
                      </p>
                    </div>
                  )}
                  {selectedWithdrawal.method === 'GIFT_CARD' && selectedWithdrawal.giftCardType && (
                    <div>
                      <span className="text-sm font-medium">Type de carte :</span>
                      <p className="text-sm text-muted-foreground">
                        {selectedWithdrawal.giftCardType}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <div className="space-y-2">
                <Label>
                  {action === 'approve' ? 'Notes (optionnel)' : 'Raison du refus *'}
                </Label>
                <Textarea
                  placeholder={
                    action === 'approve'
                      ? 'Notes internes...'
                      : 'Expliquez la raison du refus...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowProcessDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleProcess}
                  className={`flex-1 ${
                    action === 'approve'
                      ? ''
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {action === 'approve' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Refuser
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
