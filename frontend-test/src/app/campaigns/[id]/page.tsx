'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCampaign, Campaign } from '@/lib/api/campaigns';
import { getProcedures, Procedure } from '@/lib/api/procedures';
import { getDistributions, Distribution } from '@/lib/api/distributions';
import { applyToSession } from '@/lib/api/sessions';
import { getCampaignReviews, Review } from '@/lib/api/reviews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Users, Star, Package, Euro, Truck, Gift, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      const [campaignData, proceduresData, distributionsData, reviewsData] = await Promise.all([
        getCampaign(campaignId),
        getProcedures(campaignId),
        getDistributions(campaignId),
        getCampaignReviews(campaignId),
      ]);

      setCampaign(campaignData);
      setProcedures(proceduresData);
      setDistributions(distributionsData);
      setReviews(reviewsData.filter(r => r.isPublic));
    } catch (error) {
      console.error('Failed to load campaign:', error);
      toast.error('Impossible de charger la campagne');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'USER') {
      toast.error('Seuls les testeurs peuvent postuler');
      return;
    }

    setApplying(true);
    try {
      await applyToSession({
        campaignId,
        applicationMessage: applicationMessage || undefined,
      });

      toast.success('Votre candidature a été envoyée !');
      router.push('/sessions');
    } catch (error: any) {
      console.error('Failed to apply:', error);
      toast.error(error.message || 'Impossible de postuler');
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      MONDAY: 'Lundi',
      TUESDAY: 'Mardi',
      WEDNESDAY: 'Mercredi',
      THURSDAY: 'Jeudi',
      FRIDAY: 'Vendredi',
      SATURDAY: 'Samedi',
      SUNDAY: 'Dimanche',
    };
    return days[day] || day;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Campagne introuvable</h2>
        <Button onClick={() => router.push('/campaigns')}>Retour aux campagnes</Button>
      </div>
    );
  }

  const mainOffer = campaign.offers?.[0];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{campaign.title}</h1>
            <p className="text-lg text-muted-foreground">{campaign.description}</p>
          </div>
          <Badge className={campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
            {campaign.status === 'ACTIVE' ? 'Active' : campaign.status}
          </Badge>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Début</div>
                  <div className="font-semibold">{formatDate(campaign.startDate)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Places</div>
                  <div className="font-semibold">{campaign.availableSlots}/{campaign.totalSlots}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {mainOffer && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Prix produit</div>
                      <div className="font-semibold">{mainOffer.expectedPrice}€</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-xs text-muted-foreground">Bonus</div>
                      <div className="font-semibold text-green-600">+{mainOffer.bonus}€</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="procedures">Procédures</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Product info */}
          {mainOffer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Produit à tester
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{mainOffer.product?.name}</h3>
                  <p className="text-muted-foreground">{mainOffer.product?.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Prix attendu</div>
                    <div className="font-semibold">{mainOffer.expectedPrice}€</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Livraison</div>
                    <div className="font-semibold">{mainOffer.shippingCost}€</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Remboursement produit</div>
                    <div className="font-semibold text-blue-600">{mainOffer.reimbursedPrice}€</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Remboursement livraison</div>
                    <div className="font-semibold text-blue-600">{mainOffer.reimbursedShipping}€</div>
                  </div>
                </div>

                {mainOffer.bonus > 0 && (
                  <>
                    <Separator />
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Bonus testeur</span>
                      </div>
                      <p className="text-green-700">
                        Vous recevrez un bonus de <span className="font-bold">{mainOffer.bonus}€</span> une fois le test validé !
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Criteria */}
          {campaign.criteria && (
            <Card>
              <CardHeader>
                <CardTitle>Critères de sélection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaign.criteria.minAge && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Âge minimum : {campaign.criteria.minAge} ans</span>
                  </div>
                )}
                {campaign.criteria.maxAge && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Âge maximum : {campaign.criteria.maxAge} ans</span>
                  </div>
                )}
                {campaign.criteria.minRating && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Note minimale : {campaign.criteria.minRating}/5</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4 mt-6">
          {procedures.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune procédure définie pour cette campagne
              </CardContent>
            </Card>
          ) : (
            procedures.map((procedure, index) => (
              <Card key={procedure.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">
                      {index + 1}
                    </span>
                    {procedure.title}
                    {procedure.isRequired && (
                      <Badge variant="destructive" className="ml-2">Requis</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                {procedure.description && (
                  <CardContent>
                    <p className="text-muted-foreground">{procedure.description}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des tests</CardTitle>
              <CardDescription>
                Nombre de places disponibles par jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distributions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucune distribution définie
                </p>
              ) : (
                <div className="space-y-3">
                  {distributions
                    .filter(d => d.isActive)
                    .map(dist => (
                      <div key={dist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            {dist.type === 'RECURRING' ? (
                              <span className="font-medium">{getDayName(dist.dayOfWeek!)}</span>
                            ) : (
                              <span className="font-medium">
                                {dist.specificDate && formatDate(dist.specificDate)}
                              </span>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {dist.type === 'RECURRING' ? 'Récurrent' : 'Date spécifique'}
                            </div>
                          </div>
                        </div>
                        <Badge>{dist.maxUnits} places</Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun avis pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold">{averageRating.toFixed(1)}</div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(averageRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reviews.length} avis
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {reviews.map(review => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {review.tester?.firstName} {review.tester?.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  {review.comment && (
                    <CardContent>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Application section */}
      {user && user.role === 'USER' && campaign.status === 'ACTIVE' && campaign.availableSlots > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Postuler à cette campagne</CardTitle>
            <CardDescription>
              Expliquez pourquoi vous souhaitez participer à ce test (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Votre message de motivation..."
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleApply}
              disabled={applying}
              className="w-full"
              size="lg"
            >
              {applying ? 'Envoi en cours...' : 'Postuler maintenant'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!user && campaign.status === 'ACTIVE' && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Connectez-vous pour postuler</h3>
            <p className="text-muted-foreground mb-4">
              Créez un compte ou connectez-vous pour participer à cette campagne
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/login')} variant="outline">
                Se connecter
              </Button>
              <Button onClick={() => router.push('/signup')}>
                Créer un compte
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
