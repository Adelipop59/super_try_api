'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCampaign, addProductsToCampaign, removeProductFromCampaign, Campaign } from '@/lib/api/campaigns';
import { getMyProducts, Product } from '@/lib/api/products';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface OfferFormData {
  productId: string;
  expectedPrice: string;
  shippingCost: string;
  priceRangeMin: string;
  priceRangeMax: string;
  reimbursedPrice: string;
  reimbursedShipping: string;
  bonus: string;
  quantity: string;
}

export default function CampaignProductsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [offerForm, setOfferForm] = useState<OfferFormData>({
    productId: '',
    expectedPrice: '',
    shippingCost: '',
    priceRangeMin: '',
    priceRangeMax: '',
    reimbursedPrice: '',
    reimbursedShipping: '',
    bonus: '0',
    quantity: '1',
  });

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const [campaignData, productsData] = await Promise.all([
        getCampaign(campaignId),
        getMyProducts(),
      ]);

      setCampaign(campaignData);
      setProducts(productsData.filter(p => p.isActive));

      // Pre-fill first product if available
      if (campaignData && productsData.length > 0 && !campaignData.offers?.length) {
        const firstProduct = productsData[0];
        setOfferForm(prev => ({
          ...prev,
          productId: firstProduct.id,
          expectedPrice: firstProduct.price.toString(),
          shippingCost: firstProduct.shippingCost.toString(),
          reimbursedPrice: firstProduct.price.toString(),
          reimbursedShipping: firstProduct.shippingCost.toString(),
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    const offer = {
      productId: offerForm.productId,
      expectedPrice: parseFloat(offerForm.expectedPrice),
      shippingCost: parseFloat(offerForm.shippingCost),
      priceRangeMin: parseFloat(offerForm.priceRangeMin) || undefined,
      priceRangeMax: parseFloat(offerForm.priceRangeMax) || undefined,
      reimbursedPrice: parseFloat(offerForm.reimbursedPrice),
      reimbursedShipping: parseFloat(offerForm.reimbursedShipping),
      bonus: parseFloat(offerForm.bonus),
      quantity: parseInt(offerForm.quantity),
    };

    setSubmitting(true);
    try {
      await addProductsToCampaign(campaignId, { offers: [offer] });
      toast.success('Produit ajouté !');
      loadData();

      // Reset form
      setOfferForm({
        productId: '',
        expectedPrice: '',
        shippingCost: '',
        priceRangeMin: '',
        priceRangeMax: '',
        reimbursedPrice: '',
        reimbursedShipping: '',
        bonus: '0',
        quantity: '1',
      });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveOffer = async (productId: string) => {
    if (!confirm('Retirer ce produit de la campagne ?')) {
      return;
    }

    try {
      await removeProductFromCampaign(campaignId, productId);
      toast.success('Produit retiré');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleContinue = () => {
    if (!campaign?.offers || campaign.offers.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }
    router.push(`/pro/campaigns/${campaignId}/criteria`);
  };

  if (loading || !campaign) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const selectedProduct = products.find(p => p.id === offerForm.productId);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 5 && <div className={`w-12 h-0.5 ${step < 2 ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Étape 2 : Ajouter des produits</h2>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les produits à tester et définissez les conditions financières
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add product form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un produit</CardTitle>
              <CardDescription>
                Campagne: {campaign.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddOffer} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produit *</Label>
                  <Select
                    value={offerForm.productId}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      if (product) {
                        setOfferForm(prev => ({
                          ...prev,
                          productId: value,
                          expectedPrice: product.price.toString(),
                          shippingCost: product.shippingCost.toString(),
                          reimbursedPrice: product.price.toString(),
                          reimbursedShipping: product.shippingCost.toString(),
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {product.price}€
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prix attendu (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.expectedPrice}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, expectedPrice: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Coût livraison (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.shippingCost}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prix min acceptable (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.priceRangeMin}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, priceRangeMin: e.target.value }))}
                          placeholder="Optionnel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix max acceptable (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.priceRangeMax}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, priceRangeMax: e.target.value }))}
                          placeholder="Optionnel"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Remboursement produit (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.reimbursedPrice}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, reimbursedPrice: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Remboursement livraison (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.reimbursedShipping}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, reimbursedShipping: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bonus testeur (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={offerForm.bonus}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, bonus: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantité *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={offerForm.quantity}
                          onChange={(e) => setOfferForm(prev => ({ ...prev, quantity: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      {submitting ? 'Ajout...' : 'Ajouter le produit'}
                    </Button>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Products list */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produits ajoutés</CardTitle>
            </CardHeader>
            <CardContent>
              {!campaign.offers || campaign.offers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun produit ajouté
                </p>
              ) : (
                <div className="space-y-3">
                  {campaign.offers.map((offer: any) => (
                    <div key={offer.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">{offer.product?.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveOffer(offer.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Prix: {offer.expectedPrice}€</div>
                        <div>Remb.: {offer.reimbursedPrice}€</div>
                        <Badge className="text-xs">Bonus: +{offer.bonus}€</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/pro/campaigns')}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Sauvegarder et quitter
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!campaign.offers || campaign.offers.length === 0}
          className="flex-1"
        >
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
