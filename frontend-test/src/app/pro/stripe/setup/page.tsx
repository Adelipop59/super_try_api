'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStripeConfig,
  createConnectedAccount,
  createAccountOnboardingLink,
  getConnectedAccount,
  ConnectedAccount,
} from '@/lib/api/stripe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertCircle, CreditCard, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

export default function StripeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [account, setAccount] = useState<ConnectedAccount | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState<'individual' | 'company'>('individual');

  useEffect(() => {
    loadData();
  }, []);

  // Check if returning from Stripe onboarding
  useEffect(() => {
    const accountId = searchParams.get('account_id');
    if (accountId) {
      checkAccountStatus(accountId);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      // Load Stripe config
      const config = await getStripeConfig();
      setTestMode(config.testMode);

      // Set default email
      if (user?.email) {
        setEmail(user.email);
      }

      // TODO: Check if user already has a Stripe account ID in database
      // const profile = await getCurrentUser();
      // if (profile.stripeAccountId) {
      //   const accountData = await getConnectedAccount(profile.stripeAccountId);
      //   setAccount(accountData);
      // }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const checkAccountStatus = async (accountId: string) => {
    try {
      const accountData = await getConnectedAccount(accountId);
      setAccount(accountData);

      if (accountData.chargesEnabled && accountData.payoutsEnabled) {
        toast.success('Votre compte Stripe est maintenant configuré !');
      } else if (accountData.detailsSubmitted) {
        toast.info('Compte Stripe en cours de vérification...');
      }
    } catch (error) {
      console.error('Failed to check account status:', error);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setCreating(true);
    try {
      // Create Stripe Connected Account
      const accountData = await createConnectedAccount({
        email: email.trim(),
        businessType,
      });

      toast.success('Compte Stripe créé !');
      setAccount(accountData);

      // TODO: Save account ID to database
      // await updateCurrentUser({ stripeAccountId: accountData.accountId });

      // Create onboarding link
      await handleStartOnboarding(accountData.accountId);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du compte');
    } finally {
      setCreating(false);
    }
  };

  const handleStartOnboarding = async (accountId?: string) => {
    const id = accountId || account?.accountId;
    if (!id) {
      toast.error('Aucun compte Stripe trouvé');
      return;
    }

    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/pro/stripe/setup?account_id=${id}`;
      const refreshUrl = `${baseUrl}/pro/stripe/setup`;

      const link = await createAccountOnboardingLink(id, returnUrl, refreshUrl);

      // Redirect to Stripe onboarding
      window.location.href = link.url;
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du lien d\'onboarding');
    }
  };

  const getStatusBadge = () => {
    if (!account) return null;

    if (account.chargesEnabled && account.payoutsEnabled) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-4 w-4 mr-1" />
          Compte actif
        </Badge>
      );
    }

    if (account.detailsSubmitted) {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <AlertCircle className="h-4 w-4 mr-1" />
          En cours de vérification
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <AlertCircle className="h-4 w-4 mr-1" />
        Configuration incomplète
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
        <Button
          variant="ghost"
          onClick={() => router.push('/pro/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configuration Stripe</h1>
            <p className="text-muted-foreground">
              Configurez votre compte Stripe pour recevoir des paiements
            </p>
          </div>
          {testMode && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Mode Test
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {!account ? (
            // Create account form
            <Card>
              <CardHeader>
                <CardTitle>Créer un compte Stripe</CardTitle>
                <CardDescription>
                  Créez un compte Stripe Connect pour recevoir des paiements de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      L'email associé à votre compte Stripe
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">Type de compte *</Label>
                    <Select value={businessType} onValueChange={(value: any) => setBusinessType(value)}>
                      <SelectTrigger id="businessType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Particulier
                          </div>
                        </SelectItem>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Entreprise
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">À propos de Stripe Connect</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Recevez des paiements en toute sécurité</li>
                      <li>• Vos données bancaires sont protégées</li>
                      <li>• Configurez votre compte en quelques minutes</li>
                      <li>• Conforme aux réglementations européennes</li>
                    </ul>
                  </div>

                  <Button type="submit" disabled={creating} className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {creating ? 'Création en cours...' : 'Créer mon compte Stripe'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            // Account status and actions
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Statut du compte Stripe</CardTitle>
                    <CardDescription>ID: {account.accountId}</CardDescription>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Détails soumis</span>
                      {account.detailsSubmitted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.detailsSubmitted
                        ? 'Informations complètes'
                        : 'Informations manquantes'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Paiements</span>
                      {account.chargesEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.chargesEnabled ? 'Activés' : 'Désactivés'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Retraits</span>
                      {account.payoutsEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.payoutsEnabled ? 'Activés' : 'Désactivés'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Statut global</span>
                      {account.chargesEnabled && account.payoutsEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.chargesEnabled && account.payoutsEnabled
                        ? 'Opérationnel'
                        : 'Configuration requise'}
                    </p>
                  </div>
                </div>

                {!account.detailsSubmitted && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-orange-900 mb-1">
                          Configuration incomplète
                        </h4>
                        <p className="text-sm text-orange-800 mb-3">
                          Vous devez compléter la configuration de votre compte Stripe pour
                          pouvoir recevoir des paiements.
                        </p>
                        <Button
                          onClick={() => handleStartOnboarding()}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Continuer la configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {account.chargesEnabled && account.payoutsEnabled && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-green-900 mb-1">
                          Compte actif !
                        </h4>
                        <p className="text-sm text-green-800">
                          Votre compte Stripe est configuré et vous pouvez maintenant recevoir
                          des paiements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comment ça marche ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Créez votre compte</p>
                  <p className="text-xs text-muted-foreground">
                    Renseignez vos informations de base
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Finalisez sur Stripe</p>
                  <p className="text-xs text-muted-foreground">
                    Complétez vos informations bancaires
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Recevez des paiements</p>
                  <p className="text-xs text-muted-foreground">
                    Votre compte est prêt à recevoir des fonds
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Vos données bancaires sont cryptées et sécurisées par Stripe
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Conforme aux normes PCI-DSS
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Utilisé par des millions d'entreprises dans le monde
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
