'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCampaign, Campaign, updateCampaignStatus, deleteCampaign } from '@/lib/api/campaigns';
import { getProducts, Product } from '@/lib/api/products';
import { getDistributions, Distribution } from '@/lib/api/distributions';
import { getProcedures, Procedure } from '@/lib/api/procedures';
import { getSessions, Session } from '@/lib/api/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Trash2,
  PlayCircle,
  CheckCircle,
  Calendar,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      const [campaignData, distributionsData, proceduresData, sessionsData] = await Promise.all([
        getCampaign(campaignId),
        getDistributions(campaignId).catch(() => []),
        getProcedures(campaignId).catch(() => []),
        getSessions().catch(() => []), // Filter by campaign on client
      ]);

      setCampaign(campaignData);
      setDistributions(distributionsData);
      setProcedures(proceduresData);
      setSessions(sessionsData.filter(s => s.campaignId === campaignId));

      // Load products from campaign offers
      if (campaignData && campaignData.offers && campaignData.offers.length > 0) {
        const productIds = campaignData.offers.map(o => o.productId);
        // In real app, would fetch products by IDs
        // For now, using offers data
      }
    } catch (error) {
      console.error('Failed to load campaign:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!campaign) return;

    // Check if campaign is ready to activate
    if (!campaign.offers || campaign.offers.length === 0) {
      toast.error('Ajoutez au moins un produit avant d\'activer');
      return;
    }

    if (!procedures || procedures.length === 0) {
      toast.error('Ajoutez au moins une procédure avant d\'activer');
      return;
    }

    try {
      await updateCampaignStatus(campaignId, 'ACTIVE');
      toast.success('Campagne activée !');
      loadCampaignData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'activation');
    }
  };

  const handleComplete = async () => {
    if (!campaign) return;
    if (!confirm('Êtes-vous sûr de vouloir terminer cette campagne ?')) return;

    try {
      await updateCampaignStatus(campaignId, 'COMPLETED');
      toast.success('Campagne terminée');
      loadCampaignData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    try {
      await deleteCampaign(campaignId);
      toast.success('Campagne supprimée');
      router.push('/pro/campaigns');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
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

  const getSessionStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      SUBMITTED: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      DISPUTED: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
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

  if (!campaign) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Campagne introuvable</h2>
        <Button onClick={() => router.push('/pro/campaigns')}>Retour</Button>
      </div>
    );
  }

  const pendingSessions = sessions.filter(s => s.status === 'PENDING').length;
  const activeSessions = sessions.filter(s => ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'].includes(s.status)).length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/pro/campaigns')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            <div className="flex items-center gap-2">
              {getStatusBadge(campaign.status)}
              <span className="text-muted-foreground">
                {campaign.filledSlots}/{campaign.totalSlots} places remplies
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {campaign.status === 'DRAFT' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/pro/campaigns/${campaignId}/products`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Éditer
                </Button>
                <Button onClick={handleActivate}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Activer
                </Button>
              </>
            )}
            {campaign.status === 'ACTIVE' && (
              <Button onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Terminer
              </Button>
            )}
            {campaign.status !== 'COMPLETED' && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Candidatures en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions complétées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de complétion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {sessions.length > 0
                ? ((completedSessions / sessions.length) * 100).toFixed(0)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="infos" className="w-full">
        <TabsList>
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="products">Produits ({campaign.offers?.length || 0})</TabsTrigger>
          <TabsTrigger value="criteria">Critères</TabsTrigger>
          <TabsTrigger value="distributions">Distributions ({distributions.length})</TabsTrigger>
          <TabsTrigger value="procedures">Procédures ({procedures.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
        </TabsList>

        {/* Infos Tab */}
        <TabsContent value="infos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails de la campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                <p>{campaign.description || 'Aucune description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Date début</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Date fin</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '-'}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Places totales</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.totalSlots}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Places remplies</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{campaign.filledSlots}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Bonus total</div>
                  <div className="text-lg font-semibold text-green-600">
                    {campaign.totalBonus?.toFixed(2) || '0.00'}€
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Date de création</div>
                <p>{new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Produits de la campagne</CardTitle>
              <CardDescription>
                Liste des produits inclus dans cette campagne
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!campaign.offers || campaign.offers.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun produit</h3>
                  <p className="text-muted-foreground mb-4">
                    Ajoutez des produits pour démarrer votre campagne
                  </p>
                  <Button onClick={() => router.push(`/pro/campaigns/${campaignId}/products`)}>
                    Ajouter des produits
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Prix attendu</TableHead>
                      <TableHead>Livraison</TableHead>
                      <TableHead>Remboursement</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Quantité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-medium">{offer.productId}</TableCell>
                        <TableCell>{offer.expectedPrice.toFixed(2)}€</TableCell>
                        <TableCell>{offer.shippingCost.toFixed(2)}€</TableCell>
                        <TableCell>
                          {offer.reimbursement === 'FULL' && 'Complet'}
                          {offer.reimbursement === 'PRODUCT_ONLY' && 'Produit uniquement'}
                          {offer.reimbursement === 'NONE' && 'Aucun'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {offer.bonus.toFixed(2)}€
                        </TableCell>
                        <TableCell>{offer.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Criteria Tab */}
        <TabsContent value="criteria" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Critères de sélection</CardTitle>
              <CardDescription>
                Critères pour sélectionner les testeurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!campaign.criteria ? (
                <p className="text-muted-foreground">Aucun critère défini (ouvert à tous)</p>
              ) : (
                <div className="space-y-4">
                  {campaign.criteria.minAge && (
                    <div>
                      <span className="text-sm font-medium">Âge minimum :</span> {campaign.criteria.minAge} ans
                    </div>
                  )}
                  {campaign.criteria.maxAge && (
                    <div>
                      <span className="text-sm font-medium">Âge maximum :</span> {campaign.criteria.maxAge} ans
                    </div>
                  )}
                  {campaign.criteria.requiredGender && campaign.criteria.requiredGender !== 'ANY' && (
                    <div>
                      <span className="text-sm font-medium">Genre :</span> {campaign.criteria.requiredGender}
                    </div>
                  )}
                  {campaign.criteria.minRating && (
                    <div>
                      <span className="text-sm font-medium">Note minimale :</span> {campaign.criteria.minRating}/5
                    </div>
                  )}
                  {campaign.criteria.minCompletedSessions && (
                    <div>
                      <span className="text-sm font-medium">Sessions complétées :</span> {campaign.criteria.minCompletedSessions}
                    </div>
                  )}
                  {campaign.criteria.requiredLocations && campaign.criteria.requiredLocations.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Localisations :</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaign.criteria.requiredLocations.map((loc: string) => (
                          <Badge key={loc} variant="outline">{loc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {campaign.criteria.requiredCategories && campaign.criteria.requiredCategories.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Catégories :</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaign.criteria.requiredCategories.map((cat: string) => (
                          <Badge key={cat} variant="outline">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Planning des distributions</CardTitle>
            </CardHeader>
            <CardContent>
              {distributions.length === 0 ? (
                <div className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune distribution planifiée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Jour/Date</TableHead>
                      <TableHead>Unités max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map((dist) => (
                      <TableRow key={dist.id}>
                        <TableCell>
                          <Badge>{dist.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {dist.type === 'RECURRING' && dist.dayOfWeek}
                          {dist.type === 'SPECIFIC_DATE' && dist.specificDate && new Date(dist.specificDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{dist.maxUnits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Procédures de test</CardTitle>
            </CardHeader>
            <CardContent>
              {procedures.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune procédure définie</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {procedures.map((procedure) => (
                    <Card key={procedure.id}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {procedure.title}
                          {procedure.isRequired && (
                            <Badge className="bg-red-100 text-red-800">Requis</Badge>
                          )}
                        </CardTitle>
                        {procedure.description && (
                          <CardDescription>{procedure.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Ordre: {procedure.order}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Sessions de test</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => router.push('/pro/sessions')}
                >
                  Voir toutes les sessions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune session pour cette campagne</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Testeur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date candidature</TableHead>
                      <TableHead>Date complétion</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-sm">
                          {session.testerId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{getSessionStatusBadge(session.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(session.appliedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.completedAt
                            ? new Date(session.completedAt).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/pro/sessions/${session.id}`)}
                          >
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
