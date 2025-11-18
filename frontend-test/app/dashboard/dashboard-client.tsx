"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface Profile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface User {
  id: string;
  email?: string;
}

export default function DashboardClient({ user, profile }: { user: User; profile: Profile | null }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [testingSessions, setTestingSessions] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*, products(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      setCampaigns(campaignsData || []);

      // Fetch user's testing sessions
      const { data: sessionsData } = await supabase
        .from("testing_sessions")
        .select("*, campaigns(*, products(*))")
        .eq("tester_id", user.id)
        .order("created_at", { ascending: false });

      setTestingSessions(sessionsData || []);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setWallet(walletData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleAcceptCampaign = async (campaignId: string) => {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("testing_sessions")
        .insert([
          {
            campaign_id: campaignId,
            tester_id: user.id,
            status: "pending",
          },
        ])
        .select();

      if (error) throw error;

      alert("Campagne acceptée ! Vous pouvez maintenant commencer le test.");
      fetchData();
    } catch (error: any) {
      alert("Erreur : " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🧪 Super Try</h1>
            <Badge variant="secondary">Testeur</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Connecté en tant que</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>💰 Mon Portefeuille</CardTitle>
            <CardDescription>Vos gains et récompenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {wallet?.balance ? `${wallet.balance.toFixed(2)} €` : "0.00 €"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Solde disponible</p>
              </div>
              <Button variant="default">Retirer mes gains</Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList>
            <TabsTrigger value="available">Campagnes Disponibles</TabsTrigger>
            <TabsTrigger value="my-tests">Mes Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune campagne disponible pour le moment
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{campaign.products?.name || "Produit"}</CardTitle>
                      <CardDescription>{campaign.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix produit:</span>
                          <span className="font-medium">{campaign.products?.price || 0} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Livraison:</span>
                          <span className="font-medium">{campaign.products?.delivery_cost || 0} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Récompense:</span>
                          <span className="font-medium text-green-600">
                            {campaign.products?.reward || 0} €
                          </span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Badge>{campaign.status}</Badge>
                        <Button size="sm" onClick={() => handleAcceptCampaign(campaign.id)}>
                          Accepter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-tests" className="space-y-4">
            <div className="grid gap-4">
              {testingSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Vous n'avez pas encore de tests en cours
                  </CardContent>
                </Card>
              ) : (
                testingSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {session.campaigns?.products?.name || "Produit"}
                          </CardTitle>
                          <CardDescription>{session.campaigns?.name}</CardDescription>
                        </div>
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "default"
                              : session.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Prix</p>
                          <p className="font-medium">{session.campaigns?.products?.price || 0} €</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Récompense</p>
                          <p className="font-medium text-green-600">
                            {session.campaigns?.products?.reward || 0} €
                          </p>
                        </div>
                      </div>
                      {session.status === "pending" && (
                        <Button className="w-full" variant="outline">
                          Commencer le test
                        </Button>
                      )}
                      {session.status === "in_progress" && (
                        <Button className="w-full">Continuer le test</Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
