'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyReviews, Review } from '@/lib/api/reviews';
import { getSessions, Session } from '@/lib/api/sessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Plus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reviewsData, sessionsData] = await Promise.all([
        getMyReviews(),
        getSessions(),
      ]);

      setReviews(reviewsData);

      // Filter completed sessions without reviews
      const completedWithoutReview = sessionsData.filter(
        (session) =>
          session.status === 'COMPLETED' &&
          !reviewsData.some((review) => review.sessionId === session.id)
      );
      setCompletedSessions(completedWithoutReview);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mes avis</h1>
        <p className="text-muted-foreground">
          Avis que j'ai laissés sur les campagnes de test
        </p>
      </div>

      {/* Pending reviews */}
      {completedSessions.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              Sessions en attente d'avis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center p-3 bg-white rounded-lg border"
                >
                  <div>
                    <div className="font-medium">Campagne: {session.campaignId.substring(0, 20)}...</div>
                    <div className="text-sm text-muted-foreground">
                      Complétée le {new Date(session.completedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/sessions/${session.id}?createReview=true`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Laisser un avis
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      <Card>
        <CardHeader>
          <CardTitle>Mes avis publiés ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun avis</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore laissé d'avis
              </p>
              {completedSessions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Consultez vos sessions complétées ci-dessus pour laisser un avis
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {renderStars(review.rating)}
                          <Badge className={review.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {review.isPublic ? 'Public' : 'Privé'}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground mb-1">
                          Campagne: {review.campaignId.substring(0, 20)}...
                        </div>

                        {review.title && (
                          <h3 className="font-semibold mb-2">{review.title}</h3>
                        )}

                        {review.comment && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {review.comment}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Publié le {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          {review.updatedAt !== review.createdAt && (
                            <span>
                              Modifié le {new Date(review.updatedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seller response */}
                    {review.sellerResponse && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-l-blue-500">
                        <div className="text-sm font-medium text-blue-900 mb-1">
                          Réponse du vendeur
                        </div>
                        <p className="text-sm text-gray-700">{review.sellerResponse}</p>
                        {review.sellerResponseAt && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(review.sellerResponseAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
