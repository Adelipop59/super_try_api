'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserById, Profile, changeUserRole, verifyUser, unverifyUser, suspendUser, unsuspendUser, deleteUser, UserRole } from '@/lib/api/users';
import { getWallet, Wallet, getTransactions, Transaction } from '@/lib/api/wallets';
import { getSessions, Session } from '@/lib/api/sessions';
import { getMyCampaigns, Campaign } from '@/lib/api/campaigns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  ShieldAlert,
  UserX,
  Trash2,
  Wallet as WalletIcon,
  Briefcase,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const userData = await getUserById(userId);
      setUser(userData);

      // Load role-specific data
      if (userData.role === 'USER') {
        loadUserData(userId);
      } else if (userData.role === 'PRO') {
        loadProData();
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (uid: string) => {
    try {
      const [walletData, transactionsData, sessionsData] = await Promise.all([
        getWallet().catch(() => null),
        getTransactions().catch(() => []),
        getSessions().catch(() => []),
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadProData = async () => {
    try {
      const campaignsData = await getMyCampaigns().catch(() => []);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Failed to load pro data:', error);
    }
  };

  const handleChangeRole = async () => {
    if (!user) return;

    try {
      await changeUserRole(user.userId, { role: newRole });
      toast.success('Rôle modifié avec succès');
      loadUser();
      setShowRoleDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification du rôle');
    }
  };

  const handleVerify = async () => {
    if (!user) return;

    try {
      if (user.isVerified) {
        await unverifyUser(user.userId);
        toast.success('Vérification retirée');
      } else {
        await verifyUser(user.userId);
        toast.success('Utilisateur vérifié');
      }
      loadUser();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification');
    }
  };

  const handleSuspend = async () => {
    if (!user) return;

    try {
      if (user.isSuspended) {
        await unsuspendUser(user.userId);
        toast.success('Suspension levée');
      } else {
        if (!suspendReason.trim()) {
          toast.error('Veuillez indiquer une raison');
          return;
        }
        await suspendUser(user.userId, { reason: suspendReason });
        toast.success('Utilisateur suspendu');
      }
      loadUser();
      setShowSuspendDialog(false);
      setSuspendReason('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suspension');
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.firstName || user.email} ?`)) {
      return;
    }

    try {
      await deleteUser(user.userId);
      toast.success('Utilisateur supprimé');
      router.push('/admin/users');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      USER: 'bg-blue-100 text-blue-800',
      PRO: 'bg-green-100 text-green-800',
      ADMIN: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={colors[role]}>{role}</Badge>;
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

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Utilisateur introuvable</h2>
        <Button onClick={() => router.push('/admin/users')}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/users')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {user.firstName || user.lastName
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : user.email}
            </h1>
            <div className="flex items-center gap-2">
              {getRoleBadge(user.role)}
              {user.isVerified && (
                <Badge className="bg-green-100 text-green-800">Vérifié</Badge>
              )}
              {user.isSuspended && (
                <Badge className="bg-red-100 text-red-800">Suspendu</Badge>
              )}
              {!user.isActive && (
                <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewRole(user.role);
                setShowRoleDialog(true);
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Changer rôle
            </Button>
            <Button
              variant="outline"
              onClick={handleVerify}
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              {user.isVerified ? 'Retirer vérification' : 'Vérifier'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(true)}
            >
              <UserX className="h-4 w-4 mr-2" />
              {user.isSuspended ? 'Lever suspension' : 'Suspendre'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          {user.role === 'USER' && (
            <>
              <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
            </>
          )}
          {user.role === 'PRO' && (
            <TabsTrigger value="campaigns">Campagnes ({campaigns.length})</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{user.email}</div>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Téléphone</div>
                      <div className="font-medium">{user.phone}</div>
                    </div>
                  </div>
                )}

                {user.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Localisation</div>
                      <div className="font-medium">{user.location}</div>
                    </div>
                  </div>
                )}

                {user.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Date de naissance</div>
                      <div className="font-medium">
                        {new Date(user.dateOfBirth).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {user.gender && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Genre</div>
                      <div className="font-medium">{user.gender}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">ID Utilisateur</div>
                  <div className="font-mono text-sm">{user.userId}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Rôle</div>
                  <div>{getRoleBadge(user.role)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Date d'inscription</div>
                  <div className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Dernière mise à jour</div>
                  <div className="font-medium">
                    {new Date(user.updatedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {user.isSuspended && user.suspendedAt && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-900 mb-1">
                      Suspendu le {new Date(user.suspendedAt).toLocaleDateString()}
                    </div>
                    {user.suspendedReason && (
                      <div className="text-sm text-red-700">
                        Raison: {user.suspendedReason}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats (for USER role) */}
            {user.role === 'USER' && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Statistiques testeur</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {user.completedSessions || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Sessions complétées</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {user.averageRating ? user.averageRating.toFixed(1) : '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">Note moyenne</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {user.totalEarned ? `${user.totalEarned.toFixed(0)}€` : '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total gagné</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bio */}
            {user.bio && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Bio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{user.bio}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab (USER only) */}
        {user.role === 'USER' && (
          <TabsContent value="sessions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historique des sessions</CardTitle>
                <CardDescription>
                  Toutes les sessions de test de l'utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="py-16 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune session</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campagne</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date candidature</TableHead>
                        <TableHead>Date complétion</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {session.campaignId}
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
                          <TableCell>
                            {session.rating ? `⭐ ${session.rating}/5` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/sessions/${session.id}`)}
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
        )}

        {/* Wallet Tab (USER only) */}
        {user.role === 'USER' && (
          <TabsContent value="wallet" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Balance actuelle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {wallet?.balance.toFixed(2) || '0.00'}€
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total gagné</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {wallet?.totalEarned.toFixed(2) || '0.00'}€
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total retiré</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {wallet?.totalWithdrawn.toFixed(2) || '0.00'}€
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transactions récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <WalletIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune transaction</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge
                              className={
                                transaction.type === 'CREDIT'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.description}
                          </TableCell>
                          <TableCell
                            className={`font-medium ${
                              transaction.type === 'CREDIT'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'CREDIT' ? '+' : '-'}
                            {transaction.amount.toFixed(2)}€
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Campaigns Tab (PRO only) */}
        {user.role === 'PRO' && (
          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Campagnes créées</CardTitle>
                <CardDescription>
                  Toutes les campagnes créées par ce vendeur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="py-16 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune campagne</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Places</TableHead>
                        <TableHead>Date début</TableHead>
                        <TableHead>Date fin</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.title}</TableCell>
                          <TableCell>
                            <Badge>{campaign.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.filledSlots}/{campaign.totalSlots}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(campaign.startDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(campaign.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/campaigns/${campaign.id}`)}
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
        )}
      </Tabs>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau rôle</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER (Testeur)</SelectItem>
                  <SelectItem value="PRO">PRO (Vendeur)</SelectItem>
                  <SelectItem value="ADMIN">ADMIN (Administrateur)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowRoleDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button onClick={handleChangeRole} className="flex-1">
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.isSuspended ? 'Lever la suspension' : 'Suspendre utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {user.isSuspended
                ? `Réactiver le compte de ${user.email}`
                : `Suspendre temporairement le compte de ${user.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!user.isSuspended && (
              <div className="space-y-2">
                <Label>Raison de la suspension *</Label>
                <Input
                  placeholder="Ex: Comportement inapproprié"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
            )}

            {user.isSuspended && user.suspendedReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-1">Raison actuelle :</p>
                <p className="text-sm text-red-700">{user.suspendedReason}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowSuspendDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSuspend}
                className={`flex-1 ${user.isSuspended ? '' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {user.isSuspended ? 'Lever la suspension' : 'Suspendre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
