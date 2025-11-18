'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats } from '@/lib/api/admin';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Package,
  ClipboardList,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  totalPros: number;
  totalAdmins: number;
  activeCampaigns: number;
  totalCampaigns: number;
  activeSessions: number;
  completedSessions: number;
  totalTransferred: number;
  pendingDisputes: number;
  pendingWithdrawals: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Erreur de chargement</h2>
        <Button onClick={loadStats}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Administrateur</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de la plateforme Super Try API
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Utilisateurs totaux"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          description={`${stats.totalPros} vendeurs, ${stats.totalAdmins} admins`}
        />

        <StatsCard
          title="Campagnes actives"
          value={stats.activeCampaigns}
          icon={Briefcase}
          color="green"
          description={`${stats.totalCampaigns} au total`}
        />

        <StatsCard
          title="Sessions en cours"
          value={stats.activeSessions}
          icon={ClipboardList}
          color="purple"
          description={`${stats.completedSessions} complétées`}
        />

        <StatsCard
          title="Montant transféré"
          value={`${stats.totalTransferred.toFixed(0)}€`}
          icon={DollarSign}
          color="green"
          description="Total des paiements"
        />
      </div>

      {/* Alerts */}
      {(stats.pendingDisputes > 0 || stats.pendingWithdrawals > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.pendingDisputes > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Litiges en attente
                </CardTitle>
                <CardDescription className="text-red-700">
                  {stats.pendingDisputes} litige{stats.pendingDisputes > 1 ? 's' : ''} nécessite{stats.pendingDisputes > 1 ? 'nt' : ''} votre attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/disputes">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Gérer les litiges
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {stats.pendingWithdrawals > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Retraits en attente
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {stats.pendingWithdrawals} retrait{stats.pendingWithdrawals > 1 ? 's' : ''} à traiter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/withdrawals">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Gérer les retraits
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/users')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Gestion utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gérer les comptes utilisateurs, vendeurs et administrateurs
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-muted-foreground">Testeurs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.totalPros}</div>
                <div className="text-muted-foreground">Vendeurs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/categories')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Catégories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gérer les catégories de produits
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/campaigns')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Campagnes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Superviser toutes les campagnes de test
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.activeCampaigns}</div>
                <div className="text-muted-foreground">Actives</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.totalCampaigns}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/disputes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5" />
              Litiges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Résoudre les conflits entre vendeurs et testeurs
            </p>
            <div className="mt-4">
              <div className="text-2xl font-bold text-red-600">{stats.pendingDisputes}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/withdrawals')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Retraits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gérer les demandes de retrait des testeurs
            </p>
            <div className="mt-4">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingWithdrawals}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/logs')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Logs système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consulter les logs d'activité de la plateforme
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Les dernières actions sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Section activité récente à implémenter</p>
            <p className="text-sm mt-2">
              Affichera les dernières inscriptions, campagnes créées, sessions complétées, etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
