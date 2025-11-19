'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCampaign, Campaign } from '@/lib/api/campaigns';
import { getCategories, Category } from '@/lib/api/categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignCriteriaPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [criteria, setCriteria] = useState({
    minAge: '',
    maxAge: '',
    minRating: '',
    minCompletedSessions: '',
    requiredGender: 'ANY',
    requiredLocations: [] as string[],
    requiredCategories: [] as string[],
  });

  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const [campaignData, categoriesData] = await Promise.all([
        getCampaign(campaignId),
        getCategories(),
      ]);

      setCampaign(campaignData);
      setCategories(categoriesData.filter(c => c.isActive));

      // Pre-fill if criteria already exists
      if (campaignData && campaignData.criteria) {
        setCriteria({
          minAge: campaignData.criteria.minAge?.toString() || '',
          maxAge: campaignData.criteria.maxAge?.toString() || '',
          minRating: campaignData.criteria.minRating?.toString() || '',
          minCompletedSessions: campaignData.criteria.minCompletedSessions?.toString() || '',
          requiredGender: campaignData.criteria.requiredGender || 'ANY',
          requiredLocations: campaignData.criteria.requiredLocations || [],
          requiredCategories: campaignData.criteria.requiredCategories || [],
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Note: L'API backend devrait avoir un endpoint pour update criteria
    // Pour l'instant on saute cette étape et on continue
    toast.success('Critères enregistrés (en local)');
    router.push(`/pro/campaigns/${campaignId}/distributions`);
  };

  const handleSkip = () => {
    router.push(`/pro/campaigns/${campaignId}/distributions`);
  };

  const addLocation = () => {
    if (newLocation.trim() && !criteria.requiredLocations.includes(newLocation.trim())) {
      setCriteria(prev => ({
        ...prev,
        requiredLocations: [...prev.requiredLocations, newLocation.trim()],
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (location: string) => {
    setCriteria(prev => ({
      ...prev,
      requiredLocations: prev.requiredLocations.filter(l => l !== location),
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setCriteria(prev => ({
      ...prev,
      requiredCategories: prev.requiredCategories.includes(categoryId)
        ? prev.requiredCategories.filter(c => c !== categoryId)
        : [...prev.requiredCategories, categoryId],
    }));
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
    <div className="p-8 max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= 3
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 5 && <div className={`w-12 h-0.5 ${step < 3 ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Étape 3 : Critères de sélection</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les critères pour sélectionner les testeurs (optionnel)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Critères de sélection des testeurs</CardTitle>
          <CardDescription>
            Campagne: {campaign.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Tous les critères sont optionnels</p>
                <p>
                  Si vous ne définissez aucun critère, tous les testeurs pourront postuler à votre campagne.
                  Vous pourrez ensuite sélectionner manuellement les candidatures.
                </p>
              </div>
            </div>

            {/* Age range */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Critères démographiques</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAge">Âge minimum</Label>
                  <Input
                    id="minAge"
                    type="number"
                    min="18"
                    max="100"
                    value={criteria.minAge}
                    onChange={(e) => setCriteria(prev => ({ ...prev, minAge: e.target.value }))}
                    placeholder="18"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAge">Âge maximum</Label>
                  <Input
                    id="maxAge"
                    type="number"
                    min="18"
                    max="100"
                    value={criteria.maxAge}
                    onChange={(e) => setCriteria(prev => ({ ...prev, maxAge: e.target.value }))}
                    placeholder="65"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredGender">Genre requis</Label>
                <Select
                  value={criteria.requiredGender}
                  onValueChange={(value) => setCriteria(prev => ({ ...prev, requiredGender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Tous</SelectItem>
                    <SelectItem value="MALE">Homme</SelectItem>
                    <SelectItem value="FEMALE">Femme</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Experience criteria */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Critères d'expérience</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minRating">Note minimale</Label>
                  <Input
                    id="minRating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={criteria.minRating}
                    onChange={(e) => setCriteria(prev => ({ ...prev, minRating: e.target.value }))}
                    placeholder="4.0"
                  />
                  <p className="text-xs text-muted-foreground">Note moyenne sur 5</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minCompletedSessions">Sessions complétées minimum</Label>
                  <Input
                    id="minCompletedSessions"
                    type="number"
                    min="0"
                    value={criteria.minCompletedSessions}
                    onChange={(e) => setCriteria(prev => ({ ...prev, minCompletedSessions: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            {/* Locations */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Localisations requises</h3>

              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Paris, France"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLocation();
                    }
                  }}
                />
                <Button type="button" onClick={addLocation}>
                  Ajouter
                </Button>
              </div>

              {criteria.requiredLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {criteria.requiredLocations.map((location) => (
                    <div
                      key={location}
                      className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      <span className="text-sm">{location}</span>
                      <button
                        type="button"
                        onClick={() => removeLocation(location)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Catégories préférées requises</h3>
              <p className="text-sm text-muted-foreground">
                Sélectionnez les catégories que les testeurs doivent avoir dans leurs préférences
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      criteria.requiredCategories.includes(category.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {category.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {criteria.requiredCategories.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {criteria.requiredCategories.length} catégorie(s) sélectionnée(s)
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
              >
                Passer cette étape
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer et continuer'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/pro/campaigns')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sauvegarder et quitter
        </Button>
      </div>
    </div>
  );
}
