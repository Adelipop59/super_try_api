'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { createDispute } from '@/lib/api/disputes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

type DisputeCategory = 'PRODUCT_ISSUE' | 'PAYMENT_ISSUE' | 'COMMUNICATION_ISSUE' | 'OTHER';

export default function CreateDisputePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [category, setCategory] = useState<DisputeCategory>('PRODUCT_ISSUE');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await getSession(sessionId);
      setSession(sessionData);

      // Check if session can have a dispute
      if (sessionData.status === 'PENDING' || sessionData.status === 'REJECTED') {
        toast.error('Impossible de créer un litige pour cette session');
        router.push(`/sessions/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Veuillez décrire le problème');
      return;
    }

    if (description.trim().length < 20) {
      toast.error('La description doit contenir au moins 20 caractères');
      return;
    }

    setSubmitting(true);
    try {
      await createDispute({
        sessionId,
        category,
        description: description.trim(),
      });

      toast.success('Litige créé avec succès');
      router.push('/disputes');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du litige');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: DisputeCategory) => {
    const labels: Record<DisputeCategory, string> = {
      PRODUCT_ISSUE: 'Problème avec le produit',
      PAYMENT_ISSUE: 'Problème de paiement',
      COMMUNICATION_ISSUE: 'Problème de communication',
      OTHER: 'Autre',
    };
    return labels[cat];
  };

  const getCategoryDescription = (cat: DisputeCategory) => {
    const descriptions: Record<DisputeCategory, string> = {
      PRODUCT_ISSUE: 'Le produit reçu est défectueux, endommagé, différent de la description, ou n\'est jamais arrivé.',
      PAYMENT_ISSUE: 'Problème avec le remboursement du produit, des frais de livraison, ou de la récompense.',
      COMMUNICATION_ISSUE: 'Le vendeur ne répond pas, est irrespectueux, ou les instructions sont peu claires.',
      OTHER: 'Tout autre problème non mentionné ci-dessus.',
    };
    return descriptions[cat];
  };

  const getCategoryExamples = (cat: DisputeCategory) => {
    const examples: Record<DisputeCategory, string[]> = {
      PRODUCT_ISSUE: [
        'Le produit reçu est cassé ou défectueux',
        'Le produit ne correspond pas à la description',
        'Le colis n\'est jamais arrivé',
        'Le produit est de mauvaise qualité',
      ],
      PAYMENT_ISSUE: [
        'Le remboursement n\'a pas été effectué',
        'Le montant remboursé est incorrect',
        'La récompense n\'a pas été créditée',
        'Les frais de livraison ne sont pas remboursés',
      ],
      COMMUNICATION_ISSUE: [
        'Le vendeur ne répond pas aux messages',
        'Les instructions de test sont peu claires',
        'Le vendeur est irrespectueux',
        'Le vendeur modifie les conditions après acceptation',
      ],
      OTHER: [
        'Problème avec les tâches bonus',
        'Demande de validation non traitée',
        'Autre situation nécessitant intervention',
      ],
    };
    return examples[cat];
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

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Session introuvable</h2>
        <Button onClick={() => router.push('/sessions')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/sessions/${sessionId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la session
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            Créer un litige
          </h1>
          <p className="text-muted-foreground">
            Signalez un problème avec cette session de test
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Main content - Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Détails du litige</CardTitle>
              <CardDescription>
                Décrivez précisément le problème rencontré
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Catégorie du problème * <span className="text-sm text-muted-foreground">(obligatoire)</span>
                  </Label>
                  <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCT_ISSUE">
                        {getCategoryLabel('PRODUCT_ISSUE')}
                      </SelectItem>
                      <SelectItem value="PAYMENT_ISSUE">
                        {getCategoryLabel('PAYMENT_ISSUE')}
                      </SelectItem>
                      <SelectItem value="COMMUNICATION_ISSUE">
                        {getCategoryLabel('COMMUNICATION_ISSUE')}
                      </SelectItem>
                      <SelectItem value="OTHER">
                        {getCategoryLabel('OTHER')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryDescription(category)}
                  </p>
                </div>

                {/* Examples */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Exemples pour "{getCategoryLabel(category)}"
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {getCategoryExamples(category).map((example, index) => (
                      <li key={index}>• {example}</li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description du problème * <span className="text-sm text-muted-foreground">(obligatoire, min. 20 caractères)</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez en détail le problème rencontré. Soyez précis et mentionnez tous les éléments pertinents (dates, montants, messages échangés, etc.)."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    required
                    className={description.length > 0 && description.length < 20 ? 'border-red-300' : ''}
                  />
                  <div className="flex justify-between items-center">
                    <p className={`text-xs ${description.length < 20 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {description.length < 20 && description.length > 0
                        ? `Il manque ${20 - description.length} caractères`
                        : `${description.length}/1000 caractères`}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Un administrateur examinera votre litige</li>
                        <li>• Soyez honnête et objectif dans votre description</li>
                        <li>• Fournissez des preuves si possible (captures d'écran, photos, etc.)</li>
                        <li>• La résolution peut prendre 3-5 jours ouvrés</li>
                        <li>• Les litiges abusifs peuvent entraîner la suspension du compte</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    Avant de créer un litige
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ Avez-vous contacté le vendeur via la messagerie ?</li>
                    <li>✓ Avez-vous attendu une réponse (24-48h) ?</li>
                    <li>✓ Le problème ne peut-il vraiment pas être résolu directement ?</li>
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => router.push(`/sessions/${sessionId}/messages`)}
                  >
                    Contacter le vendeur d'abord
                  </Button>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/sessions/${sessionId}`)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || description.trim().length < 20}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Création...' : 'Créer le litige'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Session info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session concernée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Campagne</div>
                <div className="font-medium text-sm break-words">
                  {session.campaignId.substring(0, 40)}...
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Produit</div>
                <div className="font-medium text-sm break-words">
                  {session.productId.substring(0, 40)}...
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Statut</div>
                <div className="font-medium text-sm">{session.status}</div>
              </div>
              {session.acceptedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Acceptée le</div>
                  <div className="font-medium text-sm">
                    {new Date(session.acceptedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processus de résolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Soumission</p>
                  <p className="text-xs text-muted-foreground">
                    Vous créez le litige avec tous les détails
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Examen</p>
                  <p className="text-xs text-muted-foreground">
                    Un admin examine le litige et contacte les parties
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Résolution</p>
                  <p className="text-xs text-muted-foreground">
                    L'admin prend une décision et applique la solution
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Besoin d'aide ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Consultez notre centre d'aide pour plus d'informations sur la création de litiges.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/help')}
              >
                Centre d'aide
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
