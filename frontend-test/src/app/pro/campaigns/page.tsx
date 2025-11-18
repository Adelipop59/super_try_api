'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyCampaigns, changeCampaignStatus, deleteCampaign, Campaign } from '@/lib/api/campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Play, Square, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CampaignsProPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await getMyCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (campaignId: string, status: string) => {
    try {
      await changeCampaignStatus(campaignId, status as any);
      toast.success(`Campagne ${status === 'ACTIVE' ? 'activée' : 'terminée'}`);
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
      return;
    }

    try {
      await deleteCampaign(campaignId);
      toast.success('Campagne supprimée');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filterByStatus = (statuses: string[]) => {
    return campaigns.filter(c => statuses.includes(c.status));
  };

  const draftCampaigns = filterByStatus(['DRAFT']);
  const pendingCampaigns = filterByStatus(['PENDING_PAYMENT']);
  const activeCampaigns = filterByStatus(['ACTIVE']);
  const completedCampaigns = filterByStatus(['COMPLETED', 'CANCELLED']);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING_PAYMENT: 'En attente',
    ACTIVE: 'Active',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
  };

  const renderCampaignRow = (campaign: Campaign) => (
    <TableRow key={campaign.id}>
      <TableCell className="font-medium">{campaign.title}</TableCell>
      <TableCell>{formatDate(campaign.startDate)}</TableCell>
      <TableCell>{formatDate(campaign.endDate)}</TableCell>
      <TableCell>
        {campaign.availableSlots}/{campaign.totalSlots}
      </TableCell>
      <TableCell>
        <Badge className={statusColors[campaign.status]}>
          {statusLabels[campaign.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/pro/campaigns/${campaign.id}`}>
            <Button variant="ghost" size="icon" title="Voir">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          {campaign.status === 'DRAFT' && (
            <>
              <Link href={`/pro/campaigns/${campaign.id}/edit`}>
                <Button variant="ghost" size="icon" title="Éditer">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleChangeStatus(campaign.id, 'ACTIVE')}
                title="Activer"
              >
                <Play className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(campaign.id)}
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}

          {campaign.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleChangeStatus(campaign.id, 'COMPLETED')}
              title="Terminer"
            >
              <Square className="h-4 w-4 text-blue-600" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
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

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mes Campagnes</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos campagnes de test produit
          </p>
        </div>
        <Link href="/pro/campaigns/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Créer une campagne
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="draft" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="draft">Brouillons ({draftCampaigns.length})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({pendingCampaigns.length})</TabsTrigger>
          <TabsTrigger value="active">Actives ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="completed">Terminées ({completedCampaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="mt-6">
          {draftCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <h3 className="text-lg font-semibold mb-2">Aucun brouillon</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par créer votre première campagne
                </p>
                <Link href="/pro/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une campagne
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Campagnes en brouillon</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Places</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftCampaigns.map(renderCampaignRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Aucune campagne en attente de paiement
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Places</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCampaigns.map(renderCampaignRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          {activeCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Aucune campagne active
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Places</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCampaigns.map(renderCampaignRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Aucune campagne terminée
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Places</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedCampaigns.map(renderCampaignRow)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
