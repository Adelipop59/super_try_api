'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, Session } from '@/lib/api/sessions';
import { getWallet, Wallet } from '@/lib/api/wallet';
import { getMyReviews, Review } from '@/lib/api/reviews';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Star,
  Package,
  Wallet as WalletIcon,
  Award,
  Activity,
  ChevronRight,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UserDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, walletData, reviewsData] = await Promise.all([
        getSessions(),
        getWallet(),
        getMyReviews(),
      ]);

      setSessions(sessionsData);
      setWallet(walletData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const activeSessions = sessions.filter(
    (s) => s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS' || s.status === 'SUBMITTED'
  );
  const pendingSessions = sessions.filter((s) => s.status === 'PENDING');

  const totalEarned = completedSessions.reduce((sum, s) => sum + (s.reward || 0), 0);
  const pendingEarnings = activeSessions.reduce((sum, s) => sum + (s.reward || 0), 0);

  const averageRating =
    completedSessions.filter((s) => s.rating).length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) /
        completedSessions.filter((s) => s.rating).length
      : 0;

  const completionRate =
    sessions.length > 0
      ? (completedSessions.length / (sessions.length - pendingSessions.length)) * 100
      : 0;

  // Rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: completedSessions.filter((s) => s.rating === rating).length,
  }));

  const maxRatingCount = Math.max(...ratingDistribution.map((r) => r.count), 1);

  // Recent activity (last 5 sessions)
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

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
        <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Suivez vos performances et vos gains
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {wallet?.balance.toFixed(2) || '0.00'}€
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/wallet')}
              className="mt-2"
            >
              Voir wallet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Tests complétés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeSessions.length} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Note moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedSessions.filter((s) => s.rating).length} évaluation(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total gagné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {totalEarned.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              +{pendingEarnings.toFixed(2)}€ en attente
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Completion rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Taux de complétion</span>
                  <span className="text-sm font-bold">{completionRate.toFixed(0)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {completedSessions.length} sessions complétées sur{' '}
                  {sessions.length - pendingSessions.length} acceptées
                </p>
              </div>

              {/* Rating distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">Distribution des notes</h4>
                <div className="space-y-2">
                  {ratingDistribution.reverse().map(({ rating, count }) => (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <Progress
                          value={(count / maxRatingCount) * 100}
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sessions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {reviews.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Avis laissés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((completedSessions.length / Math.max(sessions.length, 1)) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Taux de succès</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activité récente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/sessions')}
                >
                  Voir tout
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune activité récente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => router.push(`/sessions/${session.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate mb-1">
                          {session.campaignId.substring(0, 40)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mis à jour:{' '}
                          {new Date(session.updatedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <Badge
                        className={
                          session.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : session.status === 'IN_PROGRESS'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Accomplissements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First test */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  completedSessions.length >= 1 ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSessions.length >= 1
                      ? 'bg-green-200 text-green-700'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  🎯
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Premier test</div>
                  <div className="text-xs text-muted-foreground">
                    Complétez votre premier test
                  </div>
                </div>
                {completedSessions.length >= 1 && (
                  <Badge className="bg-green-600 text-white">✓</Badge>
                )}
              </div>

              {/* 5 tests */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  completedSessions.length >= 5 ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSessions.length >= 5
                      ? 'bg-blue-200 text-blue-700'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  🏆
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Testeur confirmé</div>
                  <div className="text-xs text-muted-foreground">
                    Complétez 5 tests ({completedSessions.length}/5)
                  </div>
                </div>
                {completedSessions.length >= 5 && (
                  <Badge className="bg-blue-600 text-white">✓</Badge>
                )}
              </div>

              {/* 10 tests */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  completedSessions.length >= 10 ? 'bg-purple-50' : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSessions.length >= 10
                      ? 'bg-purple-200 text-purple-700'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  ⭐
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Expert</div>
                  <div className="text-xs text-muted-foreground">
                    Complétez 10 tests ({completedSessions.length}/10)
                  </div>
                </div>
                {completedSessions.length >= 10 && (
                  <Badge className="bg-purple-600 text-white">✓</Badge>
                )}
              </div>

              {/* Perfect rating */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  averageRating >= 4.5 && completedSessions.filter((s) => s.rating).length >= 3
                    ? 'bg-yellow-50'
                    : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    averageRating >= 4.5 && completedSessions.filter((s) => s.rating).length >= 3
                      ? 'bg-yellow-200 text-yellow-700'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  ⭐
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Excellence</div>
                  <div className="text-xs text-muted-foreground">
                    Maintenez une note ≥ 4.5/5
                  </div>
                </div>
                {averageRating >= 4.5 && completedSessions.filter((s) => s.rating).length >= 3 && (
                  <Badge className="bg-yellow-600 text-white">✓</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/campaigns')}
              >
                <Package className="h-4 w-4 mr-2" />
                Parcourir les campagnes
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/wallet')}
              >
                <WalletIcon className="h-4 w-4 mr-2" />
                Gérer mon wallet
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/profile')}
              >
                <Star className="h-4 w-4 mr-2" />
                Modifier mon profil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
