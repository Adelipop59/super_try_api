'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cleanupLogs, LogLevel } from '@/lib/api/logs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function LogsCleanupPage() {
  const router = useRouter();
  const [cleaning, setCleaning] = useState(false);

  // Form state
  const [beforeDate, setBeforeDate] = useState('');
  const [level, setLevel] = useState<string>('all');

  const handleCleanup = async () => {
    if (!beforeDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ces logs ? Cette action est irréversible.')) {
      return;
    }

    setCleaning(true);
    try {
      const result = await cleanupLogs({
        beforeDate: new Date(beforeDate).toISOString(),
        level: level !== 'all' ? (level as LogLevel) : undefined,
      });

      toast.success(`${result.deletedCount} log(s) supprimé(s)`);

      // Reset form
      setBeforeDate('');
      setLevel('all');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du nettoyage');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/logs')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux logs
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nettoyage des logs</h1>
        <p className="text-muted-foreground">
          Supprimez les anciens logs pour libérer de l'espace
        </p>
      </div>

      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
            <div>
              <CardTitle className="text-red-900">Attention</CardTitle>
              <CardDescription className="text-red-700">
                Cette action est irréversible. Les logs supprimés ne pourront pas être récupérés.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Before date */}
            <div className="space-y-2">
              <Label htmlFor="beforeDate">Supprimer les logs avant le *</Label>
              <Input
                id="beforeDate"
                type="date"
                value={beforeDate}
                onChange={(e) => setBeforeDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Tous les logs antérieurs à cette date seront supprimés
              </p>
            </div>

            {/* Level filter */}
            <div className="space-y-2">
              <Label htmlFor="level">Niveau (optionnel)</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="INFO">INFO uniquement</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS uniquement</SelectItem>
                  <SelectItem value="WARNING">WARNING uniquement</SelectItem>
                  <SelectItem value="ERROR">ERROR uniquement</SelectItem>
                  <SelectItem value="DEBUG">DEBUG uniquement</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Filtrer par niveau pour ne supprimer que certains types de logs
              </p>
            </div>

            {/* Examples */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Exemples d'usage :</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Supprimer tous les logs de plus de 30 jours</li>
                  <li>Supprimer uniquement les logs INFO de plus de 7 jours</li>
                  <li>Supprimer tous les logs DEBUG de plus de 24 heures</li>
                </ul>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/logs')}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCleanup}
                disabled={cleaning || !beforeDate}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cleaning ? 'Nettoyage...' : 'Supprimer les logs'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best practices */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Bonnes pratiques</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                Conservez les logs d'erreurs (ERROR) plus longtemps pour le débogage
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                Supprimez régulièrement les logs INFO et DEBUG pour économiser l'espace
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                Effectuez une sauvegarde avant de supprimer des logs importants
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">✗</span>
              <span>
                Ne supprimez pas les logs récents (moins de 7 jours) sauf cas exceptionnel
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
