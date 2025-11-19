'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Wallet, getWallet } from '@/lib/api/wallets';
import Link from 'next/link';

export function WalletBalance() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Mon Wallet
          </CardTitle>
          <CardDescription className="text-xs">
            Balance disponible
          </CardDescription>
        </div>
        <div className="p-2 rounded-lg bg-green-100 text-green-600">
          <WalletIcon className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="text-3xl font-bold text-green-600">
            {wallet.balance.toFixed(2)} {wallet.currency}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Total gagné</span>
              </div>
              <div className="text-sm font-semibold">
                {wallet.totalEarned.toFixed(2)} {wallet.currency}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3 w-3" />
                <span>Total retiré</span>
              </div>
              <div className="text-sm font-semibold">
                {wallet.totalWithdrawn.toFixed(2)} {wallet.currency}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href="/wallet" className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                Historique
              </Button>
            </Link>
            <Link href="/wallet/withdrawals" className="flex-1">
              <Button variant="default" className="w-full" size="sm">
                Retirer
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
