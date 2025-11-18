'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCampaign, changeCampaignStatus, Campaign } from '@/lib/api/campaigns';
import {
  getProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  Procedure,
} from '@/lib/api/procedures';
import {
  getSteps,
  createStep,
  deleteStep,
  Step,
} from '@/lib/api/steps';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Edit, CheckCircle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

const STEP_TYPES = [
  { value: 'TEXT', label: 'Texte', description: 'Réponse texte libre' },
  { value: 'PHOTO', label: 'Photo', description: 'Upload de photo' },
  { value: 'VIDEO', label: 'Vidéo', description: 'Upload de vidéo' },
  { value: 'CHECKLIST', label: 'Checklist', description: 'Liste de tâches à cocher' },
  { value: 'RATING', label: 'Note', description: 'Note sur 5 étoiles' },
  { value: 'PRICE_VALIDATION', label: 'Validation prix', description: 'Validation du prix payé' },
];

export default function CampaignProceduresPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [procForm, setProcForm] = useState({
    title: '',
    description: '',
    isRequired: true,
  });

  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [procedureSteps, setProcedureSteps] = useState<Record<string, Step[]>>({});

  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    type: 'TEXT',
    isRequired: true,
    checklistItems: '',
  });

  const [showProcDialog, setShowProcDialog] = useState(false);
  const [showStepDialog, setShowStepDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const [campaignData, proceduresData] = await Promise.all([
        getCampaign(campaignId),
        getProcedures(campaignId),
      ]);

      setCampaign(campaignData);
      setProcedures(proceduresData);

      // Load steps for each procedure
      const stepsData: Record<string, Step[]> = {};
      for (const proc of proceduresData) {
        const steps = await getSteps(proc.id);
        stepsData[proc.id] = steps;
      }
      setProcedureSteps(stepsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcedure = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      await createProcedure(campaignId, {
        title: procForm.title,
        description: procForm.description || undefined,
        order: procedures.length + 1,
        isRequired: procForm.isRequired,
      });

      toast.success('Procédure ajoutée !');
      loadData();

      setProcForm({
        title: '',
        description: '',
        isRequired: true,
      });
      setShowProcDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProcedure = async (procedureId: string) => {
    if (!confirm('Supprimer cette procédure et toutes ses étapes ?')) {
      return;
    }

    try {
      await deleteProcedure(campaignId, procedureId);
      toast.success('Procédure supprimée');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProcedure) {
      toast.error('Sélectionnez une procédure');
      return;
    }

    setSubmitting(true);
    try {
      const checklistItems = stepForm.type === 'CHECKLIST'
        ? stepForm.checklistItems.split('\n').filter(item => item.trim())
        : undefined;

      await createStep(selectedProcedure, {
        title: stepForm.title,
        description: stepForm.description || undefined,
        type: stepForm.type as any,
        order: (procedureSteps[selectedProcedure]?.length || 0) + 1,
        isRequired: stepForm.isRequired,
        checklistItems,
      });

      toast.success('Étape ajoutée !');
      loadData();

      setStepForm({
        title: '',
        description: '',
        type: 'TEXT',
        isRequired: true,
        checklistItems: '',
      });
      setShowStepDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStep = async (procedureId: string, stepId: string) => {
    if (!confirm('Supprimer cette étape ?')) {
      return;
    }

    try {
      await deleteStep(procedureId, stepId);
      toast.success('Étape supprimée');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleFinish = async () => {
    if (procedures.length === 0) {
      if (!confirm('Aucune procédure définie. Activer la campagne sans procédures ?')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      await changeCampaignStatus(campaignId, 'ACTIVE');
      toast.success('Campagne activée avec succès !');
      router.push('/pro/campaigns');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'activation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !campaign) {
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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= 5
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 5 && <div className="w-12 h-0.5 bg-primary" />}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Étape 5 : Procédures de test</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les étapes que les testeurs devront suivre (optionnel)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Procedures list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Procédures ({procedures.length})</CardTitle>
                <CardDescription>
                  Campagne: {campaign.title}
                </CardDescription>
              </div>

              <Dialog open={showProcDialog} onOpenChange={setShowProcDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une procédure
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle procédure</DialogTitle>
                    <DialogDescription>
                      Créez une procédure de test
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProcedure} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titre *</Label>
                      <Input
                        value={procForm.title}
                        onChange={(e) => setProcForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Déballage du produit"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={procForm.description}
                        onChange={(e) => setProcForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Décrivez la procédure..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <Label htmlFor="procRequired">Procédure requise</Label>
                      <Switch
                        id="procRequired"
                        checked={procForm.isRequired}
                        onCheckedChange={(checked) => setProcForm(prev => ({ ...prev, isRequired: checked }))}
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Ajout...' : 'Ajouter la procédure'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {procedures.length === 0 ? (
                <div className="text-center py-12">
                  <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune procédure définie
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les procédures sont optionnelles mais permettent de guider les testeurs
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {procedures.map((procedure, index) => {
                    const steps = procedureSteps[procedure.id] || [];

                    return (
                      <Card key={procedure.id} className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {index + 1}
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {procedure.title}
                                  {procedure.isRequired && (
                                    <Badge variant="destructive" className="ml-2 text-xs">
                                      Requis
                                    </Badge>
                                  )}
                                </CardTitle>
                                {procedure.description && (
                                  <CardDescription className="mt-1">
                                    {procedure.description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProcedure(procedure.id);
                                  setShowStepDialog(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Étape
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProcedure(procedure.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        {steps.length > 0 && (
                          <CardContent>
                            <Separator className="mb-4" />
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">
                                Étapes ({steps.length})
                              </h4>
                              {steps.map((step, stepIndex) => (
                                <div
                                  key={step.id}
                                  className="flex items-start justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-start gap-2 flex-1">
                                    <span className="text-sm text-muted-foreground font-medium">
                                      {stepIndex + 1}.
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{step.title}</div>
                                      {step.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {step.description}
                                        </p>
                                      )}
                                      <div className="flex gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          {STEP_TYPES.find(t => t.value === step.type)?.label}
                                        </Badge>
                                        {step.isRequired && (
                                          <Badge variant="secondary" className="text-xs">
                                            Requis
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteStep(procedure.id, step.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Procédures:</span>
                <span className="font-semibold">{procedures.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Étapes totales:</span>
                <span className="font-semibold">
                  {Object.values(procedureSteps).reduce((sum, steps) => sum + steps.length, 0)}
                </span>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-semibold">Campagne complète !</p>
                <p className="text-muted-foreground text-xs">
                  Vous pouvez maintenant activer votre campagne. Les testeurs pourront postuler et vous pourrez gérer les sessions.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-green-900">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Prêt à activer</span>
              </div>
              <Button
                onClick={handleFinish}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Activation...' : 'Activer la campagne'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/pro/campaigns')}
                className="w-full"
              >
                Sauvegarder en brouillon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step dialog */}
      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle étape</DialogTitle>
            <DialogDescription>
              Ajoutez une étape à la procédure
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStep} className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={stepForm.title}
                onChange={(e) => setStepForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Prendre une photo du produit"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={stepForm.description}
                onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Instructions détaillées..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Type d'étape *</Label>
              <Select
                value={stepForm.type}
                onValueChange={(value) => setStepForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {stepForm.type === 'CHECKLIST' && (
              <div className="space-y-2">
                <Label>Items de la checklist (un par ligne)</Label>
                <Textarea
                  value={stepForm.checklistItems}
                  onChange={(e) => setStepForm(prev => ({ ...prev, checklistItems: e.target.value }))}
                  placeholder="Vérifier l'emballage&#10;Tester le fonctionnement&#10;Prendre des photos"
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="stepRequired">Étape requise</Label>
              <Switch
                id="stepRequired"
                checked={stepForm.isRequired}
                onCheckedChange={(checked) => setStepForm(prev => ({ ...prev, isRequired: checked }))}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Ajout...' : 'Ajouter l\'étape'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/pro/campaigns')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux campagnes
        </Button>
      </div>
    </div>
  );
}
