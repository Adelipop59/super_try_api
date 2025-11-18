"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export default function ProDashboardClient({ user, profile }: { user: User; profile: Profile | null }) {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [testingSessions, setTestingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  // Product form
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDelivery, setProductDelivery] = useState("");
  const [productReward, setProductReward] = useState("");

  // Campaign form
  const [selectedProduct, setSelectedProduct] = useState("");
  const [campaignName, setCampaignName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Fetch seller's products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);

      // Fetch seller's campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*, products(*)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setCampaigns(campaignsData || []);

      // Fetch testing sessions for seller's campaigns
      const { data: sessionsData } = await supabase
        .from("testing_sessions")
        .select("*, campaigns!inner(seller_id, name, products(*))")
        .eq("campaigns.seller_id", user.id)
        .order("created_at", { ascending: false });

      setTestingSessions(sessionsData || []);
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            seller_id: user.id,
            name: productName,
            price: parseFloat(productPrice),
            delivery_cost: parseFloat(productDelivery),
            reward: parseFloat(productReward),
          },
        ])
        .select();

      if (error) throw error;

      alert("Produit créé avec succès !");
      setShowProductDialog(false);
      setProductName("");
      setProductPrice("");
      setProductDelivery("");
      setProductReward("");
      fetchData();
    } catch (error: any) {
      alert("Erreur : " + error.message);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("campaigns")
        .insert([
          {
            seller_id: user.id,
            product_id: selectedProduct,
            name: campaignName,
            status: "active",
          },
        ])
        .select();

      if (error) throw error;

      alert("Campagne créée avec succès !");
      setShowCampaignDialog(false);
      setCampaignName("");
      setSelectedProduct("");
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
            <Badge variant="default">Vendeur</Badge>
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
        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Produits</CardDescription>
              <CardTitle className="text-3xl">{products.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Campagnes Actives</CardDescription>
              <CardTitle className="text-3xl">
                {campaigns.filter((c) => c.status === "active").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tests en Cours</CardDescription>
              <CardTitle className="text-3xl">
                {testingSessions.filter((s) => s.status === "in_progress").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Mes Produits</TabsTrigger>
            <TabsTrigger value="campaigns">Mes Campagnes</TabsTrigger>
            <TabsTrigger value="sessions">Sessions de Test</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mes Produits</h2>
              <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                <DialogTrigger asChild>
                  <Button>+ Nouveau Produit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau produit</DialogTitle>
                    <DialogDescription>
                      Ajoutez les informations de votre produit
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProduct} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du produit</Label>
                      <Input
                        id="name"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Prix (€)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery">Frais de livraison (€)</Label>
                      <Input
                        id="delivery"
                        type="number"
                        step="0.01"
                        value={productDelivery}
                        onChange={(e) => setProductDelivery(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward">Récompense testeur (€)</Label>
                      <Input
                        id="reward"
                        type="number"
                        step="0.01"
                        value={productReward}
                        onChange={(e) => setProductReward(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Créer le produit
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucun produit. Créez votre premier produit !
                  </CardContent>
                </Card>
              ) : (
                products.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix:</span>
                          <span className="font-medium">{product.price} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Livraison:</span>
                          <span className="font-medium">{product.delivery_cost} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Récompense:</span>
                          <span className="font-medium text-green-600">{product.reward} €</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mes Campagnes</h2>
              <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
                <DialogTrigger asChild>
                  <Button>+ Nouvelle Campagne</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle campagne</DialogTitle>
                    <DialogDescription>
                      Créez une campagne de test pour vos produits
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCampaign} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaign-name">Nom de la campagne</Label>
                      <Input
                        id="campaign-name"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product">Produit</Label>
                      <select
                        id="product"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        required
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" className="w-full" disabled={products.length === 0}>
                      Créer la campagne
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {campaigns.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune campagne. Créez votre première campagne !
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <CardDescription>{campaign.products?.name}</CardDescription>
                        </div>
                        <Badge
                          variant={campaign.status === "active" ? "default" : "secondary"}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Prix</p>
                          <p className="font-medium">{campaign.products?.price || 0} €</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Livraison</p>
                          <p className="font-medium">{campaign.products?.delivery_cost || 0} €</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Récompense</p>
                          <p className="font-medium text-green-600">
                            {campaign.products?.reward || 0} €
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <h2 className="text-2xl font-bold">Sessions de Test</h2>
            <div className="grid gap-4">
              {testingSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune session de test pour le moment
                  </CardContent>
                </Card>
              ) : (
                testingSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{session.campaigns?.name}</CardTitle>
                          <CardDescription>
                            {session.campaigns?.products?.name}
                          </CardDescription>
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
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Testeur ID:</span>
                          <span className="font-medium font-mono text-xs">
                            {session.tester_id.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Créé le:</span>
                          <span className="font-medium">
                            {new Date(session.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
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
