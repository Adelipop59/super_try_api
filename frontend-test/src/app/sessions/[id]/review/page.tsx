'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { createReview } from '@/lib/api/reviews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Star, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await getSession(sessionId);
      setSession(sessionData);

      // Check if session is completed
      if (sessionData.status !== 'COMPLETED') {
        toast.error('Cette session n\'est pas encore terminée');
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

    if (rating === 0) {
      toast.error('Veuillez donner une note');
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        sessionId,
        campaignId: session!.campaignId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        isPublic,
      });

      toast.success('Avis publié avec succès !');
      router.push('/reviews');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`h-10 w-10 ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingLabel = (rating: number) => {
    const labels: Record<number, string> = {
      1: 'Très mauvais',
      2: 'Mauvais',
      3: 'Moyen',
      4: 'Bon',
      5: 'Excellent',
    };
    return labels[rating] || '';
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
          <h1 className="text-3xl font-bold mb-2">Laisser un avis</h1>
          <p className="text-muted-foreground">
            Partagez votre expérience avec cette campagne de test
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Main content - Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Votre avis</CardTitle>
              <CardDescription>
                Aidez les autres testeurs et le vendeur en partageant votre expérience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Rating */}
                <div className="space-y-3">
                  <Label>Note * <span className="text-sm text-muted-foreground">(obligatoire)</span></Label>
                  <div className="flex items-center gap-4">
                    {renderStars()}
                    {rating > 0 && (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {getRatingLabel(rating)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur les étoiles pour noter votre expérience
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Titre (optionnel)
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ex: Excellente expérience, produit de qualité"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/100 caractères
                  </p>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <Label htmlFor="comment">
                    Commentaire (optionnel)
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Décrivez votre expérience avec cette campagne de test : qualité du produit, communication avec le vendeur, etc."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={6}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {comment.length}/1000 caractères
                  </p>
                </div>

                {/* Public/Private */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <Label htmlFor="isPublic" className="text-base font-medium cursor-pointer">
                      Avis public
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPublic
                        ? 'Votre avis sera visible par tous les utilisateurs'
                        : 'Votre avis sera visible uniquement par le vendeur'}
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                {/* Guidelines */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Conseils pour un avis utile</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Soyez honnête et objectif</li>
                    <li>• Mentionnez les points positifs et négatifs</li>
                    <li>• Parlez de la qualité du produit et du service</li>
                    <li>• Évitez le langage inapproprié</li>
                  </ul>
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
                    disabled={submitting || rating === 0}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Publication...' : 'Publier l\'avis'}
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
              {session.completedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Terminée le</div>
                  <div className="font-medium text-sm">
                    {new Date(session.completedAt).toLocaleDateString('fr-FR', {
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
              <CardTitle className="text-lg">Pourquoi laisser un avis ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Aidez la communauté</p>
                  <p className="text-xs text-muted-foreground">
                    Votre avis aide les autres testeurs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Feedback au vendeur</p>
                  <p className="text-xs text-muted-foreground">
                    Le vendeur améliore ses produits
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Gagnez en crédibilité</p>
                  <p className="text-xs text-muted-foreground">
                    Augmentez vos chances d'être sélectionné
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
