'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api/sessions';
import { getBonusTasks, validateBonusTask, rejectBonusTaskSubmission, deleteBonusTask, BonusTask } from '@/lib/api/bonusTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BonusTasksManagementPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [bonusTasks, setBonusTasks] = useState<BonusTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BonusTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleValidate = async () => {
    if (!selectedTask) return;

    try {
      await validateBonusTask(selectedTask.id);
      toast.success('Tâche bonus validée ! Récompense créditée.');
      loadData();
      setShowValidateDialog(false);
      setSelectedTask(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la validation');
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;

    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    try {
      await rejectBonusTaskSubmission(selectedTask.id, {
        reason: rejectionReason.trim(),
      });
      toast.success('Soumission refusée');
      loadData();
      setShowRejectDialog(false);
      setSelectedTask(null);
      setRejectionReason('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  const handleDelete = async (task: BonusTask) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette tâche ?`)) {
      return;
    }

    try {
      await deleteBonusTask(task.id);
      toast.success('Tâche bonus supprimée');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openValidateDialog = (task: BonusTask) => {
    setSelectedTask(task);
    setShowValidateDialog(true);
  };

  const openRejectDialog = (task: BonusTask) => {
    setSelectedTask(task);
    setRejectionReason('');
    setShowRejectDialog(true);
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
      REQUESTED: 'Demandée',
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
      UNBOXING_PHOTO: 'Photo unboxing',
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
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/pro/sessions/${sessionId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la session
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tâches bonus</h1>
            <p className="text-muted-foreground">
              Gérez les tâches supplémentaires pour cette session
            </p>
          </div>

          <Button onClick={() => router.push(`/pro/sessions/${sessionId}/bonus-tasks/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demandées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{requestedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Acceptées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{acceptedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Soumises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{submittedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Validées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validatedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Refusées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="submitted" className="w-full">
        <TabsList>
          <TabsTrigger value="submitted">À valider ({submittedTasks.length})</TabsTrigger>
          <TabsTrigger value="requested">Demandées ({requestedTasks.length})</TabsTrigger>
          <TabsTrigger value="accepted">Acceptées ({acceptedTasks.length})</TabsTrigger>
          <TabsTrigger value="validated">Validées ({validatedTasks.length})</TabsTrigger>
          <TabsTrigger value="rejected">Refusées ({rejectedTasks.length})</TabsTrigger>
        </TabsList>

        {/* Submitted Tab */}
        <TabsContent value="submitted" className="mt-6">
          <div className="space-y-4">
            {submittedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune tâche à valider</h3>
                  <p className="text-muted-foreground">
                    Les tâches soumises par le testeur apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            ) : (
              submittedTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                          {getTaskTypeLabel(task.type)} • {task.reward.toFixed(2)}€
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {task.description && (
                      <div>
                        <p className="text-sm font-medium mb-1">Description :</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    )}

                    {/* Submission */}
                    {task.submittedAt && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Soumis le {new Date(task.submittedAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>

                        {task.submittedPhotoUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-blue-800 mb-1">Photo :</p>
                            <a
                              href={task.submittedPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Voir la photo <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {task.submittedVideoUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-blue-800 mb-1">Vidéo :</p>
                            <a
                              href={task.submittedVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Voir la vidéo <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {task.submittedExternalUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-blue-800 mb-1">Lien externe :</p>
                            <a
                              href={task.submittedExternalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {task.submittedExternalUrl} <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openRejectDialog(task)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                      <Button
                        onClick={() => openValidateDialog(task)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider ({task.reward.toFixed(2)}€)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Requested Tab */}
        <TabsContent value="requested" className="mt-6">
          <div className="space-y-4">
            {requestedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune tâche demandée</p>
                </CardContent>
              </Card>
            ) : (
              requestedTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                          {getTaskTypeLabel(task.type)} • {task.reward.toFixed(2)}€
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(task)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {task.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </CardContent>
                  )}
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
                  <p className="text-muted-foreground">Aucune tâche acceptée</p>
                </CardContent>
              </Card>
            ) : (
              acceptedTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                          {getTaskTypeLabel(task.type)} • {task.reward.toFixed(2)}€
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  {task.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        En attente de la soumission du testeur
                      </p>
                    </CardContent>
                  )}
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
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                          {getTaskTypeLabel(task.type)} • {task.reward.toFixed(2)}€
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {task.validatedAt && (
                      <p className="text-sm text-green-600">
                        ✓ Validée le {new Date(task.validatedAt).toLocaleDateString()}
                      </p>
                    )}
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
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <CardDescription>
                          {getTaskTypeLabel(task.type)} • {task.reward.toFixed(2)}€
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  {task.rejectionReason && (
                    <CardContent>
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900 mb-1">Raison du refus :</p>
                        <p className="text-sm text-red-700">{task.rejectionReason}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Validate Dialog */}
      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la tâche bonus</DialogTitle>
            <DialogDescription>
              Confirmer la validation et créditer {selectedTask?.reward.toFixed(2)}€ au testeur
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>Tâche :</strong> {selectedTask.title}
                </p>
                <p className="text-sm text-green-900 mt-1">
                  <strong>Récompense :</strong> {selectedTask.reward.toFixed(2)}€
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Le testeur recevra {selectedTask.reward.toFixed(2)}€ dans son wallet immédiatement après validation.
              </p>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowValidateDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button onClick={handleValidate} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la soumission</DialogTitle>
            <DialogDescription>
              Indiquez la raison du refus au testeur
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Raison du refus *</Label>
                <Textarea
                  placeholder="Ex: La photo ne correspond pas aux consignes..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
