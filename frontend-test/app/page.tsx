import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import HeroSection from "@/components/hero-section";

export default function Home() {
  return (
    <>
      {/* Hero Section with animated header */}
      <HeroSection />

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 bg-background">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Testeur Card */}
          <Card id="testeurs" className="border-2 hover:shadow-lg transition-shadow">
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
          <Card id="vendeurs" className="border-2 hover:shadow-lg transition-shadow">
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
      <section className="container mx-auto px-4 py-16 text-center bg-background">
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
      <footer id="about" className="border-t mt-16 bg-background">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Super Try. Plateforme de tests produits.</p>
        </div>
      </footer>
    </>
  );
}
