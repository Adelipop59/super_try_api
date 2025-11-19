'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { getBonusTaskById, submitBonusTask, BonusTask } from '@/lib/api/bonusTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BonusTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const taskId = params.taskId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [task, setTask] = useState<BonusTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Submission form
  const [photoUrl, setPhotoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [sessionId, taskId]);

  const loadData = async () => {
    try {
      const [sessionData, taskData] = await Promise.all([
        getSession(sessionId),
        getBonusTaskById(taskId),
      ]);

      setSession(sessionData);
      setTask(taskData);

      // Pre-fill form if already submitted
      if (taskData.photoUrl) setPhotoUrl(taskData.photoUrl);
      if (taskData.videoUrl) setVideoUrl(taskData.videoUrl);
      if (taskData.externalLink) setExternalLink(taskData.externalLink);
      if (taskData.notes) setNotes(taskData.notes);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on task type
    if (task?.type === 'UNBOXING_PHOTO' && !photoUrl) {
      toast.error('Veuillez fournir l\'URL de la photo');
      return;
    }
    if (task?.type === 'UGC_VIDEO' && !videoUrl) {
      toast.error('Veuillez fournir l\'URL de la vidéo');
      return;
    }
    if (task?.type === 'EXTERNAL_REVIEW' && !externalLink) {
      toast.error('Veuillez fournir le lien vers l\'avis');
      return;
    }

    setSubmitting(true);
    try {
      await submitBonusTask(taskId, {
        photoUrl: photoUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        externalLink: externalLink.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success('Tâche soumise avec succès !');
      router.push(`/sessions/${sessionId}/bonus-tasks`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      REQUESTED: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-purple-100 text-purple-800',
      SUBMITTED: 'bg-orange-100 text-orange-800',
      VALIDATED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      REQUESTED: 'Nouvelle',
      ACCEPTED: 'Acceptée',
      SUBMITTED: 'Soumise',
      VALIDATED: 'Validée',
      REJECTED: 'Refusée',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      UNBOXING_PHOTO: 'Photo d\'unboxing',
      UGC_VIDEO: 'Vidéo UGC',
      EXTERNAL_REVIEW: 'Avis externe',
      TIP: 'Pourboire',
      CUSTOM: 'Personnalisé',
    };
    return labels[type] || type;
  };

  const getTaskInstructions = (type: string) => {
    const instructions: Record<string, string> = {
      UNBOXING_PHOTO: 'Prenez une photo de l\'ouverture du colis (unboxing) montrant le produit et son emballage. Téléchargez-la sur un service comme Imgur, Google Photos ou Dropbox et collez l\'URL ici.',
      UGC_VIDEO: 'Créez une vidéo montrant votre utilisation ou votre avis sur le produit (format UGC). Téléchargez-la sur YouTube, Vimeo ou un autre service et collez le lien ici.',
      EXTERNAL_REVIEW: 'Laissez un avis sur le produit sur une plateforme externe (Amazon, Google, Trustpilot, etc.) puis collez le lien vers votre avis ici.',
      TIP: 'Le vendeur vous offre un pourboire supplémentaire ! Aucune action requise de votre part.',
      CUSTOM: 'Suivez les instructions personnalisées du vendeur décrites ci-dessous.',
    };
    return instructions[type] || '';
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

  if (!task || !session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Tâche introuvable</h2>
        <Button onClick={() => router.push(`/sessions/${sessionId}/bonus-tasks`)}>
          Retour aux tâches bonus
        </Button>
      </div>
    );
  }

  const canSubmit = task.status === 'ACCEPTED';
  const isSubmitted = task.status === 'SUBMITTED';
  const isValidated = task.status === 'VALIDATED';
  const isRejected = task.status === 'REJECTED';

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/sessions/${sessionId}/bonus-tasks`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux tâches bonus
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
            <p className="text-muted-foreground">
              {getTaskTypeLabel(task.type)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600 mb-2">
              +{task.reward.toFixed(2)}€
            </div>
            {getStatusBadge(task.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task description */}
          <Card>
            <CardHeader>
              <CardTitle>Description de la tâche</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <p className="text-muted-foreground">{task.description}</p>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                <p className="text-sm text-blue-800">{getTaskInstructions(task.type)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Submission form */}
          {canSubmit && (
            <Card>
              <CardHeader>
                <CardTitle>Soumettre votre réalisation</CardTitle>
                <CardDescription>
                  Remplissez les informations requises pour cette tâche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Photo URL for UNBOXING_PHOTO */}
                  {task.type === 'UNBOXING_PHOTO' && (
                    <div className="space-y-2">
                      <Label htmlFor="photoUrl">
                        URL de la photo * <span className="text-sm text-muted-foreground">(obligatoire)</span>
                      </Label>
                      <Input
                        id="photoUrl"
                        type="url"
                        placeholder="https://..."
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Téléchargez votre photo sur Imgur, Google Photos, Dropbox, etc.
                      </p>
                    </div>
                  )}

                  {/* Video URL for UGC_VIDEO */}
                  {task.type === 'UGC_VIDEO' && (
                    <div className="space-y-2">
                      <Label htmlFor="videoUrl">
                        URL de la vidéo * <span className="text-sm text-muted-foreground">(obligatoire)</span>
                      </Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Lien vers YouTube, Vimeo, Dailymotion, etc.
                      </p>
                    </div>
                  )}

                  {/* External link for EXTERNAL_REVIEW */}
                  {task.type === 'EXTERNAL_REVIEW' && (
                    <div className="space-y-2">
                      <Label htmlFor="externalLink">
                        Lien vers l'avis * <span className="text-sm text-muted-foreground">(obligatoire)</span>
                      </Label>
                      <Input
                        id="externalLink"
                        type="url"
                        placeholder="https://..."
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Lien vers votre avis sur Amazon, Google, Trustpilot, etc.
                      </p>
                    </div>
                  )}

                  {/* For CUSTOM and TIP types */}
                  {(task.type === 'CUSTOM' || task.type === 'TIP') && (
                    <div className="space-y-2">
                      <Label htmlFor="photoUrl">Photo (optionnel)</Label>
                      <Input
                        id="photoUrl"
                        type="url"
                        placeholder="https://..."
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Notes (optional for all types) */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      Notes / Commentaires {task.type !== 'TIP' && '(optionnel)'}
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Ajoutez des détails ou commentaires supplémentaires..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    {submitting ? 'Envoi en cours...' : 'Soumettre la tâche'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Submitted status */}
          {isSubmitted && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-orange-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-orange-900 mb-1">
                      Tâche soumise - En attente de validation
                    </h3>
                    <p className="text-sm text-orange-800 mb-4">
                      Le vendeur va vérifier votre soumission. Vous serez notifié de sa décision.
                    </p>

                    {/* Show submitted content */}
                    <div className="space-y-2">
                      {task.photoUrl && (
                        <div>
                          <span className="text-xs font-medium text-orange-900">Photo :</span>
                          <a
                            href={task.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline ml-2"
                          >
                            Voir la photo
                          </a>
                        </div>
                      )}
                      {task.videoUrl && (
                        <div>
                          <span className="text-xs font-medium text-orange-900">Vidéo :</span>
                          <a
                            href={task.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline ml-2"
                          >
                            Voir la vidéo
                          </a>
                        </div>
                      )}
                      {task.externalLink && (
                        <div>
                          <span className="text-xs font-medium text-orange-900">Lien externe :</span>
                          <a
                            href={task.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline ml-2"
                          >
                            Voir l'avis
                          </a>
                        </div>
                      )}
                      {task.notes && (
                        <div>
                          <span className="text-xs font-medium text-orange-900">Notes :</span>
                          <p className="text-sm text-orange-800 mt-1">{task.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validated status */}
          {isValidated && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">
                      Tâche validée !
                    </h3>
                    <p className="text-sm text-green-800 mb-2">
                      Le vendeur a validé votre soumission. La récompense de{' '}
                      <strong>{task.reward.toFixed(2)}€</strong> a été créditée sur votre wallet.
                    </p>
                    {task.validatedAt && (
                      <p className="text-xs text-green-700">
                        Validée le {new Date(task.validatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejected status */}
          {isRejected && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Tâche refusée
                    </h3>
                    <p className="text-sm text-red-800 mb-3">
                      Le vendeur a refusé votre soumission.
                    </p>

                    {task.rejectionReason && (
                      <div className="p-3 bg-white border border-red-200 rounded mb-3">
                        <p className="text-sm font-medium text-red-900 mb-1">
                          Raison du refus :
                        </p>
                        <p className="text-sm text-red-700">{task.rejectionReason}</p>
                      </div>
                    )}

                    <p className="text-xs text-red-700">
                      Contactez le vendeur pour plus de détails ou pour clarifier les attentes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Reward info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Récompense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  +{task.reward.toFixed(2)}€
                </div>
                <p className="text-sm text-muted-foreground">
                  {isValidated ? 'Créditée sur votre wallet' : 'Sera créditée après validation'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Task info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium">{getTaskTypeLabel(task.type)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Statut</div>
                <div className="mt-1">{getStatusBadge(task.status)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Créée le</div>
                <div className="font-medium">
                  {new Date(task.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              {task.submittedAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Soumise le</div>
                  <div className="font-medium">
                    {new Date(task.submittedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Besoin d'aide ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Si vous avez des questions sur cette tâche, contactez le vendeur via la messagerie.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/sessions/${sessionId}/messages`)}
              >
                Contacter le vendeur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
