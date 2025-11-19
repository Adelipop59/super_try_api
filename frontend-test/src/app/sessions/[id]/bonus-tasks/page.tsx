'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { getBonusTasks, acceptBonusTask, BonusTask } from '@/lib/api/bonusTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function UserBonusTasksPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [bonusTasks, setBonusTasks] = useState<BonusTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      const [sessionData, tasksData] = await Promise.all([
        getSession(sessionId),
        getBonusTasks(sessionId),
      ]);

      setSession(sessionData);
      setBonusTasks(tasksData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (taskId: string) => {
    try {
      await acceptBonusTask(taskId);
      toast.success('Tâche bonus acceptée !');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'acceptation');
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

  const requestedTasks = bonusTasks.filter(t => t.status === 'REQUESTED');
  const acceptedTasks = bonusTasks.filter(t => t.status === 'ACCEPTED');
  const submittedTasks = bonusTasks.filter(t => t.status === 'SUBMITTED');
  const validatedTasks = bonusTasks.filter(t => t.status === 'VALIDATED');
  const rejectedTasks = bonusTasks.filter(t => t.status === 'REJECTED');

  const totalEarned = validatedTasks.reduce((sum, task) => sum + task.reward, 0);
  const potentialEarnings = [...requestedTasks, ...acceptedTasks, ...submittedTasks].reduce(
    (sum, task) => sum + task.reward,
    0
  );

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

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tâches bonus</h1>
            <p className="text-muted-foreground">
              Missions supplémentaires pour gagner plus de récompenses
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Déjà gagné
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalEarned.toFixed(2)}€</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {potentialEarnings.toFixed(2)}€
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total possible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {(totalEarned + potentialEarnings).toFixed(2)}€
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList>
          <TabsTrigger value="available">
            Disponibles ({requestedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            À faire ({acceptedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Soumises ({submittedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validées ({validatedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Refusées ({rejectedTasks.length})
          </TabsTrigger>
        </TabsList>

        {/* Available Tab */}
        <TabsContent value="available" className="mt-6">
          <div className="space-y-4">
            {requestedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune tâche disponible</h3>
                  <p className="text-muted-foreground">
                    Le vendeur n'a pas encore proposé de tâches bonus
                  </p>
                </CardContent>
              </Card>
            ) : (
              requestedTasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{getTaskTypeLabel(task.type)}</Badge>
                          <span className="text-2xl font-bold text-green-600">
                            +{task.reward.toFixed(2)}€
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(task.id)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepter cette tâche
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/sessions/${sessionId}/bonus-tasks/${task.id}`)}
                      >
                        Voir détails
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Accepted Tab */}
        <TabsContent value="accepted" className="mt-6">
          <div className="space-y-4">
            {acceptedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche en cours</p>
                </CardContent>
              </Card>
            ) : (
              acceptedTasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{getTaskTypeLabel(task.type)}</Badge>
                          <span className="text-xl font-bold text-green-600">
                            {task.reward.toFixed(2)}€
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {task.description}
                          </p>
                        )}

                        <Button
                          onClick={() => router.push(`/sessions/${sessionId}/bonus-tasks/${task.id}`)}
                        >
                          Soumettre ma réalisation
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Submitted Tab */}
        <TabsContent value="submitted" className="mt-6">
          <div className="space-y-4">
            {submittedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche en attente de validation</p>
                </CardContent>
              </Card>
            ) : (
              submittedTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getTaskTypeLabel(task.type)}</Badge>
                          <span className="font-semibold text-green-600">
                            {task.reward.toFixed(2)}€
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          En attente de validation par le vendeur
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Validated Tab */}
        <TabsContent value="validated" className="mt-6">
          <div className="space-y-4">
            {validatedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche validée</p>
                </CardContent>
              </Card>
            ) : (
              validatedTasks.map((task) => (
                <Card key={task.id} className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getTaskTypeLabel(task.type)}</Badge>
                          <span className="text-lg font-bold text-green-600">
                            +{task.reward.toFixed(2)}€
                          </span>
                        </div>

                        {task.validatedAt && (
                          <p className="text-sm text-green-700">
                            ✓ Validée le {new Date(task.validatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="mt-6">
          <div className="space-y-4">
            {rejectedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche refusée</p>
                </CardContent>
              </Card>
            ) : (
              rejectedTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{getTaskTypeLabel(task.type)}</Badge>
                          <span className="font-semibold">{task.reward.toFixed(2)}€</span>
                        </div>

                        {task.rejectionReason && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm font-medium text-red-900 mb-1">
                              Raison du refus :
                            </p>
                            <p className="text-sm text-red-700">{task.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
