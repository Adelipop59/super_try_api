import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Header / Navigation */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">🧪 Super Try</h1>
          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          Plateforme de Tests Produits
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Testez des produits,
          <br />
          <span className="text-primary">Gagnez des récompenses</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          La plateforme qui met en relation vendeurs et testeurs.
          Créez des campagnes de tests rémunérées ou devenez testeur et gagnez de l'argent.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">Devenir Testeur</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup?type=pro">Espace Vendeur</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Testeur Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">🧑‍🔬</span>
                Pour les Testeurs
              </CardTitle>
              <CardDescription>
                Testez des produits et gagnez de l'argent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Acceptez des tests de produits</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Remboursement du produit + livraison</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Récompenses financières en bonus</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Retraits par virement ou carte cadeau</p>
              </div>
            </CardContent>
          </Card>

          {/* Vendeur Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">👨‍💼</span>
                Pour les Vendeurs
              </CardTitle>
              <CardDescription>
                Créez des campagnes de tests produits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Création de produits et campagnes</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Définition des procédures de test</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Distribution automatique des tests</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p className="text-sm">Notation et évaluation des testeurs</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-3xl">Prêt à commencer ?</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Rejoignez notre plateforme dès aujourd'hui
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">Créer un compte</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Super Try. Plateforme de tests produits.</p>
        </div>
      </footer>
    </div>
  );
}
