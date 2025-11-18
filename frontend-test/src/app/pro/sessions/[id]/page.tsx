'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getSession,
  acceptSession,
  rejectSession,
  validatePurchase,
  validateTest,
  Session,
} from '@/lib/api/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SessionTimeline } from '@/components/SessionTimeline';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  Star,
  User,
  Package,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ProSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [rejectReason, setRejectReason] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [acceptMessage, setAcceptMessage] = useState('');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Impossible de charger la session');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await acceptSession(sessionId, {
        message: acceptMessage || undefined,
      });
      toast.success('Candidature acceptée !');
      loadSession();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'acceptation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    setSubmitting(true);
    try {
      await rejectSession(sessionId, { reason: rejectReason });
      toast.success('Candidature refusée');
      router.push('/pro/sessions');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidatePurchase = async () => {
    setSubmitting(true);
    try {
      await validatePurchase(sessionId);
      toast.success('Achat validé !');
      loadSession();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateTest = async () => {
    if (rating < 1 || rating > 5) {
      toast.error('Note invalide (1-5)');
      return;
    }

    setSubmitting(true);
    try {
      await validateTest(sessionId, {
        rating,
        feedback: feedback || undefined,
      });
      toast.success('Test validé avec succès !');
      loadSession();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
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

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Session introuvable</h2>
        <Button onClick={() => router.push('/pro/sessions')}>Retour aux sessions</Button>
      </div>
    );
  }

  const mainOffer = session.campaign?.offers?.[0];
  const tester = session.tester;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{session.campaign?.title}</h1>
            <p className="text-muted-foreground">Session ID: {session.id.slice(0, 8)}</p>
          </div>
          <Badge
            className={
              session.status === 'COMPLETED'
                ? 'bg-green-100 text-green-800'
                : session.status === 'REJECTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }
          >
            {session.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tester info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations du testeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>
                    {tester?.firstName?.[0]}{tester?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {tester?.firstName} {tester?.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tester?.email}</p>

                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {tester?.completedSessions || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Tests complétés</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {tester?.averageRating?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Note moyenne</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {tester?.isVerified ? '✓' : '−'}
                      </div>
                      <div className="text-xs text-muted-foreground">Vérifié</div>
                    </div>
                  </div>
                </div>
              </div>

              {session.applicationMessage && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h4 className="font-semibold mb-2">Message de candidature</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                      {session.applicationMessage}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* PENDING status - Accept/Reject */}
          {session.status === 'PENDING' && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-900">
                  <AlertCircle className="h-5 w-5" />
                  Candidature en attente
                </CardTitle>
                <CardDescription>
                  Examinez le profil du testeur et acceptez ou refusez sa candidature
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Message d'acceptation (optionnel)</Label>
                  <Textarea
                    value={acceptMessage}
                    onChange={(e) => setAcceptMessage(e.target.value)}
                    placeholder="Bienvenue ! Voici les instructions..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {submitting ? 'Acceptation...' : 'Accepter la candidature'}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Raison du refus *</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous refusez cette candidature..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleReject}
                  disabled={submitting || !rejectReason.trim()}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Refus...' : 'Refuser la candidature'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ACCEPTED status - Validate purchase */}
          {session.status === 'ACCEPTED' && session.purchaseProofUrl && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <CheckCircle className="h-5 w-5" />
                  Preuve d'achat soumise
                </CardTitle>
                <CardDescription>
                  Vérifiez la preuve d'achat et validez-la
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Preuve d'achat</h4>
                  <a
                    href={session.purchaseProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    Voir la preuve d'achat
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {session.validatedProductPrice && (
                  <div>
                    <h4 className="font-semibold mb-2">Prix validé par le testeur</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {session.validatedProductPrice}€
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleValidatePurchase}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Validation...' : 'Valider l\'achat'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* IN_PROGRESS status */}
          {session.status === 'IN_PROGRESS' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-900">Test en cours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-800">
                  Le testeur est en train de compléter les procédures de test. Vous recevrez une notification lorsqu'il soumettra le test.
                </p>
              </CardContent>
            </Card>
          )}

          {/* SUBMITTED status - Validate test */}
          {session.status === 'SUBMITTED' && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <CheckCircle className="h-5 w-5" />
                  Test soumis pour validation
                </CardTitle>
                <CardDescription>
                  Examinez le travail du testeur et validez le test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Date de soumission</h4>
                  <p className="text-sm text-muted-foreground">
                    {session.submittedAt &&
                      new Date(session.submittedAt).toLocaleString('fr-FR')}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Note du testeur (1-5) *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      className="w-24"
                    />
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i + 1)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              i < rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Commentaire (optionnel)</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Votre retour sur le travail du testeur..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleValidateTest}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? 'Validation...' : 'Valider le test'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* COMPLETED status */}
          {session.status === 'COMPLETED' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Test complété
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-green-800">
                  Ce test a été validé avec succès. Le testeur a été crédité du bonus.
                </p>

                {session.rating && (
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">Votre note :</h4>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < session.rating!
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardContent className="pt-6">
              <SessionTimeline session={session} />
            </CardContent>
          </Card>

          {/* Product info */}
          {mainOffer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{mainOffer.product?.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {mainOffer.product?.description}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix attendu:</span>
                      <span className="font-semibold">{mainOffer.expectedPrice}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison:</span>
                      <span className="font-semibold">{mainOffer.shippingCost}€</span>
                    </div>
                    {mainOffer.bonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bonus:</span>
                        <span className="font-semibold text-green-600">+{mainOffer.bonus}€</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/pro/sessions/${sessionId}/messages`}>
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={() => router.push('/pro/sessions')}
                className="w-full"
              >
                Retour aux sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
