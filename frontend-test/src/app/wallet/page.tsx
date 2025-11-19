'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWallet, getTransactions, Wallet, Transaction } from '@/lib/api/wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet as WalletIcon } from 'lucide-react';
import Link from 'next/link';

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletData, transactionsData] = await Promise.all([
        getWallet(),
        getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'CREDIT' ? (
      <div className="p-2 rounded-full bg-green-100">
        <ArrowUpRight className="h-4 w-4 text-green-600" />
      </div>
    ) : (
      <div className="p-2 rounded-full bg-red-100">
        <ArrowDownRight className="h-4 w-4 text-red-600" />
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
  const debitTransactions = transactions.filter(t => t.type === 'DEBIT');

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mon Wallet</h1>
        <p className="text-muted-foreground">
          Gérez vos gains et vos retraits
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-1 md:col-span-2 border-2 border-primary">
          <CardHeader>
            <CardDescription>Balance disponible</CardDescription>
            <CardTitle className="text-4xl text-green-600">
              {wallet.balance.toFixed(2)} {wallet.currency}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/wallet/withdrawals">
              <Button className="w-full" size="lg">
                Demander un retrait
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total gagné</p>
                  <p className="text-xl font-bold text-green-600">
                    {wallet.totalEarned.toFixed(2)} {wallet.currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total retiré</p>
                  <p className="text-xl font-bold text-blue-600">
                    {wallet.totalWithdrawn.toFixed(2)} {wallet.currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
          <CardDescription>
            Toutes vos transactions de crédits et débits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Toutes ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="credits">
                Crédits ({creditTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="debits">
                Débits ({debitTransactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune transaction pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'CREDIT' ? '+' : '-'}
                          {transaction.amount.toFixed(2)} {wallet.currency}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="credits" className="mt-6">
              {creditTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucun crédit</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creditTransactions.map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          +{transaction.amount.toFixed(2)} {wallet.currency}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="debits" className="mt-6">
              {debitTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucun débit</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debitTransactions.map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          -{transaction.amount.toFixed(2)} {wallet.currency}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
