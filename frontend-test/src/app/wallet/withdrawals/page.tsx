'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWallet, getWithdrawals, createWithdrawal, cancelWithdrawal, Wallet, Withdrawal } from '@/lib/api/wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CreditCard, Gift, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WithdrawalsPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'GIFT_CARD'>('BANK_TRANSFER');
  const [iban, setIban] = useState('');
  const [giftCardType, setGiftCardType] = useState('AMAZON');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [walletData, withdrawalsData] = await Promise.all([
        getWallet(),
        getWithdrawals(),
      ]);
      setWallet(walletData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!wallet || withdrawAmount > wallet.balance) {
      toast.error('Solde insuffisant');
      return;
    }

    if (method === 'BANK_TRANSFER' && !iban.trim()) {
      toast.error('Veuillez fournir votre IBAN');
      return;
    }

    setSubmitting(true);
    try {
      const paymentDetails = method === 'BANK_TRANSFER'
        ? { iban }
        : { giftCardType };

      await createWithdrawal({
        amount: withdrawAmount,
        method,
        paymentDetails,
      });

      toast.success('Demande de retrait créée !');
      setAmount('');
      setIban('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (withdrawalId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce retrait ?')) {
      return;
    }

    try {
      await cancelWithdrawal(withdrawalId);
      toast.success('Retrait annulé');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    const statusLabels: Record<string, string> = {
      PENDING: 'En attente',
      PROCESSING: 'En cours',
      COMPLETED: 'Complété',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
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

  if (!wallet) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Impossible de charger le wallet</h2>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/wallet">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au wallet
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Demander un retrait</h1>
        <p className="text-muted-foreground">
          Retirez vos gains par virement bancaire ou carte cadeau
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle demande de retrait</CardTitle>
              <CardDescription>
                Balance disponible: <span className="font-bold text-green-600">{wallet.balance.toFixed(2)} {wallet.currency}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant à retirer</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={wallet.balance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {wallet.currency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Montant minimum: 10.00 {wallet.currency}
                  </p>
                </div>

                <Separator />

                {/* Method */}
                <div className="space-y-2">
                  <Label htmlFor="method">Méthode de retrait</Label>
                  <Select value={method} onValueChange={(value) => setMethod(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Virement bancaire</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="GIFT_CARD">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          <span>Carte cadeau</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank transfer details */}
                {method === 'BANK_TRANSFER' && (
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Le virement sera effectué sous 3 à 5 jours ouvrés
                    </p>
                  </div>
                )}

                {/* Gift card details */}
                {method === 'GIFT_CARD' && (
                  <div className="space-y-2">
                    <Label htmlFor="giftCardType">Type de carte cadeau</Label>
                    <Select value={giftCardType} onValueChange={setGiftCardType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AMAZON">Amazon</SelectItem>
                        <SelectItem value="FNAC">Fnac</SelectItem>
                        <SelectItem value="ZALANDO">Zalando</SelectItem>
                        <SelectItem value="DECATHLON">Decathlon</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vous recevrez le code par email sous 24h
                    </p>
                  </div>
                )}

                {/* Warning */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Une fois validée, votre demande ne pourra plus être modifiée. Vous pourrez l'annuler uniquement si elle est en statut PENDING.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  disabled={submitting || !amount || parseFloat(amount) < 10}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'Création...' : 'Créer la demande'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Délais de traitement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Virement bancaire</span>
                </div>
                <p className="text-muted-foreground">3 à 5 jours ouvrés</p>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Carte cadeau</span>
                </div>
                <p className="text-muted-foreground">24 heures</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Frais</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                Aucun frais n'est prélevé sur vos retraits. Vous recevrez le montant total demandé.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Withdrawals history */}
      {withdrawals.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Historique des retraits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {withdrawal.method === 'BANK_TRANSFER' ? (
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Gift className="h-5 w-5 text-purple-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {withdrawal.method === 'BANK_TRANSFER' ? 'Virement bancaire' : 'Carte cadeau'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Demandé le {formatDate(withdrawal.requestedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold">
                        {withdrawal.amount.toFixed(2)} {wallet.currency}
                      </p>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    {withdrawal.status === 'PENDING' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(withdrawal.id)}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
