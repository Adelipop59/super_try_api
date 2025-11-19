'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { createBonusTask, BonusTaskType } from '@/lib/api/bonusTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

const TASK_TYPES = [
  {
    value: 'UNBOXING_PHOTO' as BonusTaskType,
    label: 'Photo d\'unboxing',
    description: 'Photo du déballage du produit',
  },
  {
    value: 'UGC_VIDEO' as BonusTaskType,
    label: 'Vidéo UGC',
    description: 'Vidéo de contenu utilisateur',
  },
  {
    value: 'EXTERNAL_REVIEW' as BonusTaskType,
    label: 'Avis externe',
    description: 'Avis sur une plateforme tierce (Amazon, Google, etc.)',
  },
  {
    value: 'TIP' as BonusTaskType,
    label: 'Pourboire',
    description: 'Récompense supplémentaire pour bon travail',
  },
  {
    value: 'CUSTOM' as BonusTaskType,
    label: 'Personnalisé',
    description: 'Tâche personnalisée',
  },
];

export default function NewBonusTaskPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [type, setType] = useState<BonusTaskType>('UNBOXING_PHOTO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await getSession(sessionId);
      setSession(sessionData);
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    if (!reward || parseFloat(reward) <= 0) {
      toast.error('La récompense doit être supérieure à 0');
      return;
    }

    setSubmitting(true);
    try {
      await createBonusTask(sessionId, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        reward: parseFloat(reward),
      });

      toast.success('Tâche bonus créée avec succès');
      router.push(`/pro/sessions/${sessionId}/bonus-tasks`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTaskType = TASK_TYPES.find(t => t.value === type);

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
        <Button onClick={() => router.push('/pro/sessions')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push(`/pro/sessions/${sessionId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour à la session
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Créer une tâche bonus</CardTitle>
          <p className="text-sm text-muted-foreground">
            Proposez une tâche supplémentaire au testeur en échange d'une récompense
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de tâche *</Label>
              <Select value={type} onValueChange={(value: BonusTaskType) => setType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((taskType) => (
                    <SelectItem key={taskType.value} value={taskType.value}>
                      <div>
                        <div className="font-medium">{taskType.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {taskType.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTaskType && (
                <p className="text-sm text-muted-foreground">
                  {selectedTaskType.description}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Prenez une photo du produit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez en détail ce que le testeur doit faire..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Soyez précis sur ce que vous attendez du testeur
              </p>
            </div>

            {/* Reward */}
            <div className="space-y-2">
              <Label htmlFor="reward">Récompense (€) *</Label>
              <Input
                id="reward"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5.00"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Montant qui sera crédité au testeur après validation
              </p>
            </div>

            {/* Example tasks based on type */}
            {type === 'UNBOXING_PHOTO' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">Exemples de consignes :</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Photo claire du produit dans son emballage d'origine</li>
                    <li>Photo du produit pendant l'ouverture</li>
                    <li>Fond neutre et bonne luminosité</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            {type === 'UGC_VIDEO' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">Exemples de consignes :</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Vidéo de 30-60 secondes</li>
                    <li>Montrer le produit en utilisation</li>
                    <li>Format vertical (9:16) pour réseaux sociaux</li>
                    <li>Bon éclairage et son clair</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            {type === 'EXTERNAL_REVIEW' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">Exemples de consignes :</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Avis détaillé (100+ mots)</li>
                    <li>Note 4 ou 5 étoiles si satisfait</li>
                    <li>Inclure une photo du produit</li>
                    <li>Fournir le lien vers l'avis publié</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/pro/sessions/${sessionId}`)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {submitting ? 'Création...' : 'Créer la tâche'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
