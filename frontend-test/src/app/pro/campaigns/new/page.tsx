'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/lib/api/campaigns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    totalSlots: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalSlots = parseInt(formData.totalSlots);
    if (isNaN(totalSlots) || totalSlots <= 0) {
      toast.error('Nombre de places invalide');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate <= startDate) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setSubmitting(true);
    try {
      const campaign = await createCampaign({
        title: formData.title,
        description: formData.description || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalSlots,
        availableSlots: totalSlots,
      });

      toast.success('Campagne créée ! Ajoutez maintenant vos produits.');
      router.push(`/pro/campaigns/${campaign.id}/products`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate minimum dates
  const today = new Date().toISOString().split('T')[0];
  const minEndDate = formData.startDate || today;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/pro/campaigns">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux campagnes
        </Button>
      </Link>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 5 && <div className="w-12 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Étape 1 : Informations générales</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les informations de base de votre campagne
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer une campagne de test</CardTitle>
          <CardDescription>
            Commencez par renseigner les informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la campagne *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex: Test du nouveau produit X"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez votre campagne de test..."
                rows={4}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  min={today}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={minEndDate}
                  required
                />
              </div>
            </div>

            {/* Total slots */}
            <div className="space-y-2">
              <Label htmlFor="totalSlots">Nombre total de places *</Label>
              <Input
                id="totalSlots"
                type="number"
                min="1"
                value={formData.totalSlots}
                onChange={(e) => handleChange('totalSlots', e.target.value)}
                placeholder="Ex: 50"
                required
              />
              <p className="text-sm text-muted-foreground">
                Combien de testeurs pourront participer à cette campagne ?
              </p>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Prochaines étapes</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Ajouter les produits à tester</li>
                <li>Définir les critères de sélection des testeurs</li>
                <li>Planifier la distribution des tests</li>
                <li>Créer les procédures de test</li>
              </ol>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/pro/campaigns')}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Création...' : 'Créer et continuer'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
