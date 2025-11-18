'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getSession,
  Session,
  submitPurchase,
  validatePrice,
  submitTest,
  cancelSession,
  disputeSession,
} from '@/lib/api/sessions';
import { getProcedures, Procedure } from '@/lib/api/procedures';
import { getSteps, Step } from '@/lib/api/steps';
import { getBonusTasks, BonusTask } from '@/lib/api/bonusTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SessionTimeline } from '@/components/SessionTimeline';
import { AlertCircle, Upload, CheckCircle2, MessageSquare, Gift, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [allSteps, setAllSteps] = useState<Step[]>([]);
  const [bonusTasks, setBonusTasks] = useState<BonusTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [purchaseProofUrl, setPurchaseProofUrl] = useState('');
  const [validatedPrice, setValidatedPrice] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const sessionData = await getSession(sessionId);
      setSession(sessionData);

      if (sessionData.campaignId) {
        const proceduresData = await getProcedures(sessionData.campaignId);
        setProcedures(proceduresData);

        // Load all steps for all procedures
        const stepsPromises = proceduresData.map(p => getSteps(p.id));
        const stepsArrays = await Promise.all(stepsPromises);
        const flatSteps = stepsArrays.flat();
        setAllSteps(flatSteps);
      }

      // Load bonus tasks
      const bonusData = await getBonusTasks(sessionId);
      setBonusTasks(bonusData);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Impossible de charger la session');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPurchase = async () => {
    if (!purchaseProofUrl.trim()) {
      toast.error('Veuillez fournir une preuve d\'achat');
      return;
    }

    setSubmitting(true);
    try {
      await submitPurchase(sessionId, { purchaseProofUrl });
      toast.success('Preuve d\'achat soumise !');
      loadSessionData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidatePrice = async () => {
    const price = parseFloat(validatedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }

    setSubmitting(true);
    try {
      await validatePrice(sessionId, { validatedProductPrice: price });
      toast.success('Prix validé !');
      loadSessionData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTest = async () => {
    setSubmitting(true);
    try {
      await submitTest(sessionId, { completionNotes: completionNotes || undefined });
      toast.success('Test soumis pour validation !');
      loadSessionData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette session ?')) {
      return;
    }

    setSubmitting(true);
    try {
      await cancelSession(sessionId);
      toast.success('Session annulée');
      router.push('/sessions');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Veuillez expliquer le problème');
      return;
    }

    setSubmitting(true);
    try {
      await disputeSession(sessionId, disputeReason);
      toast.success('Litige créé. Notre équipe va examiner la situation.');
      loadSessionData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du litige');
    } finally {
      setSubmitting(false);
      setDisputeReason('');
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
        <Button onClick={() => router.push('/sessions')}>Retour aux sessions</Button>
      </div>
    );
  }

  const mainOffer = session.campaign?.offers?.[0];

  return (
    <div className="p-8 max-w-5xl mx-auto">
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
                : session.status === 'REJECTED' || session.status === 'CANCELLED'
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
          {/* PENDING status */}
          {session.status === 'PENDING' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-900">
                  <AlertCircle className="h-5 w-5" />
                  En attente de validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-800">
                  Votre candidature a été envoyée. Le vendeur examinera votre profil et vous recevrez une notification de sa décision.
                </p>
                {session.applicationMessage && (
                  <div className="mt-4 p-3 bg-white rounded border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-900 mb-1">Votre message:</p>
                    <p className="text-sm text-yellow-800">{session.applicationMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ACCEPTED status - Submit purchase */}
          {session.status === 'ACCEPTED' && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Étape 1: Soumettre la preuve d'achat
                </CardTitle>
                <CardDescription>
                  Achetez le produit et fournissez une preuve d'achat (capture d'écran, facture, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mainOffer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Produit à acheter:</h4>
                    <p className="text-sm mb-2">{mainOffer.product?.name}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Prix attendu:</span>
                        <span className="font-semibold">{mainOffer.expectedPrice}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Livraison:</span>
                        <span className="font-semibold">{mainOffer.shippingCost}€</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">URL de la preuve d'achat</label>
                  <Input
                    placeholder="https://example.com/receipt.jpg"
                    value={purchaseProofUrl}
                    onChange={(e) => setPurchaseProofUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uploadez votre preuve d'achat sur un service comme Imgur puis collez le lien ici
                  </p>
                </div>

                <Button
                  onClick={handleSubmitPurchase}
                  disabled={submitting || !purchaseProofUrl.trim()}
                  className="w-full"
                >
                  {submitting ? 'Envoi...' : 'Soumettre la preuve d\'achat'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* IN_PROGRESS status - Complete test steps */}
          {session.status === 'IN_PROGRESS' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Achat validé - Complétez le test
                  </CardTitle>
                  <CardDescription>
                    Suivez les procédures ci-dessous pour compléter votre test
                  </CardDescription>
                </CardHeader>
              </Card>

              {procedures.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Procédures à suivre</h3>
                  {procedures.map((procedure, index) => {
                    const procedureSteps = allSteps.filter(s => s.procedureId === procedure.id);

                    return (
                      <Card key={procedure.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                              {index + 1}
                            </span>
                            {procedure.title}
                            {procedure.isRequired && (
                              <Badge variant="destructive" className="text-xs">Requis</Badge>
                            )}
                          </CardTitle>
                          {procedure.description && (
                            <CardDescription>{procedure.description}</CardDescription>
                          )}
                        </CardHeader>
                        {procedureSteps.length > 0 && (
                          <CardContent>
                            <div className="space-y-3">
                              {procedureSteps.map((step, stepIndex) => (
                                <div key={step.id} className="border rounded-lg p-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {stepIndex + 1}.
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium">{step.title}</div>
                                      {step.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {step.description}
                                        </p>
                                      )}
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        {step.type}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Soumettre le test complet</CardTitle>
                  <CardDescription>
                    Une fois toutes les étapes réalisées, soumettez votre test pour validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes de complétion (optionnel)</label>
                    <Textarea
                      placeholder="Ajoutez des notes ou commentaires sur votre expérience..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSubmitTest}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? 'Envoi...' : 'Soumettre le test pour validation'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* SUBMITTED status */}
          {session.status === 'SUBMITTED' && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <CheckCircle2 className="h-5 w-5" />
                  Test soumis pour validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-800">
                  Votre test a été soumis avec succès. Le vendeur va examiner votre travail et le valider prochainement.
                  Vous recevrez une notification une fois le test validé.
                </p>
              </CardContent>
            </Card>
          )}

          {/* COMPLETED status */}
          {session.status === 'COMPLETED' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle2 className="h-5 w-5" />
                  Test complété !
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-green-800">
                  Félicitations ! Votre test a été validé par le vendeur. Votre wallet a été crédité.
                </p>
                {session.rating && (
                  <div>
                    <p className="text-sm font-medium text-green-900 mb-2">Note du vendeur:</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < session.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Separator />
                <Link href="/reviews">
                  <Button variant="outline" className="w-full">
                    Laisser un avis sur cette campagne
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* REJECTED/CANCELLED status */}
          {(session.status === 'REJECTED' || session.status === 'CANCELLED') && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <XCircle className="h-5 w-5" />
                  {session.status === 'REJECTED' ? 'Candidature refusée' : 'Session annulée'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-800">
                  {session.status === 'REJECTED'
                    ? 'Votre candidature n\'a pas été retenue pour cette campagne.'
                    : 'Cette session a été annulée.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bonus tasks */}
          {bonusTasks.length > 0 && session.status !== 'REJECTED' && session.status !== 'CANCELLED' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Tâches bonus ({bonusTasks.length})
                </CardTitle>
                <CardDescription>
                  Gagnez des récompenses supplémentaires en complétant ces tâches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {bonusTasks.map(task => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{task.title}</h4>
                        <Badge variant="outline" className="text-xs mt-1">{task.type}</Badge>
                      </div>
                      <Badge className="bg-purple-100 text-purple-900">+{task.reward}€</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    <Badge>{task.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Dispute section */}
          {!['COMPLETED', 'REJECTED', 'CANCELLED', 'DISPUTED'].includes(session.status) && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900 text-base">Signaler un problème</CardTitle>
                <CardDescription>
                  Si vous rencontrez un problème avec cette session, créez un litige
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Décrivez le problème rencontré..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                />
                <Button
                  variant="destructive"
                  onClick={handleDispute}
                  disabled={submitting || !disputeReason.trim()}
                  className="w-full"
                >
                  Créer un litige
                </Button>
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
                <CardTitle className="text-base">Produit</CardTitle>
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
                      <span className="text-muted-foreground">Prix:</span>
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
              <Link href={`/sessions/${sessionId}/messages`}>
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </Link>

              {session.status === 'PENDING' && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="w-full"
                >
                  Annuler la candidature
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
