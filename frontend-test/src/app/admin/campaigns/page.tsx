'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCampaigns, Campaign, updateCampaignStatus, deleteCampaign } from '@/lib/api/campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Briefcase, Search, Eye, Trash2, Filter, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [newStatus, setNewStatus] = useState<string>('DRAFT');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an admin endpoint that returns all campaigns
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleChangeStatus = async () => {
    if (!selectedCampaign) return;

    try {
      await updateCampaignStatus(
        selectedCampaign.id,
        newStatus as 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
      );
      toast.success('Statut modifié avec succès');
      loadCampaigns();
      setShowStatusDialog(false);
      setSelectedCampaign(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification du statut');
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la campagne "${campaign.title}" ?`)) {
      return;
    }

    try {
      await deleteCampaign(campaign.id);
      toast.success('Campagne supprimée');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openStatusDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setNewStatus(campaign.status);
    setShowStatusDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      PENDING_PAYMENT: 'En attente',
      ACTIVE: 'Active',
      COMPLETED: 'Terminée',
      CANCELLED: 'Annulée',
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des campagnes</h1>
        <p className="text-muted-foreground">
          Supervisez toutes les campagnes de la plateforme
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Recherche</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Titre, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={() => {}}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DRAFT">Brouillons</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">En attente paiement</SelectItem>
                  <SelectItem value="ACTIVE">Actives</SelectItem>
                  <SelectItem value="COMPLETED">Terminées</SelectItem>
                  <SelectItem value="CANCELLED">Annulées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Campagnes ({filteredCampaigns.length})</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{campaigns.filter(c => c.status === 'ACTIVE').length} actives</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span>{campaigns.filter(c => c.status === 'DRAFT').length} brouillons</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune campagne trouvée</h3>
              <p className="text-muted-foreground">
                Essayez de modifier vos filtres
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Places</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{campaign.title}</div>
                        {campaign.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {campaign.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.sellerId}
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{campaign.filledSlots}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{campaign.totalSlots}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {((campaign.filledSlots / campaign.totalSlots) * 100).toFixed(0)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{new Date(campaign.startDate).toLocaleDateString()}</div>
                        {campaign.endDate && (
                          <div className="text-muted-foreground">
                            au {new Date(campaign.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.totalBonus ? (
                          <span className="font-medium text-green-600">
                            {campaign.totalBonus.toFixed(0)}€
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/campaigns/${campaign.id}`)}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStatusDialog(campaign)}
                            title="Changer statut"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(campaign)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
            <DialogDescription>
              Modifier le statut de "{selectedCampaign?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">En attente paiement</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Terminée</SelectItem>
                  <SelectItem value="CANCELLED">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Attention :</strong> Changer le statut peut avoir des conséquences sur les
                sessions en cours et les testeurs.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button onClick={handleChangeStatus} className="flex-1">
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
