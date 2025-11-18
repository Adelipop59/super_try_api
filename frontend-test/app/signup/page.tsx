"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("user");

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "pro") {
      setActiveTab("pro");
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent, role: 'user' | 'pro') => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: role,
            },
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        setSuccess(true);
        setTimeout(() => {
          if (role === 'pro') {
            router.push('/pro-dashboard');
          } else {
            router.push('/dashboard');
          }
          router.refresh();
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-bold">🧪 Super Try</h1>
          </div>
          <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
          <CardDescription className="text-center">
            Choisissez votre type de compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user">🧑‍🔬 Testeur</TabsTrigger>
              <TabsTrigger value="pro">👨‍💼 Vendeur</TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <form onSubmit={(e) => handleSignup(e, 'user')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-user">Email</Label>
                  <Input
                    id="email-user"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-user">Mot de passe</Label>
                  <Input
                    id="password-user"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password-user">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password-user"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                    Compte créé avec succès ! Redirection...
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire comme Testeur"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="pro">
              <form onSubmit={(e) => handleSignup(e, 'pro')} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-pro">Email</Label>
                  <Input
                    id="email-pro"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-pro">Mot de passe</Label>
                  <Input
                    id="password-pro"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password-pro">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password-pro"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                    Compte créé avec succès ! Redirection...
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire comme Vendeur"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              ← Retour à l'accueil
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SignupForm />
    </Suspense>
  );
}
