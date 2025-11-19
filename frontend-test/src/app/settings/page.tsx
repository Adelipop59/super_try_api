'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, updateCurrentUser, Profile } from '@/lib/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Mail, Lock, Eye, Globe, Save, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type NotificationPreference = 'ALL' | 'IMPORTANT_ONLY' | 'NONE';
type EmailFrequency = 'INSTANT' | 'DAILY' | 'WEEKLY' | 'NEVER';
type Language = 'fr' | 'en';

export default function SettingsPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>('ALL');
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>('INSTANT');

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [allowMessagesFromAnyone, setAllowMessagesFromAnyone] = useState(true);

  // Language & regional settings
  const [language, setLanguage] = useState<Language>('fr');
  const [timezone, setTimezone] = useState('Europe/Paris');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profileData = await getCurrentUser();
      setProfile(profileData);

      // In a real app, these would come from the user's settings
      // For now, we use default values
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      // In a real app, this would update notification settings via API
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Préférences de notification enregistrées');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      // In a real app, this would update privacy settings via API
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Paramètres de confidentialité enregistrés');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      // In a real app, this would update preferences via API
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Préférences enregistrées');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.'
      )
    ) {
      toast.error('Suppression de compte non implémentée dans cette démo');
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences et paramètres de compte
        </p>
      </div>

      <div className="max-w-5xl">
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Eye className="h-4 w-4 mr-2" />
              Confidentialité
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Globe className="h-4 w-4 mr-2" />
              Préférences
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Canaux de notification</CardTitle>
                <CardDescription>
                  Choisissez comment vous souhaitez recevoir les notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="email-notif" className="text-base font-medium cursor-pointer">
                      Notifications par email
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recevez des emails pour les événements importants
                    </p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="push-notif" className="text-base font-medium cursor-pointer">
                      Notifications push
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Notifications dans l'application
                    </p>
                  </div>
                  <Switch
                    id="push-notif"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="sms-notif" className="text-base font-medium cursor-pointer">
                      Notifications SMS
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      SMS pour les événements urgents uniquement
                    </p>
                  </div>
                  <Switch
                    id="sms-notif"
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Préférences de notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notif-pref">Type de notifications</Label>
                  <Select value={notificationPreference} onValueChange={(value: any) => setNotificationPreference(value)}>
                    <SelectTrigger id="notif-pref">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Toutes les notifications</SelectItem>
                      <SelectItem value="IMPORTANT_ONLY">Notifications importantes uniquement</SelectItem>
                      <SelectItem value="NONE">Aucune notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-freq">Fréquence des emails</Label>
                  <Select value={emailFrequency} onValueChange={(value: any) => setEmailFrequency(value)}>
                    <SelectTrigger id="email-freq">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTANT">Instantané</SelectItem>
                      <SelectItem value="DAILY">Résumé quotidien</SelectItem>
                      <SelectItem value="WEEKLY">Résumé hebdomadaire</SelectItem>
                      <SelectItem value="NEVER">Jamais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveNotifications} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visibilité du profil</CardTitle>
                <CardDescription>
                  Contrôlez qui peut voir votre profil et vos informations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Profil visible par</Label>
                  <Select value={profileVisibility} onValueChange={(value: any) => setProfileVisibility(value)}>
                    <SelectTrigger id="profile-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public (tous les utilisateurs)</SelectItem>
                      <SelectItem value="PRIVATE">Privé (vendeurs avec qui je travaille uniquement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="show-email" className="text-base font-medium cursor-pointer">
                      Afficher mon email
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Votre email sera visible sur votre profil public
                    </p>
                  </div>
                  <Switch
                    id="show-email"
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="show-phone" className="text-base font-medium cursor-pointer">
                      Afficher mon téléphone
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Votre téléphone sera visible sur votre profil public
                    </p>
                  </div>
                  <Switch
                    id="show-phone"
                    checked={showPhone}
                    onCheckedChange={setShowPhone}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="allow-messages" className="text-base font-medium cursor-pointer">
                      Autoriser les messages de tous
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Si désactivé, seuls les vendeurs avec qui vous travaillez peuvent vous contacter
                    </p>
                  </div>
                  <Switch
                    id="allow-messages"
                    checked={allowMessagesFromAnyone}
                    onCheckedChange={setAllowMessagesFromAnyone}
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSavePrivacy} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Langue et région</CardTitle>
                <CardDescription>
                  Personnalisez votre expérience utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Langue</Label>
                  <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (UTC-8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSavePreferences} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </Button>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
                <CardDescription>
                  Gérez votre mot de passe et la sécurité de votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  L'authentification est gérée par Supabase. Pour modifier votre mot de passe, utilisez la fonction de réinitialisation de mot de passe.
                </p>
                <Button variant="outline" onClick={() => toast.info('Fonctionnalité de réinitialisation de mot de passe à implémenter')}>
                  <Lock className="h-4 w-4 mr-2" />
                  Réinitialiser le mot de passe
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentification à deux facteurs</CardTitle>
                <CardDescription>
                  Ajoutez une couche de sécurité supplémentaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  L'authentification à deux facteurs (2FA) protège votre compte contre les accès non autorisés.
                </p>
                <Button variant="outline" onClick={() => toast.info('Fonctionnalité 2FA à implémenter')}>
                  Activer 2FA
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Zone de danger
                </CardTitle>
                <CardDescription>
                  Actions irréversibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-1">Supprimer mon compte</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Une fois votre compte supprimé, toutes vos données seront définitivement effacées.
                    Cette action est irréversible.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer mon compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
