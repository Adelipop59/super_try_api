'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, Profile, UserRole, changeUserRole, verifyUser, unverifyUser, suspendUser, unsuspendUser, deleteUser } from '@/lib/api/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Search, Eye, ShieldCheck, ShieldAlert, UserX, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [suspendedFilter, setSuspendedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, verifiedFilter, activeFilter, suspendedFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers({
        role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
        isVerified: verifiedFilter !== 'all' ? verifiedFilter === 'true' : undefined,
        isActive: activeFilter !== 'all' ? activeFilter === 'true' : undefined,
        isSuspended: suspendedFilter !== 'all' ? suspendedFilter === 'true' : undefined,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });

      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;

    try {
      await changeUserRole(selectedUser.userId, { role: newRole });
      toast.success('Rôle modifié avec succès');
      loadUsers();
      setShowRoleDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification du rôle');
    }
  };

  const handleVerify = async (user: Profile) => {
    try {
      if (user.isVerified) {
        await unverifyUser(user.userId);
        toast.success('Utilisateur non vérifié');
      } else {
        await verifyUser(user.userId);
        toast.success('Utilisateur vérifié');
      }
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la modification');
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;

    try {
      if (selectedUser.isSuspended) {
        await unsuspendUser(selectedUser.userId);
        toast.success('Suspension levée');
      } else {
        if (!suspendReason.trim()) {
          toast.error('Veuillez indiquer une raison');
          return;
        }
        await suspendUser(selectedUser.userId, { reason: suspendReason });
        toast.success('Utilisateur suspendu');
      }
      loadUsers();
      setShowSuspendDialog(false);
      setSelectedUser(null);
      setSuspendReason('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suspension');
    }
  };

  const handleDelete = async (user: Profile) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.firstName || user.email} ?`)) {
      return;
    }

    try {
      await deleteUser(user.userId);
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const openRoleDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  const openSuspendDialog = (user: Profile) => {
    setSelectedUser(user);
    setSuspendReason('');
    setShowSuspendDialog(true);
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      USER: 'bg-blue-100 text-blue-800',
      PRO: 'bg-green-100 text-green-800',
      ADMIN: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={colors[role]}>{role}</Badge>;
  };

  if (loading && users.length === 0) {
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
        <h1 className="text-3xl font-bold mb-2">Gestion des utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez les comptes utilisateurs, vendeurs et administrateurs
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 space-y-2">
              <Label>Recherche</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Email, nom, prénom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verified */}
            <div className="space-y-2">
              <Label>Vérifié</Label>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Vérifié</SelectItem>
                  <SelectItem value="false">Non vérifié</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Suspended */}
            <div className="space-y-2">
              <Label>Suspension</Label>
              <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="false">Actif</SelectItem>
                  <SelectItem value="true">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-muted-foreground">
                Essayez de modifier vos filtres
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : '-'}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {user.isVerified && (
                              <Badge className="bg-green-100 text-green-800 w-fit">
                                Vérifié
                              </Badge>
                            )}
                            {user.isSuspended && (
                              <Badge className="bg-red-100 text-red-800 w-fit">
                                Suspendu
                              </Badge>
                            )}
                            {!user.isActive && (
                              <Badge className="bg-gray-100 text-gray-800 w-fit">
                                Inactif
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role === 'USER' && (
                            <div className="text-sm">
                              <div>{user.completedSessions || 0} sessions</div>
                              {user.averageRating && (
                                <div className="text-muted-foreground">
                                  ⭐ {user.averageRating.toFixed(1)}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/admin/users/${user.userId}`)}
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRoleDialog(user)}
                              title="Changer rôle"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVerify(user)}
                              title={user.isVerified ? 'Retirer vérification' : 'Vérifier'}
                            >
                              {user.isVerified ? (
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <ShieldAlert className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSuspendDialog(user)}
                              title={user.isSuspended ? 'Lever suspension' : 'Suspendre'}
                            >
                              {user.isSuspended ? (
                                <ShieldAlert className="h-4 w-4 text-red-600" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de {selectedUser?.email}
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
              {selectedUser?.isSuspended ? 'Lever la suspension' : 'Suspendre utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isSuspended
                ? `Réactiver le compte de ${selectedUser?.email}`
                : `Suspendre temporairement le compte de ${selectedUser?.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedUser?.isSuspended && (
              <div className="space-y-2">
                <Label>Raison de la suspension *</Label>
                <Input
                  placeholder="Ex: Comportement inapproprié"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
            )}

            {selectedUser?.isSuspended && selectedUser.suspendedReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-1">Raison actuelle :</p>
                <p className="text-sm text-red-700">{selectedUser.suspendedReason}</p>
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
                className={`flex-1 ${selectedUser?.isSuspended ? '' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {selectedUser?.isSuspended ? 'Lever la suspension' : 'Suspendre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
