'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SignupPage() {
  const { signup } = useAuth();
  const [role, setRole] = useState<'USER' | 'PRO'>('USER');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    siret: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        role,
      };

      if (formData.firstName) signupData.firstName = formData.firstName;
      if (formData.lastName) signupData.lastName = formData.lastName;
      if (formData.phone) signupData.phone = formData.phone;

      if (role === 'PRO') {
        if (formData.companyName) signupData.companyName = formData.companyName;
        if (formData.siret) signupData.siret = formData.siret;
      }

      await signup(signupData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Créer un compte</CardTitle>
          <CardDescription className="text-center">
            Rejoignez Super Try API en tant que testeur ou vendeur
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Tabs value={role} onValueChange={(value) => setRole(value as 'USER' | 'PRO')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="USER">Testeur</TabsTrigger>
                <TabsTrigger value="PRO">Vendeur</TabsTrigger>
              </TabsList>

              <TabsContent value="USER" className="space-y-4 mt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-300">Mode Testeur</p>
                  <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">
                    Testez des produits gratuitement et gagnez des récompenses
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="PRO" className="space-y-4 mt-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium text-purple-900 dark:text-purple-300">Mode Vendeur</p>
                  <p className="text-purple-700 dark:text-purple-400 text-xs mt-1">
                    Créez des campagnes et recrutez des testeurs pour vos produits
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom (optionnel)</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom (optionnel)</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="exemple@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {role === 'PRO' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Ma Société SAS"
                    value={formData.companyName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET (optionnel)</Label>
                  <Input
                    id="siret"
                    name="siret"
                    type="text"
                    placeholder="123 456 789 00012"
                    value={formData.siret}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Minimum 6 caractères</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Se connecter
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Retour à l'accueil
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
