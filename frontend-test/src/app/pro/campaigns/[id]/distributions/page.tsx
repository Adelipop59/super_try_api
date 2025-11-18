'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCampaign, Campaign } from '@/lib/api/campaigns';
import {
  getDistributions,
  createDistribution,
  createBatchDistributions,
  deleteDistribution,
  Distribution,
} from '@/lib/api/distributions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Lundi' },
  { value: 'TUESDAY', label: 'Mardi' },
  { value: 'WEDNESDAY', label: 'Mercredi' },
  { value: 'THURSDAY', label: 'Jeudi' },
  { value: 'FRIDAY', label: 'Vendredi' },
  { value: 'SATURDAY', label: 'Samedi' },
  { value: 'SUNDAY', label: 'Dimanche' },
];

export default function CampaignDistributionsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [distForm, setDistForm] = useState({
    type: 'RECURRING' as 'RECURRING' | 'SPECIFIC_DATE',
    dayOfWeek: 'MONDAY',
    specificDate: '',
    maxUnits: '',
  });

  const [batchMaxUnits, setBatchMaxUnits] = useState('2');

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const [campaignData, distributionsData] = await Promise.all([
        getCampaign(campaignId),
        getDistributions(campaignId),
      ]);

      setCampaign(campaignData);
      setDistributions(distributionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDistribution = async (e: React.FormEvent) => {
    e.preventDefault();

    const maxUnits = parseInt(distForm.maxUnits);
    if (isNaN(maxUnits) || maxUnits <= 0) {
      toast.error('Nombre d\'unités invalide');
      return;
    }

    setSubmitting(true);
    try {
      await createDistribution(campaignId, {
        type: distForm.type,
        dayOfWeek: distForm.type === 'RECURRING' ? distForm.dayOfWeek as any : undefined,
        specificDate: distForm.type === 'SPECIFIC_DATE' ? distForm.specificDate : undefined,
        maxUnits,
        isActive: true,
      });

      toast.success('Distribution ajoutée !');
      loadData();

      setDistForm({
        type: 'RECURRING',
        dayOfWeek: 'MONDAY',
        specificDate: '',
        maxUnits: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateWeek = async () => {
    const maxUnits = parseInt(batchMaxUnits);
    if (isNaN(maxUnits) || maxUnits <= 0) {
      toast.error('Nombre d\'unités invalide');
      return;
    }

    setSubmitting(true);
    try {
      const weekDistributions = DAYS_OF_WEEK.map(day => ({
        type: 'RECURRING' as const,
        dayOfWeek: day.value as any,
        maxUnits,
        isActive: true,
      }));

      await createBatchDistributions(campaignId, { distributions: weekDistributions });

      toast.success('Semaine complète créée !');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (distributionId: string) => {
    if (!confirm('Supprimer cette distribution ?')) {
      return;
    }

    try {
      await deleteDistribution(campaignId, distributionId);
      toast.success('Distribution supprimée');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleContinue = () => {
    if (distributions.length === 0) {
      toast.error('Ajoutez au moins une distribution');
      return;
    }
    router.push(`/pro/campaigns/${campaignId}/procedures`);
  };

  const getDayLabel = (day: string) => {
    return DAYS_OF_WEEK.find(d => d.value === day)?.label || day;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
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

  const recurringDists = distributions.filter(d => d.type === 'RECURRING');
  const specificDists = distributions.filter(d => d.type === 'SPECIFIC_DATE');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= 4
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 5 && <div className={`w-12 h-0.5 ${step < 4 ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Étape 4 : Distribution des tests</h2>
          <p className="text-sm text-muted-foreground">
            Planifiez quand et combien de tests seront distribués
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick batch creation */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-base">Créer une semaine complète (rapide)</CardTitle>
              <CardDescription>
                Créez automatiquement une distribution pour chaque jour de la semaine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Unités par jour</Label>
                  <Input
                    type="number"
                    min="1"
                    value={batchMaxUnits}
                    onChange={(e) => setBatchMaxUnits(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <Button
                  onClick={handleCreateWeek}
                  disabled={submitting}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? 'Création...' : 'Créer la semaine'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajouter une distribution manuellement</CardTitle>
              <CardDescription>
                Campagne: {campaign.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDistribution} className="space-y-4">
                <Tabs
                  value={distForm.type}
                  onValueChange={(value) =>
                    setDistForm(prev => ({ ...prev, type: value as any }))
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="RECURRING">Récurrent (jour)</TabsTrigger>
                    <TabsTrigger value="SPECIFIC_DATE">Date spécifique</TabsTrigger>
                  </TabsList>

                  <TabsContent value="RECURRING" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Jour de la semaine</Label>
                      <Select
                        value={distForm.dayOfWeek}
                        onValueChange={(value) =>
                          setDistForm(prev => ({ ...prev, dayOfWeek: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="SPECIFIC_DATE" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={distForm.specificDate}
                        onChange={(e) =>
                          setDistForm(prev => ({ ...prev, specificDate: e.target.value }))
                        }
                        min={campaign.startDate?.split('T')[0]}
                        max={campaign.endDate?.split('T')[0]}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Nombre maximum d'unités</Label>
                  <Input
                    type="number"
                    min="1"
                    value={distForm.maxUnits}
                    onChange={(e) => setDistForm(prev => ({ ...prev, maxUnits: e.target.value }))}
                    placeholder="2"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Combien de tests seront distribués ce jour-là
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? 'Ajout...' : 'Ajouter la distribution'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Distributions list */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Distributions ({distributions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {distributions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune distribution
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recurringDists.length > 0 && (
                    <>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                        Récurrentes
                      </h4>
                      {recurringDists.map(dist => (
                        <div
                          key={dist.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {getDayLabel(dist.dayOfWeek!)}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {dist.maxUnits} unités
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(dist.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}

                  {specificDists.length > 0 && (
                    <>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mt-4">
                        Dates spécifiques
                      </h4>
                      {specificDists.map(dist => (
                        <div
                          key={dist.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {formatDate(dist.specificDate!)}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {dist.maxUnits} unités
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(dist.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Info</p>
              <p>
                Les distributions définissent quand les testeurs pourront commencer les tests.
                Le total d'unités doit correspondre au nombre de places de la campagne.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/pro/campaigns')}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sauvegarder et quitter
        </Button>
        <Button
          onClick={handleContinue}
          disabled={distributions.length === 0}
          className="flex-1"
        >
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
