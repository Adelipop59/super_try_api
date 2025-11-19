'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, updateCurrentUser, Profile } from '@/lib/api/users';
import { getMyCampaigns, Campaign } from '@/lib/api/campaigns';
import { getSessions, Session } from '@/lib/api/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Phone, MapPin, Briefcase, BarChart3, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, campaignsData, sessionsData] = await Promise.all([
        getCurrentUser(),
        getMyCampaigns(),
        getSessions(),
      ]);

      setProfile(profileData);
      setCampaigns(campaignsData);
      setSessions(sessionsData.filter(s => campaignsData.some(c => c.id === s.campaignId)));

      // Populate form
      setFirstName(profileData.firstName || '');
      setLastName(profileData.lastName || '');
      setPhone(profileData.phone || '');
      setLocation(profileData.location || '');
      setBio(profileData.bio || '');
      setAvatarUrl(profileData.avatarUrl || '');
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      await updateCurrentUser({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      toast.success('Profil mis à jour avec succès');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
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

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Profil introuvable</h2>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
  const averageRating =
    sessions.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
      (sessions.filter(s => s.rating).length || 1);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mon profil vendeur</h1>
        <p className="text-muted-foreground">
          Gérez vos informations professionnelles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full mb-4 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <User className="h-12 w-12 text-white" />
                  </div>
                )}
                <h3 className="font-semibold text-lg">
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : 'Vendeur PRO'}
                </h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Campagnes totales</span>
                  <span className="font-semibold">{campaigns.length}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Campagnes actives</span>
                  <span className="font-semibold text-green-600">{activeCampaigns}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Sessions totales</span>
                  <span className="font-semibold">{sessions.length}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Sessions complétées</span>
                  <span className="font-semibold text-blue-600">{completedSessions}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Note moyenne</span>
                  <span className="font-semibold">
                    {sessions.filter(s => s.rating).length > 0
                      ? `⭐ ${averageRating.toFixed(1)}/5`
                      : 'Pas encore de notes'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-2" />
                Informations personnelles
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="h-4 w-4 mr-2" />
                Performances
              </TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Modifier mes informations</CardTitle>
                  <CardDescription>
                    Ces informations seront visibles par les testeurs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    {/* Avatar URL */}
                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl">URL de l'avatar</Label>
                      <Input
                        id="avatarUrl"
                        type="url"
                        placeholder="https://..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          placeholder="Jean"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          placeholder="Dupont"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Email (readonly) */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        L'email ne peut pas être modifié
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        placeholder="Paris, France"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio / Description</Label>
                      <Textarea
                        id="bio"
                        placeholder="Présentez votre activité et vos produits..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Submit */}
                    <Button type="submit" disabled={saving} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="mt-6">
              <div className="space-y-6">
                {/* Campaigns stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques campagnes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-blue-600">{campaigns.length}</div>
                        <p className="text-sm text-muted-foreground">Campagnes créées</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-600">{activeCampaigns}</div>
                        <p className="text-sm text-muted-foreground">Campagnes actives</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-purple-600">
                          {campaigns.filter(c => c.status === 'COMPLETED').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Campagnes terminées</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-gray-600">
                          {campaigns.filter(c => c.status === 'DRAFT').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Brouillons</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sessions stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-blue-600">{sessions.length}</div>
                        <p className="text-sm text-muted-foreground">Sessions totales</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-600">
                          {completedSessions}
                        </div>
                        <p className="text-sm text-muted-foreground">Sessions complétées</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-yellow-600">
                          {sessions.filter(s => s.status === 'PENDING').length}
                        </div>
                        <p className="text-sm text-muted-foreground">En attente</p>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-orange-600">
                          {sessions.filter(s => ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'].includes(s.status)).length}
                        </div>
                        <p className="text-sm text-muted-foreground">En cours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rating stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Évaluations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Note moyenne</span>
                        <span className="text-2xl font-bold">
                          {sessions.filter(s => s.rating).length > 0
                            ? `⭐ ${averageRating.toFixed(1)}/5`
                            : 'Pas encore de notes'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sessions notées</span>
                        <span className="font-semibold">
                          {sessions.filter(s => s.rating).length}
                        </span>
                      </div>
                      {sessions.filter(s => s.rating).length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Distribution des notes</p>
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = sessions.filter(s => s.rating === star).length;
                            const percentage = (count / sessions.filter(s => s.rating).length) * 100;

                            return (
                              <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-sm w-12">{star} ⭐</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground w-12 text-right">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
