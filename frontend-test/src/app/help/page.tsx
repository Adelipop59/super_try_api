'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  Search,
  User,
  Briefcase,
  Shield,
  ChevronRight,
  Mail,
  MessageCircle,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'user' | 'pro' | 'general';
}

const FAQ_ITEMS: FAQItem[] = [
  // General
  {
    category: 'general',
    question: 'Comment fonctionne Super Try API ?',
    answer: 'Super Try API est une plateforme qui met en relation des vendeurs et des testeurs. Les vendeurs créent des campagnes de test pour leurs produits, et les testeurs candidatent pour tester ces produits en échange d\'un remboursement et d\'une récompense.',
  },
  {
    category: 'general',
    question: 'Comment créer un compte ?',
    answer: 'Cliquez sur "S\'inscrire" en haut à droite de la page. Choisissez votre rôle (Testeur ou Vendeur), puis remplissez le formulaire d\'inscription. Vous recevrez un email de confirmation pour activer votre compte.',
  },
  {
    category: 'general',
    question: 'Comment puis-je contacter le support ?',
    answer: 'Vous pouvez nous contacter par email à support@supertry.com ou via le formulaire de contact en bas de cette page. Nous répondons généralement sous 24-48 heures.',
  },

  // User (Testeur)
  {
    category: 'user',
    question: 'Comment candidater à une campagne ?',
    answer: 'Parcourez les campagnes disponibles sur la page "Campagnes". Cliquez sur une campagne qui vous intéresse, puis sur "Candidater". Remplissez le formulaire avec un message de motivation.',
  },
  {
    category: 'user',
    question: 'Comment se passe le remboursement ?',
    answer: 'Une fois votre session acceptée, achetez le produit et téléchargez la preuve d\'achat. Le vendeur validera votre achat et vous serez remboursé du prix du produit plus les frais de livraison (selon l\'offre).',
  },
  {
    category: 'user',
    question: 'Quand vais-je recevoir ma récompense ?',
    answer: 'Votre récompense sera créditée sur votre wallet une fois que le vendeur aura validé votre test complet. Vous pourrez ensuite retirer vos gains via virement bancaire ou carte cadeau.',
  },
  {
    category: 'user',
    question: 'Comment retirer mes gains ?',
    answer: 'Rendez-vous dans la section "Wallet", puis "Demander un retrait". Choisissez votre méthode (virement ou carte cadeau), saisissez le montant et les détails de paiement. Les retraits sont traités sous 3-5 jours ouvrés.',
  },
  {
    category: 'user',
    question: 'Qu\'est-ce qu\'une tâche bonus ?',
    answer: 'Les tâches bonus sont des missions supplémentaires proposées par le vendeur (photo d\'unboxing, vidéo, avis externe, etc.) en échange d\'une récompense additionnelle.',
  },

  // Pro (Vendeur)
  {
    category: 'pro',
    question: 'Comment créer une campagne ?',
    answer: 'Allez dans "Mes campagnes" > "Nouvelle campagne". Suivez le wizard en 5 étapes : informations générales, ajout de produits, critères de sélection, distributions, et procédures de test.',
  },
  {
    category: 'pro',
    question: 'Comment gérer les candidatures ?',
    answer: 'Consultez vos sessions dans "Mes sessions". Vous pouvez accepter ou refuser les candidatures. Une fois acceptée, le testeur pourra acheter le produit et commencer le test.',
  },
  {
    category: 'pro',
    question: 'Comment valider un test ?',
    answer: 'Dans le détail de la session, vérifiez que le testeur a complété toutes les étapes requises. Vous pouvez ensuite noter le testeur (1-5 étoiles) et valider le test. La récompense sera automatiquement créditée.',
  },
  {
    category: 'pro',
    question: 'Combien coûte le service ?',
    answer: 'La création de compte et de campagnes est gratuite. Vous payez uniquement les remboursements produits et les récompenses que vous proposez aux testeurs.',
  },
  {
    category: 'pro',
    question: 'Puis-je modifier une campagne active ?',
    answer: 'Les campagnes actives ne peuvent pas être modifiées. Vous pouvez terminer la campagne actuelle et en créer une nouvelle avec les modifications souhaitées.',
  },
];

export default function HelpPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filterFAQ = (category: 'user' | 'pro' | 'general') => {
    return FAQ_ITEMS.filter(
      (item) =>
        item.category === category &&
        (searchQuery === '' ||
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const defaultTab = user?.role === 'PRO' ? 'pro' : user?.role === 'USER' ? 'user' : 'general';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Centre d'aide</h1>
        <p className="text-muted-foreground">
          Trouvez des réponses à vos questions
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les questions fréquentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <HelpCircle className="h-4 w-4 mr-2" />
            Général
          </TabsTrigger>
          <TabsTrigger value="user">
            <User className="h-4 w-4 mr-2" />
            Testeurs
          </TabsTrigger>
          <TabsTrigger value="pro">
            <Briefcase className="h-4 w-4 mr-2" />
            Vendeurs
          </TabsTrigger>
        </TabsList>

        {/* General FAQ */}
        <TabsContent value="general" className="mt-6 space-y-4">
          {filterFAQ('general').map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* User FAQ */}
        <TabsContent value="user" className="mt-6 space-y-4">
          {filterFAQ('user').map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Pro FAQ */}
        <TabsContent value="pro" className="mt-6 space-y-4">
          {filterFAQ('pro').map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <ChevronRight className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Contact section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Besoin d'aide supplémentaire ?
          </CardTitle>
          <CardDescription>
            Notre équipe est là pour vous aider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">Email</div>
              <a
                href="mailto:support@supertry.com"
                className="text-sm text-blue-600 hover:underline"
              >
                support@supertry.com
              </a>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Nous répondons généralement sous <strong>24-48 heures</strong>. Pour une
              réponse plus rapide, consultez d'abord notre FAQ ci-dessus.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
